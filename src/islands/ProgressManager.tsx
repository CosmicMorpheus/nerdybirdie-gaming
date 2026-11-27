import { useEffect, useState } from 'preact/hooks';
import { resetContext, type Progress } from '../lib/progress/model';
import { diffImport, exportFileName, exportProgress, parseImport, type ContextDiff } from '../lib/progress/io';
import { tally, formatTally } from '../lib/progress/totals';
import { syncMerge } from '../lib/progress/merge';
import { decodeTransfer, encodeTransfer, transferLink } from '../lib/progress/transfer';
import { StorageNotice } from './StorageNotice';
import { SaveStatus } from './SaveStatus';
import { useProgress } from './useProgress';
import './tracker.css';

interface Ctx { key: string; label: string; href: string; objectiveIds: string[] }
interface Section { label: string; href: string; entryIds: string[] }
interface Props { contexts: Ctx[]; guideKey: string; sections: Section[] }

export default function ProgressManager({ contexts, guideKey, sections }: Props) {
  const state = useProgress();
  const { progress, update, replace, ready } = state;
  const [pending, setPending] = useState<{ incoming: Progress; diff: ContextDiff[]; source: 'file' | 'transfer' } | null>(null);
  const [link, setLink] = useState('');
  const [paste, setPaste] = useState('');
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  // Phones start with backup folded away. Decided after hydration so the first render matches the server HTML.
  const [compact, setCompact] = useState(false);
  useEffect(() => { setCompact(matchMedia('(max-width: 640px)').matches); }, []);
  const labelFor = (k: string) => contexts.find((c) => c.key === k)?.label ?? k;

  // Opening a transfer link (…/progress/#transfer=CODE) offers to load that progress here. The code never leaves the browser.
  useEffect(() => {
    if (!ready || !location.hash.startsWith('#transfer=')) return;
    void loadCode(location.hash);
    history.replaceState(null, '', location.pathname); // don't leave the code in the address bar or history
  }, [ready]);

  async function loadCode(code: string) {
    const r = await decodeTransfer(code);
    if (!r.ok) { setPending(null); setMessage({ kind: 'error', text: `${r.error} Nothing was changed.` }); return; }
    setMessage(null);
    setPending({ incoming: r.progress, diff: diffImport(progress, r.progress), source: 'transfer' });
    document.getElementById('move')?.scrollIntoView({ block: 'start' });
  }

  async function makeLink() {
    const l = transferLink(location.origin, await encodeTransfer(progress));
    setLink(l);
    return l;
  }

  async function copyLink() {
    const l = link || (await makeLink());
    try { await navigator.clipboard.writeText(l); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    catch { setMessage({ kind: 'error', text: 'Copying was blocked. Select the link below and copy it.' }); }
  }

  async function shareLink() {
    const l = link || (await makeLink());
    try { await navigator.share({ title: 'My Nerdy Birdie Gaming Guides progress', url: l }); } catch { /* cancelled */ }
  }

  function combine() {
    if (!pending) return;
    // Newest action per item wins; nothing on either browser is lost.
    const res = replace({ ...syncMerge(progress, pending.incoming), updatedAt: new Date().toISOString() });
    setPending(null);
    setMessage(res.ok ? { kind: 'ok', text: 'Progress combined. You can pick up where you left off.' } : { kind: 'error', text: "Loaded for this visit, but it couldn't be saved. See the note above." });
  }

  function download() {
    const blob = new Blob([exportProgress(progress)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = exportFileName();
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMessage({ kind: 'ok', text: `Backup downloaded as ${a.download}.` });
  }

  async function choose(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const r = parseImport(await file.text());
    if (!r.ok) { setPending(null); setMessage({ kind: 'error', text: `${r.error} Nothing was changed.` }); return; }
    setMessage(null);
    setPending({ incoming: r.progress, diff: diffImport(progress, r.progress), source: 'file' });
  }

  function restore() {
    if (!pending) return;
    // Ticks the backup doesn't have become deliberate unticks, so account sync can't bring them back.
    const now = new Date().toISOString();
    const incoming = structuredClone(pending.incoming);
    for (const [k, c] of Object.entries(progress.contexts)) {
      const target = (incoming.contexts[k] ??= { completed: {}, bookmarks: [], notes: {}, unchecked: {} });
      for (const id of Object.keys(c.completed)) if (!(id in target.completed)) target.unchecked[id] = now;
    }
    const res = replace({ ...incoming, updatedAt: now });
    setPending(null);
    setMessage(res.ok ? { kind: 'ok', text: 'Progress restored.' } : { kind: 'error', text: "Restored for this visit, but it couldn't be saved. See the note above." });
  }

  const rows = contexts.map((c) => ({ ...c, t: tally(c.objectiveIds, progress.contexts[c.key]?.completed ?? {}), ticks: Object.keys(progress.contexts[c.key]?.completed ?? {}).length }));

  return (
    <div class="tracker">
      <StorageNotice state={state} />
      <section class="panel move" id="move" aria-labelledby="move-h">
        <h2 id="move-h">Continue in another browser</h2>
        <p class="muted">No account needed. Copy or share this link, then open it on your other phone, browser or computer to pick up where you left off.
          Your progress is packed into the link itself and isn't sent to us.</p>
        <div class="btn-row">
          <button type="button" class="btn btn-primary" onClick={copyLink} disabled={!ready}>{copied ? 'Link copied ✓' : 'Copy transfer link'}</button>
          {typeof navigator !== 'undefined' && 'share' in navigator && <button type="button" class="btn btn-quiet" onClick={shareLink} disabled={!ready}>Share…</button>}
        </div>
        {link && <label class="field-label">Your transfer link (anyone with it can load this progress)<textarea class="code" readOnly rows={2} value={link} onFocus={(e) => (e.target as HTMLTextAreaElement).select()} /></label>}
        <form class="btn-row" onSubmit={(e) => { e.preventDefault(); if (paste.trim()) void loadCode(paste); }}>
          <label class="search-field"><span class="sr-only">Paste a transfer link or code</span>
            <input type="text" autoComplete="off" placeholder="Paste a transfer link or code from your other browser" value={paste} onInput={(e) => setPaste((e.target as HTMLInputElement).value)} /></label>
          <button type="submit" class="btn btn-quiet" disabled={!paste.trim()}>Load</button>
        </form>
        {pending?.source === 'transfer' && (
          <div class="confirm" role="group" aria-label="Load transferred progress">
            <p><strong>Load progress from your other browser?</strong></p>
            <ul>
              {pending.diff.length === 0 && <li>The transferred progress is empty.</li>}
              {pending.diff.map((d) => <li key={d.key}>{labelFor(d.key)}: {d.incoming} ticked there, {d.current} here ({d.added} new)</li>)}
            </ul>
            <button type="button" class="btn btn-primary" autoFocus onClick={combine}>Combine (recommended)</button>
            <button type="button" class="btn btn-quiet" onClick={restore}>Replace this browser's progress</button>
            <button type="button" class="btn btn-quiet" onClick={() => { setPending(null); setMessage({ kind: 'ok', text: 'Cancelled. Nothing was changed.' }); }}>Cancel</button>
          </div>
        )}
        {message && pending?.source !== 'file' && <p class={message.kind === 'error' ? 'notice error' : 'notice'} role="status">{message.text}</p>}
      </section>

      <section class="panel">
        <h2>Your progress on this device</h2>
        <ul class="ctx-list">
          {rows.map((r) => (
            <li key={r.key}>
              <a href={r.href}>{r.label}</a>
              <span class="muted small">{ready ? formatTally(r.t) : '…'}</span>
              {r.ticks > 0 && (confirmKey === r.key ? (
                <span class="confirm-inline">
                  <button type="button" class="btn btn-danger" onClick={() => { update((s) => resetContext(s, r.key)); setConfirmKey(null); setMessage({ kind: 'ok', text: `${r.label} cleared.` }); }}>Clear {r.ticks} ticks</button>
                  <button type="button" class="btn btn-quiet" onClick={() => setConfirmKey(null)}>Cancel</button>
                </span>
              ) : (
                <button type="button" class="btn btn-quiet" onClick={() => setConfirmKey(r.key)}>Reset…</button>
              ))}
            </li>
          ))}
        </ul>
      </section>

      <section class="panel">
        <h2>Guide progress by section</h2>
        <ul class="ctx-list">
          {sections.map((sec) => {
            const t = tally(sec.entryIds, progress.contexts[guideKey]?.completed ?? {});
            return (
              <li key={sec.href}>
                <a href={sec.href}>{sec.label}</a>
                <span class="muted small">{!ready ? '…' : t.percent === null ? 'Nothing verified yet' : `${t.done} of ${t.total}${t.percent === 100 ? ' ★ Cleared' : ''}`}</span>
                <span class="bar sec-bar" aria-hidden="true"><i style={{ width: `${t.percent ?? 0}%` }} /></span>
              </li>
            );
          })}
        </ul>
        <SaveStatus state={state} />
      </section>

      <details class="panel backup" open={!compact}>
        <summary><h2>Back up and restore</h2></summary>
        <p class="muted">Your progress lives only in this browser. Clearing site data, or switching phone or browser, loses it. Download a backup now and then.</p>
        <div class="btn-row">
          <button type="button" class="btn btn-primary" onClick={download} disabled={!ready}>Download backup</button>
          <label class="btn btn-quiet file">
            Restore from a backup…
            <input type="file" accept="application/json,.json" onChange={choose} />
          </label>
        </div>
        {pending?.source === 'file' && message && <p class={message.kind === 'error' ? 'notice error' : 'notice'} role="status">{message.text}</p>}
        {pending?.source === 'file' && (
          <div class="confirm" role="group" aria-label="Confirm restore">
            <p><strong>Restore this backup?</strong> It replaces everything saved on this device:</p>
            <ul>
              {pending.diff.length === 0 && <li>The backup is empty.</li>}
              {pending.diff.map((d) => (
                <li key={d.key}>{labelFor(d.key)}: {d.incoming} ticked in the backup ({d.added} new{d.removed ? `, ${d.removed} would be unticked` : ''})</li>
              ))}
            </ul>
            <button type="button" class="btn btn-danger" autoFocus onClick={restore}>Restore backup</button>
            <button type="button" class="btn btn-quiet" onClick={() => { setPending(null); setMessage({ kind: 'ok', text: 'Restore cancelled. Nothing was changed.' }); }}>Cancel</button>
          </div>
        )}
      </details>
    </div>
  );
}
