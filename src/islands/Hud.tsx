import { contextKey } from '../lib/progress/model';
import { CHECKPOINTS, nextRank, rankFor } from '../lib/progress/ranks';
import { tally } from '../lib/progress/totals';
import { useEffect, useState } from 'preact/hooks';
import { useProgress } from './useProgress';
import './tracker.css';

interface Props {
  gameId: string;
  platforms: { id: string; shortLabel: string; objectiveNoun: string; objectiveIds: string[] }[];
  guideEntryIds: string[];
  /** Number of trackable map pins (the map's own denominator). */
  mapTotal: number;
  mapHref: string;
  trackerHref: string;
  guidesHref: string;
}
import { GUIDES_CONTEXT, MAP_CONTEXT } from '../lib/progress/contexts';

/** "Player 1" status: rank, level, XP bar and checkpoints for one game. Everything counted is verified content only. */
export default function Hud({ gameId, platforms, guideEntryIds, trackerHref, guidesHref, mapTotal, mapHref }: Props) {
  const { progress, ready } = useProgress();
  const platform = platforms.find((p) => p.id === progress.prefs.platformByGame[gameId]) ?? platforms[0]!;
  const ach = tally(platform.objectiveIds, progress.contexts[contextKey(gameId, platform.id)]?.completed ?? {});
  const gd = tally(guideEntryIds, progress.contexts[contextKey(gameId, GUIDES_CONTEXT)]?.completed ?? {});
  const all = tally([...platform.objectiveIds, ...guideEntryIds], {
    ...(progress.contexts[contextKey(gameId, platform.id)]?.completed ?? {}),
    ...(progress.contexts[contextKey(gameId, GUIDES_CONTEXT)]?.completed ?? {}),
  });
  const mapDoneMap = progress.contexts[contextKey(gameId, MAP_CONTEXT)]?.completed ?? {};
  const hasMapFinds = Object.keys(mapDoneMap).length > 0;
  const [mapIds, setMapIds] = useState<string[] | null>(null);
  useEffect(() => {
    if (hasMapFinds && !mapIds) fetch(`/data/${gameId}/map-checklist.json`).then((r) => (r.ok ? r.json() : null)).then((c: { ids: string[] }[] | null) => c && setMapIds(c.flatMap((x) => x.ids))).catch(() => {});
  }, [hasMapFinds]);
  const mp = mapIds ? tally(mapIds, mapDoneMap) : { done: 0, total: mapTotal, percent: mapTotal ? 0 : null };
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
        <div class="hud-lv">
          <span class="sr-only">{rank ? `Level ${rank.level}` : 'No level yet'}</span>
          <span class="hud-label" aria-hidden="true">LV</span><span class="pixel" aria-hidden="true">{rank ? rank.level : '–'}</span>
        </div>
      </div>
      <div class="hud-xp">
        <p class="hud-label hud-scope">Your checklist on this site</p>
        <div class="bar" role="progressbar" aria-label="Checklist progress (achievements and guide entries on this site)" aria-valuemin={0} aria-valuemax={all.total} aria-valuenow={all.done}>
          <i style={{ width: `${all.percent ?? 0}%` }} />
        </div>
        <p class="small muted">
          {all.percent === null ? 'Lists unlock here as they are verified. Your progress stays on this device.'
            : next ? `${all.done} of ${all.total} checked off · ${next.min - all.percent}% to ${next.title}` : `All ${all.total} checked off`}
          {all.percent !== null && <><br />Counts the achievements and guide entries we've published so far, not the game's own 100%.</>}
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
        {meter('Guide entries', gd, guidesHref)}
        {meter('Map finds (counted separately)', mp, mapHref)}
      </div>
    </div>
  );
}
