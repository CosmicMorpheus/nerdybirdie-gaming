import { useEffect, useRef, useState } from 'preact/hooks';
import { answerFromGuide, type AskAction, type AskDoc } from '../lib/ask/retrieve';
import type { AskResult } from '../lib/ask/engine';
import { modeAllows } from '../lib/spoilers';
import { ASK_SERVER } from '../config';
import { useProgress } from './useProgress';
import './ask.css';

const NAME = 'ASK "COZMC"';
interface Props { gameId: string; greeting: string; discord: string }
type Msg = { role: 'player'; text: string } | { role: 'ask'; result: AskResult; offline?: boolean };

/**
 * ASK "COZMC": free guide assistant. Searches our published guide first (on the server, with approved corrections);
 * only the missing part goes to outside sources. If the server can't be reached it still answers from our guide.
 */
export default function AskCozmc({ gameId, greeting, discord }: Props) {
  const { progress } = useProgress();
  const mode = progress.prefs.spoilerMode;
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [secrets, setSecrets] = useState<Record<string, { summary: string; steps?: string[] }>>({});
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const fab = useRef<HTMLButtonElement>(null);

  useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 30); }, [open]);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [msgs, busy]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) { setOpen(false); fab.current?.focus(); } };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open]);

  const index = useRef<Promise<{ docs: AskDoc[] }> | null>(null);
  /** Browser-only answer from the published guide. Nothing is sent anywhere. */
  async function localAnswer(question: string, serverDown = false): Promise<AskResult> {
    index.current ??= fetch(`/data/${gameId}/ask-index.json`).then((r) => r.json());
    const idx = await index.current;
    const g = answerFromGuide(question, idx.docs, mode);
    return {
      status: g.coverage === 'answered' ? 'guide' : 'unanswered',
      guide: { coverage: g.coverage, text: g.text, actions: g.actions, spoilerGate: g.spoilerGate, confirms: g.confirms, title: g.top?.doc.title ?? null, sources: g.top?.doc.sources ?? [] },
      outside: null, outsideSpoilerHidden: false, recorded: null,
      notes: serverDown ? [`${NAME} couldn't reach its server, so this answer only uses our guide.`]
        : g.coverage === 'answered' ? [] : ["We don't have a verified answer for that yet. Try different words, or browse the guide and map."],
      community: g.coverage === 'answered' ? null : { label: 'Ask in the COZMC Discord', href: discord },
    };
  }

  async function send(e: Event) {
    e.preventDefault();
    const question = q.trim();
    if (question.length < 3 || busy) return;
    setMsgs((m) => [...m, { role: 'player', text: question }]);
    setQ('');
    setBusy(true);
    let result: AskResult;
    let offline = false;
    if (!ASK_SERVER) {
      result = await localAnswer(question).catch(() => offlineResult());
      setMsgs((m) => [...m, { role: 'ask', result }]);
      setBusy(false);
      return;
    }
    try {
      const r = await fetch('/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question, spoilerMode: mode }), signal: AbortSignal.timeout(45000) });
      if (!r.ok || !r.headers.get('content-type')?.includes('json')) throw new Error(String(r.status));
      result = await r.json();
    } catch {
      offline = true;
      result = await localAnswer(question, true).catch(() => offlineResult());
    }
    setMsgs((m) => [...m, { role: 'ask', result, offline }]);
    setBusy(false);
  }

  function offlineResult(): AskResult {
    return { status: 'unanswered', guide: { coverage: 'none', text: '', actions: [], spoilerGate: null, confirms: [], title: null, sources: [] },
      outside: null, outsideSpoilerHidden: false, recorded: null, notes: [`${NAME} couldn't load the guide. Check your connection and try again.`], community: { label: 'Ask in the COZMC Discord', href: discord } };
  }

  async function reveal(id: string) {
    if (!secrets[id]) {
      const [base, extra] = await Promise.all([
        fetch(`/data/${gameId}/protected.json`).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
        ASK_SERVER ? fetch('/api/guide-overrides?protected=1').then((r) => (r.ok && r.headers.get('content-type')?.includes('json') ? r.json() : {})).catch(() => ({})) : Promise.resolve({}),
      ]);
      setSecrets((s) => ({ ...s, ...base, ...extra }));
    }
    setRevealed((r) => new Set(r).add(id));
  }

  const Action = ({ a }: { a: AskAction }) => (
    <a class={`ask-act ask-${a.kind}`} href={a.href} {...(a.kind === 'video' || a.kind === 'discord' ? { target: '_blank', rel: 'noopener' } : {})}>{a.label} →</a>
  );

  return (
    <>
      <button ref={fab} type="button" class="ask-fab" aria-expanded={open} aria-controls="ask-panel" onClick={() => setOpen(!open)}>
        <span aria-hidden="true">?</span> {NAME}
      </button>
      {open && (
        <section id="ask-panel" class="ask-panel" role="dialog" aria-label={NAME}>
          <header class="ask-head">
            <h2>{NAME}<small>GTA VI guide helper</small></h2>
            <span class="ask-mode">Spoilers: {mode === 'safe' ? 'off' : mode === 'minor' ? 'minor' : 'all'}</span>
            <button type="button" class="ask-close" aria-label={`Close ${NAME}`} onClick={() => { setOpen(false); fab.current?.focus(); }}>✕</button>
          </header>
          <div class="ask-log" ref={log} aria-live="polite">
            <p class="ask-bubble ask-from">{greeting}</p>
            {msgs.map((m, i) => m.role === 'player' ? <p key={i} class="ask-bubble ask-me">{m.text}</p> : (
              <div key={i} class="ask-bubble ask-from">
                {m.result.guide.text && (
                  <div class="ask-part">
                    <p class="ask-label">From our guide</p>
                    <p>{m.result.guide.text}</p>
                    {m.result.guide.spoilerGate && (revealed.has(m.result.guide.spoilerGate.id) && secrets[m.result.guide.spoilerGate.id]
                      ? <p class="ask-spoiler">{secrets[m.result.guide.spoilerGate.id]!.summary}</p>
                      : <button type="button" class="ask-reveal" onClick={() => void reveal(m.result.guide.spoilerGate!.id)}>
                          This has a {m.result.guide.spoilerGate.level === 'major' ? 'major' : 'mild'} story detail. Reveal it?
                        </button>)}
                    {m.result.guide.actions.length > 0 && (!m.result.guide.spoilerGate || revealed.has(m.result.guide.spoilerGate.id)) &&
                      <p class="ask-acts">{m.result.guide.actions.map((a) => <Action a={a} />)}</p>}
                  </div>
                )}
                {m.result.outside && (
                  <div class="ask-part ask-outside">
                    <p class="ask-label">What outside sources report{m.result.outside.cached ? ' (from a recent check)' : ''}</p>
                    <p>{m.result.outside.answer}</p>
                    {m.result.outside.spoilerDetail && (modeAllows(m.result.outside.spoilerLevel, mode) || revealed.has(`o${i}`)
                      ? <p class="ask-spoiler">{m.result.outside.spoilerDetail}</p>
                      : <button type="button" class="ask-reveal" onClick={() => setRevealed((r) => new Set(r).add(`o${i}`))}>This involves a story detail. Reveal it?</button>)}
                    {m.result.outside.disagreements.length > 0 && <ul class="ask-warn">{m.result.outside.disagreements.map((d) => <li>Sources disagree: {d}</li>)}</ul>}
                    {m.result.outside.uncertain.length > 0 && <ul class="ask-unsure">{m.result.outside.uncertain.map((d) => <li>Not confirmed: {d}</li>)}</ul>}
                    <ul class="ask-sources">
                      {m.result.outside.sources.map((s) => <li><a href={s.url} target="_blank" rel="noopener">{s.title}</a> · {s.publisher}{s.creator ? ` (by ${s.creator})` : ''}</li>)}
                    </ul>
                    <p class="ask-fine">Not yet checked by our guide team.</p>
                  </div>
                )}
                {!m.result.guide.text && !m.result.outside && <p>We don't have a reliable answer for that yet.</p>}
                {m.result.notes.map((n) => <p class="ask-note">{n}</p>)}
                {m.result.community && <p class="ask-acts"><a class="ask-act ask-discord" href={m.result.community.href} target="_blank" rel="noopener">{m.result.community.label} →</a></p>}
              </div>
            ))}
            {busy && <p class="ask-bubble ask-from ask-busy">Searching our guide…</p>}
          </div>
          <form class="ask-form" onSubmit={send}>
            <label class="sr-only" for="ask-q">Your question</label>
            <input id="ask-q" ref={input} type="text" maxLength={300} autoComplete="off" placeholder="e.g. Where is the Pricilla Pace card?" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
            <button type="submit" class="btn btn-primary" disabled={busy || q.trim().length < 3}>Ask</button>
          </form>
          <p class="ask-foot">{ASK_SERVER
            ? 'Free, no sign-up. Answers use our guide first; outside sources are labelled. Questions help us improve the guide.'
            : 'Free, no sign-up. Searches our published guide on your device; your questions aren’t sent anywhere. Unofficial fan guide.'}</p>
        </section>
      )}
    </>
  );
}
