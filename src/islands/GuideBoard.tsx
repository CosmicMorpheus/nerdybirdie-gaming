import { contextKey } from '../lib/progress/model';
import { tally } from '../lib/progress/totals';
import { GUIDES_CONTEXT } from './Hud';
import { useProgress } from './useProgress';

interface Props { gameId: string; base: string; categories: { id: string; label: string; blurb: string; entryIds: string[] }[] }

/** Guide sections as a quest board, with your progress in each. */
export default function GuideBoard({ gameId, base, categories }: Props) {
  const { progress, ready } = useProgress();
  const done = progress.contexts[contextKey(gameId, GUIDES_CONTEXT)]?.completed ?? {};
  return (
    <ul class="board">
      {categories.map((c) => {
        const t = tally(c.entryIds, done);
        return (
          <li key={c.id} class={`quest${c.entryIds.length ? '' : ' locked'}`}>
            <a href={`${base}${c.id}/`} class="quest-link">
              <header>
                <h2>{c.label}</h2>
                {c.entryIds.length === 0 ? <span class="badge-px">Coming soon</span>
                  : t.percent === 100 ? <span class="stamp">Cleared</span>
                  : <span class="badge-px">{ready ? `${t.done}/${t.total}` : '…'}</span>}
              </header>
              <p class="small muted">{c.blurb}</p>
              {c.entryIds.length > 0 && <span class="bar" aria-hidden="true"><i style={{ width: `${t.percent ?? 0}%` }} /></span>}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
