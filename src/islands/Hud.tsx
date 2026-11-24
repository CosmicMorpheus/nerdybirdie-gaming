import { contextKey } from '../lib/progress/model';
import { CHECKPOINTS, nextRank, rankFor } from '../lib/progress/ranks';
import { tally } from '../lib/progress/totals';
import { useProgress } from './useProgress';
import './tracker.css';

interface Props {
  gameId: string;
  platforms: { id: string; shortLabel: string; objectiveNoun: string; objectiveIds: string[] }[];
  guideStepIds: string[];
  trackerHref: string;
  guidesHref: string;
}
export const GUIDES_CONTEXT = 'guides';

/** "Player 1" status: rank, level, XP bar and checkpoints for one game. Everything counted is verified content only. */
export default function Hud({ gameId, platforms, guideStepIds, trackerHref, guidesHref }: Props) {
  const { progress, ready } = useProgress();
  const platform = platforms.find((p) => p.id === progress.prefs.platformByGame[gameId]) ?? platforms[0]!;
  const ach = tally(platform.objectiveIds, progress.contexts[contextKey(gameId, platform.id)]?.completed ?? {});
  const gd = tally(guideStepIds, progress.contexts[contextKey(gameId, GUIDES_CONTEXT)]?.completed ?? {});
  const all = tally([...platform.objectiveIds, ...guideStepIds], {
    ...(progress.contexts[contextKey(gameId, platform.id)]?.completed ?? {}),
    ...(progress.contexts[contextKey(gameId, GUIDES_CONTEXT)]?.completed ?? {}),
  });
  const rank = rankFor(all.percent);
  const next = nextRank(all.percent);
  const meter = (label: string, t: typeof ach, href: string) => (
    <a class="hud-meter" href={href}>
      <span class="hud-label">{label}</span>
      <span class="hud-val">{!ready ? '…' : t.percent === null ? 'Coming soon' : `${t.done}/${t.total}`}</span>
      <span class="bar" aria-hidden="true"><i style={{ width: `${t.percent ?? 0}%` }} /></span>
    </a>
  );
  return (
    <div class="hud">
      <div class="hud-top">
        <div>
          <p class="hud-label">Player 1 · {platform.shortLabel}</p>
          <p class="hud-rank">{rank ? rank.title : 'Ready to start'}</p>
        </div>
        <div class="hud-lv" aria-label={rank ? `Level ${rank.level}` : 'No level yet'}>
          <span class="hud-label">LV</span><span class="pixel">{rank ? rank.level : '–'}</span>
        </div>
      </div>
      <div class="hud-xp">
        <div class="bar" role="progressbar" aria-label="Overall completion" aria-valuemin={0} aria-valuemax={all.total} aria-valuenow={all.done}>
          <i style={{ width: `${all.percent ?? 0}%` }} />
        </div>
        <p class="small muted">
          {all.percent === null ? 'Lists unlock here as they are verified. Your progress stays on this device.'
            : next ? `${all.percent}% complete · ${next.min - all.percent}% to ${next.title}` : `${all.percent}% complete · You did it!`}
        </p>
      </div>
      <ul class="hud-cps" aria-label="Checkpoints">
        {CHECKPOINTS.map((c) => (
          <li key={c} class={`badge-px${all.percent !== null && all.percent >= c ? ' on' : ''}`}>
            {all.percent !== null && all.percent >= c ? '★' : '☆'} {c}%
          </li>
        ))}
      </ul>
      <div class="hud-meters">
        {meter(`${platform.objectiveNoun}`, ach, trackerHref)}
        {meter('Guide steps', gd, guidesHref)}
      </div>
    </div>
  );
}
