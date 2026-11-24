import { useEffect, useState } from 'preact/hooks';
import { contextKey } from '../lib/progress/model';
import { tally } from '../lib/progress/totals';
import { MAP_CONTEXT } from '../lib/progress/contexts';
import { useProgress } from './useProgress';

interface Props { gameId: string; dataUrl: string; mapHref: string }
type Cat = { id: string; label: string; colour: string; group: string; ids: string[] };

/** Map collectibles by category, using the same completion record as the map. */
export default function MapChecklist({ gameId, dataUrl, mapHref }: Props) {
  const { progress, ready } = useProgress();
  const [data, setData] = useState<Cat[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { fetch(dataUrl).then((r) => (r.ok ? r.json() : Promise.reject())).then(setData).catch(() => setFailed(true)); }, []);
  if (failed) return <p class="notice error">The map checklist couldn't load. Check your connection.</p>;
  if (!data) return <p class="small muted">Loading map checklist…</p>;
  const done = progress.contexts[contextKey(gameId, MAP_CONTEXT)]?.completed ?? {};
  const cats = data;
  const all = tally(cats.flatMap((c) => c.ids), done);
  return (
    <section class="panel map-checklist" id="map-checklist" aria-labelledby="mc-h">
      <div class="mc-head">
        <h2 id="mc-h">Map checklist</h2>
        <span class="badge-px">{ready ? `${all.done}/${all.total} found` : '…'}</span>
      </div>
      <p class="small muted">Every pin is community map data we haven't independently confirmed. Tick finds on the map; they count here too.</p>
      <ul class="mc-list">
        {cats.map((c) => {
          const t = tally(c.ids, done);
          return (
            <li key={c.id}>
              <a href={`${mapHref}?c=${c.id}`}>
                <i style={{ background: c.colour }} aria-hidden="true" />
                <span>{c.label}<small>{c.group}</small></span>
                <b>{t.percent === 100 ? '★ ' : ''}{t.done}/{t.total}</b>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
