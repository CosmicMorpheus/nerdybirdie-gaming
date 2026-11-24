import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { PublicObjective } from '../lib/content/schema';
import { contextKey, emptyContext, resetContext, setBookmark, setCompleted, setNote, setPrefs } from '../lib/progress/model';
import { formatTally, progressFor } from '../lib/progress/totals';
import { CHECKPOINTS, crossedCheckpoint, nextRank, nextUp, rankFor } from '../lib/progress/ranks';
import { search } from '../lib/search';
import { displayText, modeAllows, SPOILER_MODES, isSpoilerMode, type SpoilerMode } from '../lib/spoilers';
import { StorageNotice } from './StorageNotice';
import { SaveStatus } from './SaveStatus';
import { useProgress } from './useProgress';
import './tracker.css';

interface PlatformInfo { id: string; label: string; shortLabel: string; objectiveNoun: string; family: string }
interface Props {
  gameId: string;
  gameShortTitle: string;
  platforms: PlatformInfo[];
  categories: { id: string; label: string }[];
  objectives: PublicObjective[];
  protectedUrl: string;
}
type Status = 'all' | 'todo' | 'done';
type Protected = Record<string, { title: string; summary: string }>;

export default function Tracker({ gameId, gameShortTitle, platforms, categories, objectives, protectedUrl }: Props) {
  const state = useProgress();
  const { progress, update, ready } = state;

  const savedPlatform = progress.prefs.platformByGame[gameId];
  const platform = platforms.find((p) => p.id === savedPlatform) ?? platforms[0]!;
  const mode: SpoilerMode = progress.prefs.spoilerMode;
  const key = contextKey(gameId, platform.id);
  const ctx = progress.contexts[key] ?? emptyContext();

  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<Status>('all');
  const [query, setQuery] = useState('');
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [prot, setProt] = useState<Protected | null>(null);
  const [protError, setProtError] = useState(false);
  const [openNote, setOpenNote] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [announce, setAnnounce] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const lastPct = useRef<number | null | undefined>(undefined);
  const loading = useRef<Promise<Protected | null> | null>(null);

  const forPlatform = useMemo(() => objectives.filter((o) => o.platformIds.includes(platform.id)), [objectives, platform.id]);
  const totals = useMemo(() => progressFor(forPlatform, ctx.completed, categories.map((c) => c.id)), [forPlatform, ctx.completed, categories]);
  const catLabel = (id: string) => categories.find((c) => c.id === id)?.label ?? id;

  // Celebrate a checkpoint when it's crossed by ticking (not on page load or platform switch).
  useEffect(() => {
    const pct = totals.overall.percent;
    const prev = lastPct.current;
    lastPct.current = pct;
    if (!ready || prev === undefined) return;
    const hit = crossedCheckpoint(prev, pct);
    if (hit) {
      const msg = hit === 100 ? `100%! ${platform.shortLabel} ${platform.objectiveNoun.toLowerCase()} cleared!` : `Checkpoint! ${hit}% reached · Rank: ${rankFor(pct)!.title}`;
      setToast(msg);
      setAnnounce(msg);
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [totals.overall.percent, ready]);
  useEffect(() => { lastPct.current = undefined; }, [platform.id]);

  function loadProtected(): Promise<Protected | null> {
    if (prot) return Promise.resolve(prot);
    loading.current ??= fetch(protectedUrl, { headers: { accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: Protected) => { setProt(d); setProtError(false); return d; })
      .catch(() => { loading.current = null; setProtError(true); return null; });
    return loading.current;
  }

  // Only fetch spoiler text when the chosen mode would actually show some of it.
  useEffect(() => {
    if (ready && forPlatform.some((o) => o.hasProtected && modeAllows(o.spoilerLevel, mode))) void loadProtected();
  }, [ready, mode, forPlatform]);

  const visible = useMemo(() => {
    let list = forPlatform;
    if (category === 'bookmarked') list = list.filter((o) => ctx.bookmarks.includes(o.id));
    else if (category !== 'all') list = list.filter((o) => o.category === category);
    if (status === 'done') list = list.filter((o) => o.id in ctx.completed);
    if (status === 'todo') list = list.filter((o) => !(o.id in ctx.completed));
    if (query.trim()) {
      // Safe fields only: protected text is never searched, so results can't hint at spoilers.
      const docs = list.map((o) => ({ o, title: o.safeTitle, text: `${o.safeSummary} ${catLabel(o.category)}` }));
      list = search(docs, query, 500).map((d) => d.o);
    }
    return list;
  }, [forPlatform, category, status, query, ctx]);

  const tabs = [
    { id: 'all', label: 'All', count: formatTally(totals.overall) },
    ...categories.map((c) => ({ id: c.id, label: c.label, count: forPlatform.some((o) => o.category === c.id) ? formatTally(totals.byCategory[c.id]!) : '—', cleared: totals.byCategory[c.id]!.percent === 100 })),
    { id: 'bookmarked', label: 'Saved', count: String(ctx.bookmarks.filter((b) => forPlatform.some((o) => o.id === b)).length) },
  ];

  const pct = totals.overall.percent;
  const rank = rankFor(pct);
  const next = nextRank(pct);
  const noun = platform.objectiveNoun.toLowerCase();
  const upNext = nextUp(forPlatform, ctx.completed, ctx.bookmarks);

  return (
    <div class="tracker">
      <div class="controls">
        <fieldset class="seg-field">
          <legend>Platform</legend>
          <div class="seg">
            {platforms.map((p) => (
              <label key={p.id}>
                <input type="radio" name="platform" value={p.id} checked={p.id === platform.id}
                  onChange={() => { update((s) => setPrefs(s, { platformByGame: { [gameId]: p.id } })); setConfirmReset(false); }} />
                <span>{p.shortLabel}</span>
              </label>
            ))}
          </div>
        </fieldset>
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
      <SaveStatus state={state} />

      <div class="summary panel">
        <div class="ranks">
          <p class="hud-label">{rank ? `Rank · LV ${rank.level}` : 'Rank'}</p>
          <p class="big">{pct === null ? '—' : `${pct}%`}</p>
          <p class="muted small">
            {pct === null ? `No verified ${noun} yet for ${platform.shortLabel}` : `${totals.overall.done} of ${totals.overall.total} ${noun} · ${platform.shortLabel}`}
          </p>
        </div>
        <div class="xp">
          <p class="hud-rank">{rank ? rank.title : 'Ready to start'}</p>
          <div class="bar" role="progressbar" aria-label={`${gameShortTitle} ${noun} completed`} aria-valuemin={0} aria-valuemax={totals.overall.total} aria-valuenow={totals.overall.done}>
            <i style={{ width: `${pct ?? 0}%` }} />
          </div>
          <ul class="hud-cps" aria-label="Checkpoints">
            {CHECKPOINTS.map((c) => <li key={c} class={`badge-px${pct !== null && pct >= c ? ' on' : ''}`}>{pct !== null && pct >= c ? '★' : '☆'} {c}%</li>)}
          </ul>
          {pct !== null && next && <p class="muted small">{next.min - pct}% to {next.title}</p>}
        </div>
      </div>
      {toast && <div class="toast" role="status">{toast}</div>}

      {forPlatform.length === 0 ? (
        <div class="empty" role="status">
          <strong>The {platform.label} {noun} list isn't verified yet.</strong> We only list {noun} we can source and check, so
          nothing here is guessed. This tracker will fill in once the list is verified. Nothing counts toward your progress until then.
        </div>
      ) : (
        <>
          {upNext.length > 0 && (
            <section class="next-up" aria-labelledby="next-up-h">
              <h2 id="next-up-h" class="hud-label">Next up</h2>
              <ol>
                {upNext.map((o) => (
                  <li key={o.id}>{displayText(o, mode, revealed, prot).title}
                    {o.missable === true ? <span class="why">Missable, do it early</span> : ctx.bookmarks.includes(o.id) ? <span class="why" style={{ color: 'var(--vc-sunset)' }}>Saved</span> : null}</li>
                ))}
              </ol>
            </section>
          )}

          <nav class="cats" aria-label="Categories">
            {tabs.map((t) => (
              <button key={t.id} type="button" class="cat" aria-pressed={category === t.id} onClick={() => setCategory(t.id)}>
                <span>{t.label}</span><span class="count">{t.count}</span>{'cleared' in t && t.cleared && <span class="stamp">Cleared</span>}
              </button>
            ))}
          </nav>

          <div class="toolbar">
            <label class="search-field">
              <span class="sr-only">Search {noun}</span>
              <input type="search" placeholder={`Search ${noun}`} value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
            </label>
            <div class="seg status" role="group" aria-label="Show">
              {(['all', 'todo', 'done'] as Status[]).map((s) => (
                <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)}>
                  {s === 'all' ? 'All' : s === 'todo' ? 'To do' : 'Done'}
                </button>
              ))}
            </div>
          </div>

          {category !== 'all' && category !== 'bookmarked' && !forPlatform.some((o) => o.category === category) && (
            <div class="empty"><strong>{catLabel(category)}: not verified yet.</strong> This category doesn't count toward your total until it has entries.</div>
          )}
          {protError && <p class="notice error" role="status">Couldn't load hidden details. Check your connection and try again.</p>}

          <p class="sr-only" aria-live="polite">{announce}</p>
          <ul class="list">
            {visible.map((o) => {
              const t = displayText(o, mode, revealed, prot);
              const done = o.id in ctx.completed;
              const saved = ctx.bookmarks.includes(o.id);
              const note = ctx.notes[o.id] ?? '';
              const inputId = `o-${o.id.replace(/[^a-z0-9]/g, '-')}`;
              return (
                <li key={o.id} class={`row${done ? ' done' : ''}`}>
                  <input id={inputId} class="check" type="checkbox" checked={done} disabled={!ready}
                    onChange={(e) => {
                      const on = (e.target as HTMLInputElement).checked;
                      update((s) => setCompleted(s, key, o.id, on));
                      setAnnounce(`${t.title} ${on ? 'marked done' : 'marked not done'}`);
                    }} />
                  <div class="body">
                    <label for={inputId} class={t.concealed ? 'title concealed' : 'title'}>{t.title}</label>
                    {t.summary && <p class="desc">{t.summary}</p>}
                    <div class="tags">
                      <span class="tag">{catLabel(o.category)}</span>
                      {o.missable === true && <span class="tag miss">Missable</span>}
                      {o.hidden && <span class="tag">Hidden</span>}
                      {o.points !== null && platform.family === 'xbox' && <span class="tag">{o.points}G</span>}
                      {o.draft && <span class="tag draft">Draft · unverified</span>}
                      {note && openNote !== o.id && <span class="tag">Note</span>}
                    </div>
                    {openNote === o.id && (
                      <label class="note">
                        <span class="sr-only">Your note</span>
                        <textarea rows={3} maxLength={1000} value={note} placeholder="Your note (saved on this device)"
                          onInput={(e) => update((s) => setNote(s, key, o.id, (e.target as HTMLTextAreaElement).value))} />
                      </label>
                    )}
                  </div>
                  <div class="actions">
                    {t.concealed && (
                      <button type="button" class="act reveal" onClick={async () => {
                        const d = await loadProtected();
                        if (d) setRevealed((r) => new Set(r).add(o.id));
                      }}>Reveal<span class="sr-only"> details for {o.safeTitle}</span></button>
                    )}
                    <button type="button" class="act" aria-pressed={saved}
                      onClick={() => update((s) => setBookmark(s, key, o.id, !saved))}>
                      {saved ? '★' : '☆'}<span class="sr-only"> Save {t.title}</span>
                    </button>
                    <button type="button" class="act" aria-expanded={openNote === o.id}
                      onClick={() => setOpenNote(openNote === o.id ? null : o.id)}>
                      ✎<span class="sr-only"> Note for {t.title}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {visible.length === 0 && <p class="empty">Nothing matches. Try another search or filter.</p>}
        </>
      )}

      <div class="local">
        <p class="muted small">
          Progress is saved in this browser only and isn't synced with your console. <a href="/progress/">Back up or restore</a>.
        </p>
        {Object.keys(ctx.completed).length > 0 && (confirmReset ? (
          <div class="confirm" role="alertdialog" aria-label="Confirm reset">
            <p>Clear all {Object.keys(ctx.completed).length} ticks, notes and saved items for {gameShortTitle} on {platform.shortLabel}? This can't be undone unless you have a backup.</p>
            <button type="button" class="btn btn-danger" onClick={() => { update((s) => resetContext(s, key)); setConfirmReset(false); setAnnounce('Progress cleared'); }}>Yes, clear it</button>
            <button type="button" class="btn btn-quiet" onClick={() => setConfirmReset(false)}>Cancel</button>
          </div>
        ) : (
          <button type="button" class="btn btn-quiet" onClick={() => setConfirmReset(true)}>Reset {platform.shortLabel} progress…</button>
        ))}
      </div>
    </div>
  );
}
