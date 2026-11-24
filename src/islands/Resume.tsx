import { contextKey } from '../lib/progress/model';
import { formatTally, tally } from '../lib/progress/totals';
import { useProgress } from './useProgress';

interface Props { gameId: string; gameShortTitle: string; href: string; platforms: { id: string; shortLabel: string; objectiveNoun: string; objectiveIds: string[] }[] }

/** Home-page "pick up where you left off" panel for one game. */
export default function Resume({ gameId, gameShortTitle, href, platforms }: Props) {
  const { progress, ready } = useProgress();
  const chosen = progress.prefs.platformByGame[gameId];
  const ordered = [...platforms].sort((a, b) => (a.id === chosen ? -1 : b.id === chosen ? 1 : 0));
  return (
    <div class="resume-rows">
      {ordered.map((p) => {
        const t = tally(p.objectiveIds, progress.contexts[contextKey(gameId, p.id)]?.completed ?? {});
        return (
          <a key={p.id} class="meter" href={href}>
            <span class="m-label">{gameShortTitle} · {p.shortLabel} {p.objectiveNoun.toLowerCase()}</span>
            <span class="m-val">{ready ? formatTally(t) : '…'}</span>
            <span class="bar" aria-hidden="true"><i style={{ width: `${t.percent ?? 0}%` }} /></span>
          </a>
        );
      })}
    </div>
  );
}
