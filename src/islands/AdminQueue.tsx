import { useEffect, useRef, useState } from 'preact/hooks';
import type { HistoryRecord, Override, QueueItem } from '../lib/ask/queue';
import './tracker.css';
import './ask.css';

const KEY = 'nbg:editor-token';
type Data = { items: QueueItem[]; overrides: Record<string, Override>; history: HistoryRecord[] };

/** Private Guide Updates review. The editor token stays in this tab only (sessionStorage). */
export default function AdminQueue({ gameId }: { gameId: string }) {
  const [token, setToken] = useState('');
  const [data, setData] = useState<Data | null>(null);
  const [current, setCurrent] = useState<Record<string, unknown>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const tokenField = useRef<HTMLInputElement>(null);

  useEffect(() => { try { setToken(sessionStorage.getItem(KEY) ?? ''); } catch {} }, []);
  useEffect(() => { fetch(`/data/${gameId}/entries.json`).then((r) => r.json()).then((list: { id: string }[]) => setCurrent(Object.fromEntries(list.map((e) => [e.id, e])))).catch(() => {}); }, []);

  async function load(t = token) {
    const r = await fetch('/api/guide-updates', { headers: { authorization: `Bearer ${t}` } }).catch(() => null);
    if (!r || !r.ok || !r.headers.get('content-type')?.includes('json')) { setMsg({ kind: 'error', text: r?.status === 401 ? 'That editor token was not accepted.' : 'Could not reach the Guide Updates service (it runs on the deployed site with GUIDE_ADMIN_TOKEN set).' }); return; }
    try { sessionStorage.setItem(KEY, t); } catch {}
    setData(await r.json());
    setMsg(null);
  }
  async function act(action: string, id: string, extra: Record<string, unknown> = {}) {
    const r = await fetch('/api/guide-updates', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ action, id, ...extra }) });
    const out = await r.json().catch(() => null);
    if (!r.ok || out?.ok === false) setMsg({ kind: 'error', text: out?.error ?? `Failed (${r.status})` });
    else setMsg({ kind: 'ok', text: { approve: 'Approved: the guide and ASK "COZMC" now use this entry.', undo: 'Undone: the previous version is back.', save: 'Draft saved.', dismiss: 'Dismissed.', verify: 'Marked for more verification.', reopen: 'Reopened.' }[action] ?? 'Done.' });
    await load();
  }

  if (!data) return (
    <section class="panel">
      <h2>Editor sign-in</h2>
      <p class="muted small">Enter the editor token (the GUIDE_ADMIN_TOKEN set in Netlify). It's kept in this browser tab only.</p>
      {/* A plain button (not a form submit), so a click before the page is ready can't reload it; the token is read from the field itself. */}
      <div class="btn-row">
        <label class="search-field"><span class="sr-only">Editor token</span><input ref={tokenField} type="password" autoComplete="off" value={token}
          onInput={(e) => setToken((e.target as HTMLInputElement).value)} onKeyDown={(e) => { if (e.key === 'Enter') void load(tokenField.current?.value ?? token); }} /></label>
        <button class="btn btn-primary" type="button" onClick={() => { const t = tokenField.current?.value ?? token; setToken(t); void load(t); }}>Open queue</button>
      </div>
      {msg && <p class="notice error">{msg.text}</p>}
    </section>
  );

  const items = data.items.filter((i) => filter === 'all' || i.status === 'open' || i.status === 'needs-verification');
  const item = data.items.find((i) => i.id === sel) ?? null;
  const affectedId = item?.affected?.id ?? (item?.draft as { id?: string } | null)?.id;
  const live = affectedId ? (data.overrides[affectedId]?.entry ?? current[affectedId] ?? null) : null;

  return (
    <div class="admin">
      {msg && <p class={msg.kind === 'error' ? 'notice error' : 'notice'} role="status">{msg.text}</p>}
      <div class="admin-cols">
        <section class="panel">
          <div class="mc-head"><h2>Queue</h2>
            <select value={filter} onChange={(e) => setFilter((e.target as HTMLSelectElement).value as 'open' | 'all')} aria-label="Show"><option value="open">Needs review</option><option value="all">All</option></select>
          </div>
          <p class="small muted">Most-asked first. Popularity sets the order only; it never verifies anything.</p>
          <ul class="pin-list">
            {items.map((i) => (
              <li key={i.id}><button type="button" class={i.id === sel ? 'on' : ''} onClick={() => { setSel(i.id); setDraft(JSON.stringify(i.draft, null, 2) ?? ''); }}>
                <i style={{ background: i.status === 'open' ? 'var(--cz-coral)' : i.status === 'needs-verification' ? '#ffd98a' : '#59607a' }} aria-hidden="true" />
                <span>{i.title}<small>{i.status} · asked {i.count}× · {i.origin === 'source-check' ? 'source check' : 'players'}</small></span>
                <b>{i.count}</b>
              </button></li>
            ))}
            {!items.length && <li class="small muted">Nothing waiting for review.</li>}
          </ul>
        </section>
        {item && (
          <section class="panel admin-detail">
            <h2>{item.title}</h2>
            <p class="small muted">{item.status} · asked {item.count}× · first {item.firstAt.slice(0, 10)} · last {item.lastAt.slice(0, 10)}</p>
            <h3>What players asked</h3>
            <ul class="small">{item.questions.slice(-8).map((q) => <li>“{q.text}” <span class="muted">{q.at.slice(0, 16).replace('T', ' ')}</span></li>)}</ul>
            <h3>What our guide is missing</h3>
            <p>{item.gap} {item.affected && <a href={item.affected.href}>{item.affected.title}</a>}</p>
            {item.findings ? (
              <>
                <h3>Evidence (checked {item.findingsCheckedAt?.slice(0, 10)})</h3>
                <p>{item.findings.answer}</p>
                {item.findings.spoilerDetail && <p class="small">Spoiler ({item.findings.spoilerLevel}): {item.findings.spoilerDetail}</p>}
                <ul class="small">{item.findings.reports.map((r) => <li>{r.claim} <span class="muted">[{r.sources.map((i) => item.findings!.sources[i]?.publisher).join(', ')}]</span></li>)}</ul>
                <ul class="small ask-sources">{item.findings.sources.map((s) => <li><a href={s.url} target="_blank" rel="noopener">{s.title}</a> · {s.publisher}{s.creator ? ` (by ${s.creator})` : ''} · {s.kind}</li>)}</ul>
                {(item.findings.platform || item.findings.patch) && <p class="small">Platform: {item.findings.platform ?? '—'} · Patch: {item.findings.patch ?? '—'}</p>}
              </>
            ) : <p class="small muted">No outside evidence yet.</p>}
            {item.needsVerification.length > 0 && <><h3>Still needs verification</h3><ul class="small ask-warn">{item.needsVerification.map((n) => <li>{n}</li>)}</ul></>}
            <div class="admin-compare">
              <div><h3>Current entry</h3><pre>{live ? JSON.stringify(live, null, 2) : 'No published entry yet (approval adds a new one).'}</pre></div>
              <div><h3>Proposed (editable)</h3>
                <textarea rows={18} spellcheck={false} value={draft} onInput={(e) => setDraft((e.target as HTMLTextAreaElement).value)} aria-label="Proposed entry JSON" />
              </div>
            </div>
            <div class="btn-row">
              <button class="btn btn-quiet" onClick={() => { try { void act('save', item.id, { draft: JSON.parse(draft) }); } catch { setMsg({ kind: 'error', text: 'The draft is not valid JSON.' }); } }}>Save draft</button>
              <button class="btn btn-primary" onClick={() => { try { void act('approve', item.id, { draft: JSON.parse(draft) }); } catch { setMsg({ kind: 'error', text: 'The draft is not valid JSON.' }); } }}>Approve & publish</button>
              <button class="btn btn-quiet" onClick={() => void act('verify', item.id)}>Needs more verification</button>
              <button class="btn btn-quiet" onClick={() => void act('dismiss', item.id)}>Dismiss</button>
            </div>
            <p class="small muted">Approving checks the draft against the guide's rules (sources, spoiler fields) and keeps the entry id, so players' saved ticks stay attached.</p>
          </section>
        )}
      </div>
      <section class="panel">
        <h2>Change history</h2>
        <ul class="ctx-list">
          {[...data.history].reverse().map((h) => (
            <li key={h.id}><span>{h.at.slice(0, 16).replace('T', ' ')} · {h.after ? `published ${h.entryId} v${h.after.version}` : `removed change to ${h.entryId}`}{h.undoneAt ? ' · undone' : ''}</span>
              {!h.undoneAt && h.after && <button class="btn btn-quiet" onClick={() => void act('undo', h.id)}>Undo</button>}</li>
          ))}
          {!data.history.length && <li class="small muted">No changes published yet.</li>}
        </ul>
      </section>
    </div>
  );
}
