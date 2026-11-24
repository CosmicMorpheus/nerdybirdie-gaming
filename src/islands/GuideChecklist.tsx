import { useEffect, useRef, useState } from 'preact/hooks';
import type { PublicStep, Video } from '../lib/content/schema';
import { contextKey, emptyContext, setCompleted, setPrefs } from '../lib/progress/model';
import { tally } from '../lib/progress/totals';
import { displayText, isSpoilerMode, modeAllows, SPOILER_MODES } from '../lib/spoilers';
import { GUIDES_CONTEXT } from './Hud';
import { StorageNotice } from './StorageNotice';
import { useProgress } from './useProgress';
import VideoEmbed from './VideoEmbed';
import './tracker.css';

interface Props {
  gameId: string;
  steps: PublicStep[];
  videos: Video[];
  sources: { id: string; label: string; url: string }[];
  protectedUrl: string;
}
type Protected = Record<string, { title: string; summary: string }>;

/** A guide as a checklist: tick steps as you go, with spoiler-gated details and click-to-play videos. */
export default function GuideChecklist({ gameId, steps, videos, sources, protectedUrl }: Props) {
  const state = useProgress();
  const { progress, update, ready } = state;
  const key = contextKey(gameId, GUIDES_CONTEXT);
  const ctx = progress.contexts[key] ?? emptyContext();
  const mode = progress.prefs.spoilerMode;
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [prot, setProt] = useState<Protected | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const loading = useRef<Promise<Protected | null> | null>(null);
  const t = tally(steps.map((s) => s.id), ctx.completed);
  const prevDone = useRef<number | null>(null);

  function loadProtected() {
    if (prot) return Promise.resolve(prot);
    loading.current ??= fetch(protectedUrl).then((r) => (r.ok ? r.json() : Promise.reject())).then((d: Protected) => { setProt(d); return d; })
      .catch(() => { loading.current = null; return null; });
    return loading.current;
  }
  useEffect(() => {
    if (ready && steps.some((s) => s.hasProtected && modeAllows(s.spoilerLevel, mode))) void loadProtected();
  }, [ready, mode]);
  useEffect(() => {
    if (!ready) return;
    if (prevDone.current !== null && t.done > prevDone.current && t.percent === 100) {
      setToast('Guide cleared! ★');
      const h = setTimeout(() => setToast(null), 3500);
      prevDone.current = t.done;
      return () => clearTimeout(h);
    }
    prevDone.current = t.done;
  }, [t.done, ready]);

  const src = (ids: string[]) => sources.filter((s) => ids.includes(s.id));

  return (
    <div class="tracker">
      <div class="summary panel">
        <div class="ranks">
          <p class="hud-label">Guide progress</p>
          <p class="big">{t.percent === null ? '—' : `${t.done}/${t.total}`}</p>
        </div>
        <div class="xp">
          {t.percent === 100 ? <p><span class="stamp">Guide cleared</span></p> : <p class="muted small">Tick each step as you do it. Saved on this device.</p>}
          <div class="bar" role="progressbar" aria-label="Steps completed" aria-valuemin={0} aria-valuemax={t.total} aria-valuenow={t.done}>
            <i style={{ width: `${t.percent ?? 0}%` }} />
          </div>
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
      {toast && <div class="toast" role="status">{toast}</div>}

      <ol class="steps">
        {steps.map((s, i) => {
          const d = displayText({ ...s, safeTitle: s.title, safeSummary: s.body }, mode, revealed, prot);
          const done = s.id in ctx.completed;
          const v = s.videoId ? videos.find((x) => x.id === s.videoId) : undefined;
          const inputId = `s-${s.id.replace(/[^a-z0-9]/g, '-')}`;
          const showVideo = v && (modeAllows(v.spoilerLevel, mode) || revealed.has(s.id));
          return (
            <li key={s.id} class={`step${done ? ' done' : ''}`}>
              <div class="step-head">
                <span class="step-n pixel" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <input id={inputId} class="check" type="checkbox" checked={done} disabled={!ready}
                  onChange={(e) => update((p) => setCompleted(p, key, s.id, (e.target as HTMLInputElement).checked))} />
                <label for={inputId} class={d.concealed ? 'title concealed' : 'title'}>{d.title}</label>
              </div>
              <div class="step-body">
                {d.summary && <p>{d.summary}</p>}
                {d.concealed && (
                  <button type="button" class="act reveal" onClick={async () => { if (await loadProtected()) setRevealed((r) => new Set(r).add(s.id)); }}>
                    Reveal step<span class="sr-only"> {i + 1}</span>
                  </button>
                )}
                {v && (showVideo
                  ? <VideoEmbed youtubeId={v.youtubeId} title={v.safeTitle} creator={v.creator} channelUrl={v.channelUrl} startSeconds={v.startSeconds} embedAllowed={v.embedAllowed} />
                  : <p class="small muted">A video for this step is hidden in your spoiler setting.</p>)}
                {s.sourceIds.length > 0 && (
                  <p class="small muted cite">Source: {src(s.sourceIds).map((x, j) => <>{j ? ', ' : ''}<a href={x.url} target="_blank" rel="noopener">{x.label}</a></>)}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
