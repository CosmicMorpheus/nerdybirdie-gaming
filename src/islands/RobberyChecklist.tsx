import { useEffect, useState } from 'preact/hooks';
import { contextKey, setCompleted } from '../lib/progress/model';
import { tally } from '../lib/progress/totals';
import { MAP_CONTEXT } from '../lib/progress/contexts';
import { useProgress } from './useProgress';
import './tracker.css';
import './robbery.css';

interface Pin { id: string; src: string; name: string; area: string | null; note: string; ign: boolean }
interface Cat { id: string; label: string; colour: string; pins: Pin[] }
interface Data { categories: Cat[]; ignSource: { publisher: string; title: string; url: string; checkedAt: string } | null; mapSource: string }
/** Map notes read "Store type.; Security: Low; Take value: $1,000 - $10,000": tidy the punctuation for display. */
const tidy = (n: string) => n.replace(/\.;\s*/g, '. ').replace(/;\s*/g, ' · ').replace(/\s-\s(?=\$)/g, '–');
interface Props { gameId: string; dataUrl: string; mapHref: string; targets: Record<string, string> }

/**
 * Every robbery spot by type, with the map's colours. Ticks use the map's own record (same pin ids), so finding a spot
 * here or on the map counts in both places and in the map total on the home page.
 */
export default function RobberyChecklist({ gameId, dataUrl, mapHref, targets }: Props) {
  const { progress, update, ready } = useProgress();
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { fetch(dataUrl).then((r) => (r.ok ? r.json() : Promise.reject())).then(setData).catch(() => setFailed(true)); }, []);
  if (failed) return <p class="notice error">The robbery checklist couldn't load. Check your connection.</p>;
  if (!data) return <p class="small muted">Loading the robbery checklist…</p>;
  const key = contextKey(gameId, MAP_CONTEXT);
  const done = progress.contexts[key]?.completed ?? {};
  const all = tally(data.categories.flatMap((c) => c.pins.map((p) => p.id)), done);
  return (
    <section class="panel robbery-list" aria-labelledby="rob-h">
      <div class="rob-head">
        <h2 id="rob-h">Robbery checklist</h2>
        <span class="badge-px">{ready ? `${all.done}/${all.total} done` : '…'}</span>
      </div>
      <p class="small muted">
        Every spot, coloured like the in-game map. Locations are community map data ({data.mapSource}).
        {data.ignSource && <> "IGN lists it too" means <a href={data.ignSource.url} target="_blank" rel="noopener">IGN's guide</a> names the same place.</>} Ticks
        here and on the map are the same.
      </p>
      {data.categories.map((c) => {
        const t = tally(c.pins.map((p) => p.id), done);
        return (
          <details key={c.id} class="rob-cat">
            <summary>
              <i style={{ background: c.colour }} aria-hidden="true" />
              <span class="rob-name">{c.label}{targets[c.id] && <small>{targets[c.id]}</small>}</span>
              <b>{t.percent === 100 ? '★ ' : ''}{t.done}/{t.total}</b>
            </summary>
            <p class="rob-open"><a href={`${mapHref}?c=${c.id}`}>Show all {c.label.toLowerCase()} on the map →</a></p>
            <ul class="rob-pins">
              {c.pins.map((p) => {
                const id = `rob-${p.src}`;
                return (
                  <li key={p.id} class={p.id in done ? 'done' : ''}>
                    <input id={id} type="checkbox" class="check" checked={p.id in done} disabled={!ready}
                      onChange={(e) => update((s) => setCompleted(s, key, p.id, (e.target as HTMLInputElement).checked))} />
                    <div>
                      <label for={id}>{p.name}</label>
                      {p.ign && <span class="tag v-ok">IGN lists it too</span>}
                      {(p.area || p.note) && <p class="small muted">{[p.area, tidy(p.note)].filter(Boolean).join(' · ')}</p>}
                    </div>
                    <a class="rob-map" href={`${mapHref}?pin=${p.src}`} aria-label={`${p.name} on the map`}>Map</a>
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}
    </section>
  );
}
