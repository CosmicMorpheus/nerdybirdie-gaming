import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { search, type SearchDoc } from '../lib/search';
import './tracker.css';

/** Site search over a spoiler-safe index (titles and safe summaries only). */
export default function SiteSearch({ indexUrl }: { indexUrl: string }) {
  const [docs, setDocs] = useState<SearchDoc[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initial = new URLSearchParams(location.search).get('q') ?? '';
    setQ(initial);
    input.current?.focus();
    fetch(indexUrl).then((r) => (r.ok ? r.json() : Promise.reject())).then(setDocs).catch(() => setFailed(true));
  }, []);

  const results = useMemo(() => (docs ? search(docs, q, 30) : []), [docs, q]);

  return (
    <div class="tracker">
      <form role="search" onSubmit={(e) => e.preventDefault()}>
        <label class="search-field">
          <span class="sr-only">Search the site</span>
          <input ref={input} type="search" value={q} placeholder="Search guides and trackers"
            onInput={(e) => {
              const v = (e.target as HTMLInputElement).value;
              setQ(v);
              history.replaceState(null, '', v ? `?q=${encodeURIComponent(v)}` : location.pathname);
            }} />
        </label>
      </form>
      {failed && <p class="notice error">Search couldn't load. Check your connection and reload.</p>}
      <p class="sr-only" aria-live="polite">{q.trim() ? `${results.length} results` : ''}</p>
      {q.trim() && docs && (results.length ? (
        <ul class="results">
          {results.map((r) => (
            <li key={r.id}><a href={r.url}><span class="tag">{r.kind}</span> <strong>{r.title}</strong></a><p class="muted small">{r.text}</p></li>
          ))}
        </ul>
      ) : <p class="empty">No results for “{q}”. Results only cover what's verified and published so far.</p>)}
    </div>
  );
}
