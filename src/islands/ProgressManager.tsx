import { useState } from 'preact/hooks';
import { resetContext, type Progress } from '../lib/progress/model';
import { diffImport, exportFileName, exportProgress, parseImport, type ContextDiff } from '../lib/progress/io';
import { tally, formatTally } from '../lib/progress/totals';
import { StorageNotice } from './StorageNotice';
import { useProgress } from './useProgress';
import './tracker.css';

interface Ctx { key: string; label: string; href: string; objectiveIds: string[] }
interface Props { contexts: Ctx[] }

export default function ProgressManager({ contexts }: Props) {
  const state = useProgress();
  const { progress, update, replace, ready } = state;
  const [pending, setPending] = useState<{ incoming: Progress; diff: ContextDiff[] } | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const labelFor = (k: string) => contexts.find((c) => c.key === k)?.label ?? k;

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
    setPending({ incoming: r.progress, diff: diffImport(progress, r.progress) });
  }

  function restore() {
    if (!pending) return;
    const res = replace({ ...pending.incoming, updatedAt: new Date().toISOString() });
    setPending(null);
    setMessage(res.ok ? { kind: 'ok', text: 'Backup restored.' } : { kind: 'error', text: "Restored for this visit, but it couldn't be saved. See the note above." });
  }

  const rows = contexts.map((c) => ({ ...c, t: tally(c.objectiveIds, progress.contexts[c.key]?.completed ?? {}), ticks: Object.keys(progress.contexts[c.key]?.completed ?? {}).length }));

  return (
    <div class="tracker">
      <StorageNotice state={state} />
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
        <h2>Back up and restore</h2>
        <p class="muted">Your progress lives only in this browser. Clearing site data, or switching phone or browser, loses it. Download a backup now and then.</p>
        <div class="btn-row">
          <button type="button" class="btn btn-primary" onClick={download} disabled={!ready}>Download backup</button>
          <label class="btn btn-quiet file">
            Restore from a backup…
            <input type="file" accept="application/json,.json" onChange={choose} />
          </label>
        </div>
        {message && <p class={message.kind === 'error' ? 'notice error' : 'notice'} role="status">{message.text}</p>}
        {pending && (
          <div class="confirm" role="alertdialog" aria-label="Confirm restore">
            <p><strong>Restore this backup?</strong> It replaces everything saved on this device:</p>
            <ul>
              {pending.diff.length === 0 && <li>The backup is empty.</li>}
              {pending.diff.map((d) => (
                <li key={d.key}>{labelFor(d.key)}: {d.incoming} ticked in the backup ({d.added} new{d.removed ? `, ${d.removed} would be unticked` : ''})</li>
              ))}
            </ul>
            <button type="button" class="btn btn-danger" onClick={restore}>Restore backup</button>
            <button type="button" class="btn btn-quiet" onClick={() => { setPending(null); setMessage({ kind: 'ok', text: 'Restore cancelled. Nothing was changed.' }); }}>Cancel</button>
          </div>
        )}
      </section>
    </div>
  );
}
