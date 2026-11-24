import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { PublicEntry, SpoilerLevel } from '../lib/content/schema';
import type { PublicVideo } from '../lib/content/load';
import { contextKey, emptyContext, setCompleted, setPrefs, setResume } from '../lib/progress/model';
import { tally } from '../lib/progress/totals';
import { search } from '../lib/search';
import { isSpoilerMode, modeAllows, SPOILER_MODES } from '../lib/spoilers';
import { GUIDES_CONTEXT } from '../lib/progress/contexts';
import { SaveStatus } from './SaveStatus';
import { StorageNotice } from './StorageNotice';
import { useProgress } from './useProgress';
import VideoEmbed from './VideoEmbed';
import './tracker.css';

interface Props {
  gameId: string;
  categories: { id: string; label: string }[];
  entries: PublicEntry[];
  videos: PublicVideo[];
  protectedUrl: string;
  /** Set on a section page: hides the section filter. */
  fixedCategory?: string;
}
type Details = Record<string, { title: string; summary: string; steps?: string[] }>;
type Status = 'all' | 'todo' | 'done';

export const SPOILER_LABEL: Record<SpoilerLevel, string> = { none: 'No spoilers', minor: 'Mild spoiler', major: 'Major spoiler' };
const VERIFY: Record<PublicEntry['verification'], { label: string; cls: string; hint: string }> = {
  confirmed: { label: '✓ Confirmed', cls: 'v-ok', hint: 'Checked against the sources listed' },
  unconfirmed: { label: '? Unconfirmed', cls: 'v-warn', hint: 'Reported, but not yet checked against a reliable source' },
  rumor: { label: '! Rumor', cls: 'v-bad', hint: 'A rumor or leak. Not confirmed.' },
};

