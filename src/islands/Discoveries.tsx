import { useEffect, useState } from 'preact/hooks';
import { useProgress } from './useProgress';
import VideoEmbed from './VideoEmbed';
import { parseVideoUrl } from '../lib/video';
import './tracker.css';
import './discoveries.css';

/**
 * What's New creator feed (native Preact version of the handoff's ui/discoveries.mjs).
 * Reads /.netlify/functions/nb-feed. Spoiler-safe by default: without reveal=1 the server sends no titles, creators or
 * links. reveal=1 is only sent after the visitor's own choice: the button here, or "Show all spoilers" saved in their
 * settings. Discoveries are sources awaiting review: they never touch saved progress or totals.
 */
interface Item {
  id: string; category: string; status: string; discoveredAt: string;
  title?: string; creator?: string; publishedAt?: string; url?: string; channelUrl?: string; embeddable?: boolean;
}
interface Feed { lastAttempt: string | null; lastSuccessfulCheck: string | null; lastPublication: string | null; paused: boolean; items: Item[] }
interface Props {
  sections: { id: string; label: string }[];
  guidesHref: string;
  /** One guide section only; omit for all discoveries (What's New). */
  category?: string;
  heading: string;
  /** Short game name for the copy, e.g. "GTA VI". */
  gameName: string;
  /** Inside guides: render only when this section has new videos (nothing while loading, off, unavailable or empty). */
  hideWhenOff?: boolean;
  endpoint?: string;
}
type Load = { state: 'loading' } | { state: 'off' } | { state: 'error' } | { state: 'ok'; feed: Feed };

const YT = /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/;
const CH = /^https:\/\/www\.youtube\.com\/channel\/UC[\w-]{22}$/;
const when = (v: string | null) => (v ? new Date(v).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'not yet');
const day = (v: string) => new Date(v).toLocaleDateString(undefined, { dateStyle: 'medium' });

export default function Discoveries({ sections, guidesHref, category, heading, gameName, hideWhenOff = false, endpoint = '/.netlify/functions/nb-feed' }: Props) {
  const { progress, ready } = useProgress();
  const [chosen, setChosen] = useState<boolean | null>(null);
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  // The visitor's own choice on this panel wins; otherwise follow a saved "show all spoilers" setting.
  const reveal = chosen ?? progress.prefs.spoilerMode === 'all';

  useEffect(() => {
    if (!ready) return;
    const ctl = new AbortController();
    const url = new URL(endpoint, location.href);
    if (category) url.searchParams.set('category', category);
    if (reveal) url.searchParams.set('reveal', '1');
    setLoad({ state: 'loading' });
    fetch(url, { signal: ctl.signal, credentials: 'same-origin' })
      .then(async (r) => {
        if (r.status === 404) return setLoad({ state: 'off' });
        if (!r.ok) throw new Error(String(r.status));
        const feed = (await r.json()) as Feed;
        if (!Array.isArray(feed?.items)) throw new Error('bad feed');
        setLoad({ state: 'ok', feed });
      })
      .catch(() => { if (!ctl.signal.aborted) setLoad({ state: 'error' }); });
    return () => ctl.abort();
  }, [ready, reveal, category, endpoint]);

  if (hideWhenOff && (load.state !== 'ok' || load.feed.items.length === 0)) return null;
  const label = (id: string) => sections.find((s) => s.id === id)?.label;
  const feed = load.state === 'ok' ? load.feed : null;
  const stale = feed?.lastAttempt && (!feed.lastSuccessfulCheck || feed.lastAttempt > feed.lastSuccessfulCheck);

  return (
    <section class="disc" aria-labelledby="disc-h">
      <div class="disc-head">
        <h2 id="disc-h">{heading}</h2>
        {load.state === 'ok' && (
          <button type="button" class="btn btn-quiet" aria-pressed={reveal} onClick={() => setChosen(!reveal)}>
            {reveal ? 'Hide video titles' : 'Show video titles and links (may contain spoilers)'}
          </button>
        )}
      </div>
      <p class="small muted">
        New {gameName} videos from approved creators, found by our daily check. They're sources waiting for community review,
        not confirmed guide facts, and they never count toward your progress.
      </p>
      <p class="disc-status small" role="status">
        {load.state === 'loading' && 'Loading new sources…'}
        {load.state === 'off' && "Daily source checks haven't started yet. New creator videos will show up here after the first check."}
        {load.state === 'error' && 'New sources are unavailable right now. The rest of the guide still works.'}
        {feed && <>
          Last successful check: {when(feed.lastSuccessfulCheck)} · Last change: {when(feed.lastPublication)}.
          {stale ? ' The latest check is still running or didn’t finish.' : ''}
          {feed.paused ? ' Daily checks are paused.' : ''}
          {feed.items.length === 0 ? ' Nothing new yet.' : ''}
        </>}
      </p>
      {feed && feed.items.length > 0 && (
        <ul class="disc-list">
          {feed.items.map((it) => {
            const sec = label(it.category);
            const shown = reveal && it.url && YT.test(it.url) && it.title;
            return (
              <li key={it.id}>
                {shown ? (
                  <>
                    <p class="disc-title">
                      <a href={it.url} target="_blank" rel="noopener noreferrer">{it.title}<span class="sr-only"> (YouTube, opens in a new tab)</span></a>
                      {it.creator && <span class="muted"> · by {it.channelUrl && CH.test(it.channelUrl)
                        ? <a href={it.channelUrl} target="_blank" rel="noopener noreferrer">{it.creator}<span class="sr-only"> (YouTube channel, opens in a new tab)</span></a>
                        : it.creator} on YouTube</span>}
                    </p>
                    {it.embeddable && parseVideoUrl(it.url!) && (
                      <VideoEmbed start={null} label={it.title} video={{ url: it.url!, title: it.title!, creator: it.creator ?? 'YouTube creator',
                        channelUrl: it.channelUrl && CH.test(it.channelUrl) ? it.channelUrl : it.url!, parsed: parseVideoUrl(it.url!)!, unreviewed: false, availability: 'available' }} />
                    )}
                  </>
                ) : (
                  <p class="disc-title">YouTube video <span class="muted">· title hidden (spoiler-safe)</span></p>
                )}
                <p class="disc-meta small">
                  <span class="tag v-warn">{it.status}</span>
                  {!category && (sec ? <a href={`${guidesHref}${it.category}/`}>{sec}</a> : <span class="muted">General</span>)}
                  <span class="muted">Found {day(it.discoveredAt)}{shown && it.publishedAt ? ` · posted ${day(it.publishedAt)}` : ''}</span>
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