/** Searchable, filterable guide entries with checkboxes, "More details" and spoiler reveals. */
export default function EntryBrowser({ gameId, categories, entries, videos, protectedUrl, fixedCategory }: Props) {
  const state = useProgress();
  const { progress, update, remember, ready } = state;
  const key = contextKey(gameId, GUIDES_CONTEXT);
  const ctx = progress.contexts[key] ?? emptyContext();
  const mode = progress.prefs.spoilerMode;

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(fixedCategory ?? 'all');
  const [spoiler, setSpoiler] = useState<'all' | SpoilerLevel>('all');
  const [verify, setVerify] = useState<'all' | PublicEntry['verification']>('all');
  const [status, setStatus] = useState<Status>('all');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<Details | null>(null);
  const [detailsError, setDetailsError] = useState(false);
  const loading = useRef<Promise<Details | null> | null>(null);
  const catLabel = (id: string) => categories.find((c) => c.id === id)?.label ?? id;
  // Remember this section for "Continue where you left off".
  useEffect(() => {
    if (ready) remember((s) => setResume(s, { href: location.pathname, label: fixedCategory ? `Guide: ${catLabel(fixedCategory)}` : 'Guide: all entries', at: new Date().toISOString() }));
  }, [ready]);

  function loadDetails() {
    if (details) return Promise.resolve(details);
    loading.current ??= fetch(protectedUrl).then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Details) => { setDetails(d); setDetailsError(false); return d; })
      .catch(() => { loading.current = null; setDetailsError(true); return null; });
    return loading.current;
  }
  // Fetch spoiler text only when an open entry would show it under the chosen spoiler mode.
  useEffect(() => {
    if (ready && entries.some((e) => e.hasDetails && open.has(e.id) && modeAllows(e.spoilerLevel, mode))) void loadDetails();
  }, [ready, mode, open]);

  const inSection = useMemo(() => entries.filter((e) => category === 'all' || e.category === category), [entries, category]);
  const visible = useMemo(() => {
    let list = inSection;
    if (spoiler !== 'all') list = list.filter((e) => e.spoilerLevel === spoiler);
    if (verify !== 'all') list = list.filter((e) => e.verification === verify);
    if (status === 'done') list = list.filter((e) => e.id in ctx.completed);
    if (status === 'todo') list = list.filter((e) => !(e.id in ctx.completed));
    if (query.trim()) {
      // Spoiler-free fields only, so results never hint at hidden details.
      const docs = list.map((e) => ({ e, title: e.title, text: [e.summary, ...e.steps, ...e.facts.map((f) => `${f.label} ${f.value}`), catLabel(e.category)].join(' ') }));
      list = search(docs, query, 500).map((d) => d.e);
    }
    return list;
  }, [inSection, spoiler, verify, status, query, ctx]);

  const t = tally(inSection.map((e) => e.id), ctx.completed);
  const toggle = (set: Set<string>, id: string) => { const n = new Set(set); n.has(id) ? n.delete(id) : n.add(id); return n; };

  return (
    <div class="tracker entries">
      <div class="summary panel">
        <div class="ranks">
          <p class="hud-label">{fixedCategory ? catLabel(fixedCategory) : 'All sections'}</p>
          <p class="big">{t.percent === null ? '—' : `${t.done}/${t.total}`}</p>
          <p class="muted small">{t.percent === null ? 'Nothing verified here yet' : `${t.percent}% checked off`}</p>
        </div>
        <div class="xp">
          {t.percent === 100 && <p><span class="stamp">Section cleared</span></p>}
          <div class="bar" role="progressbar" aria-label="Entries checked off" aria-valuemin={0} aria-valuemax={t.total} aria-valuenow={t.done}>
            <i style={{ width: `${t.percent ?? 0}%` }} />
          </div>
          <SaveStatus state={state} />
        </div>
        <label class="field-label">
          Spoilers
          <select value={mode} onChange={(e) => {
            const v = (e.target as HTMLSelectElement).value;
            if (isSpoilerMode(v)) { update((s) => setPrefs(s, { spoilerMode: v })); setRevealed(new Set()); }
          }}>
            {SPOILER_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
      </div>
      <StorageNotice state={state} />

      {inSection.length === 0 ? (
        <div class="empty" role="status">
          <strong>Nothing verified for {fixedCategory ? catLabel(fixedCategory) : 'this guide'} yet.</strong> We only add entries we can check against
          a reliable source, so this stays empty rather than guessing. New entries appear here as they're verified.
        </div>
      ) : (
        <>
          <div class="toolbar filters">
            <label class="search-field">
              <span class="sr-only">Search guide entries</span>
              <input type="search" placeholder="Search tips, missions, vehicles…" value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
            </label>
            {!fixedCategory && (
              <label class="field-label compact">Section
                <select value={category} onChange={(e) => setCategory((e.target as HTMLSelectElement).value)}>
                  <option value="all">All sections</option>
                  {categories.filter((c) => entries.some((e) => e.category === c.id)).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </label>
            )}
            <label class="field-label compact">Spoiler level
              <select value={spoiler} onChange={(e) => setSpoiler((e.target as HTMLSelectElement).value as typeof spoiler)}>
                <option value="all">Any</option><option value="none">None</option><option value="minor">Mild</option><option value="major">Major</option>
              </select>
            </label>
            <label class="field-label compact">Verification
              <select value={verify} onChange={(e) => setVerify((e.target as HTMLSelectElement).value as typeof verify)}>
                <option value="all">Any</option><option value="confirmed">Confirmed</option><option value="unconfirmed">Unconfirmed</option><option value="rumor">Rumor</option>
              </select>
            </label>
            <div class="seg status" role="group" aria-label="Show">
              {(['all', 'todo', 'done'] as Status[]).map((s) => (
                <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)}>{s === 'all' ? 'All' : s === 'todo' ? 'To do' : 'Done'}</button>
              ))}
            </div>
          </div>
          {detailsError && <p class="notice error" role="status">Couldn't load spoiler details. Check your connection and try again.</p>}

          <ul class="list entry-list">
            {visible.map((e) => {
              const done = e.id in ctx.completed;
              const isOpen = open.has(e.id);
              const showSpoiler = e.hasDetails && (revealed.has(e.id) || modeAllows(e.spoilerLevel, mode)) && details?.[e.id];
              const inputId = `e-${e.slug}`;
              const v = VERIFY[e.verification];
              const vids = videos.flatMap((x) => x.moments.filter((m) => m.target === e.id).map((m) => ({ x, m })));
              return (
                <li key={e.id} class={`entry${done ? ' done' : ''}`}>
                  <div class="entry-head">
                    <input id={inputId} class="check" type="checkbox" checked={done} disabled={!ready}
                      onChange={(ev) => update((p) => setCompleted(p, key, e.id, (ev.target as HTMLInputElement).checked))} />
                    <div class="entry-main">
                      <label for={inputId} class="title">{e.title}</label>
                      <div class="tags">
                        <span class={`tag ${v.cls}`} title={v.hint}>{v.label}</span>
                        {e.spoilerLevel !== 'none' && <span class="tag miss">{SPOILER_LABEL[e.spoilerLevel]}</span>}
                        {category === 'all' && !fixedCategory && <span class="tag">{catLabel(e.category)}</span>}
                        {e.chapter && <span class="tag">Chapter {e.chapter}</span>}
                        {e.mode === 'online' && <span class="tag">Online</span>}
                        {e.status === 'draft' && <span class="tag draft">Draft</span>}
                      </div>
                      <p class="desc">{e.summary}</p>
                      <button type="button" class="more" aria-expanded={isOpen} aria-controls={`${inputId}-more`} onClick={() => setOpen((o) => toggle(o, e.id))}>
                        {isOpen ? 'Hide details ▴' : 'More details ▾'}
                      </button>
                    </div>
                  </div>
                  {isOpen && (
                    <div class="entry-more" id={`${inputId}-more`}>
                      {e.steps.length > 0 && <ol class="howto">{e.steps.map((s) => <li>{s}</li>)}</ol>}
                      {e.facts.length > 0 && (
                        <dl class="facts">{e.facts.map((f) => <div><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>
                      )}
                      {e.mapPinIds.length > 0
                        ? <p><a class="btn btn-quiet" href={`/games/${gameId}/map/?pin=${e.mapPinIds[0]!.split(':').pop()}`}>Show on map →</a></p>
                        : (e.category === 'collectibles' || e.category === 'weapons' || e.category === 'vehicles') && <p class="small muted">Show on map: not available yet. No verified location.</p>}
                      {e.platformNote && <p class="small muted">Platform note: {e.platformNote}</p>}
                      {e.gameVersion && <p class="small muted">Checked on game version {e.gameVersion}</p>}
                      {e.hasDetails && (showSpoiler ? (
                        <div class="spoiler-box">
                          <p class="hud-label">{SPOILER_LABEL[e.spoilerLevel]} · revealed</p>
                          <p>{details![e.id]!.summary}</p>
                          {(details![e.id]!.steps ?? []).length > 0 && <ul>{details![e.id]!.steps!.map((s) => <li>{s}</li>)}</ul>}
                        </div>
                      ) : (
                        <div class="spoiler-box locked">
                          <p class="small">This entry has <strong>{SPOILER_LABEL[e.spoilerLevel].toLowerCase()}</strong> details. They stay hidden until you choose to see them.</p>
                          <button type="button" class="act reveal" onClick={async () => { if (await loadDetails()) setRevealed((r) => new Set(r).add(e.id)); }}>
                            Reveal {SPOILER_LABEL[e.spoilerLevel].toLowerCase()}<span class="sr-only"> for {e.title}</span>
                          </button>
                        </div>
                      ))}
                      {vids.map(({ x, m }) => (modeAllows(x.spoilerLevel, mode) || revealed.has(e.id))
                        ? <VideoEmbed video={x} start={m.start} label={m.label} />
                        : (
                          <div class="spoiler-box locked">
                            <p class="small">A video for this entry has <strong>{SPOILER_LABEL[x.spoilerLevel].toLowerCase()}s</strong>. Its title and preview stay hidden until you choose to see it.</p>
                            <button type="button" class="act reveal" onClick={() => setRevealed((r) => new Set(r).add(e.id))}>Show video<span class="sr-only"> for {e.title}</span></button>
                          </div>
                        ))}
                      <details class="sources-box">
                        <summary>Sources and last checked ({e.sources.length})</summary>
                        <ul>
                          {e.sources.map((s) => (
                            <li><a href={s.url} target="_blank" rel="noopener">{s.publisher}: {s.title} ↗</a> · checked {s.checkedAt}{s.supports ? ` · ${s.supports}` : ''}</li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {visible.length === 0 && <p class="empty">No entries match these filters.</p>}
        </>
      )}
    </div>
  );
}
