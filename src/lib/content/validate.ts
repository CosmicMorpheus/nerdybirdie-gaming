import { z } from 'zod';
import { Game, Objective, Platform, type Objective as Obj } from './schema';

export interface GameBundle {
  game: Game;
  objectives: Obj[];
}

const PUBLISHABLE = new Set(['official_confirmed', 'independently_verified']);

/** Shown on the public site: approved and adequately verified. */
export function isPublishable(o: Obj): boolean {
  return o.publicationStatus === 'approved' && PUBLISHABLE.has(o.verificationStatus);
}

/**
 * Parse and cross-check one game's content. Throws one error listing every problem, so a bad
 * file fails the build instead of reaching the site.
 */
export function validateGameBundle(rawGame: unknown, rawObjectives: unknown, platforms: Platform[]): GameBundle {
  const problems: string[] = [];
  const g = Game.safeParse(rawGame);
  const os = z.array(Objective).safeParse(rawObjectives);
  if (!g.success) problems.push(...g.error.issues.map((i) => `game.${i.path.join('.')}: ${i.message}`));
  if (!os.success) problems.push(...os.error.issues.map((i) => `objectives.${i.path.join('.')}: ${i.message}`));
  if (!g.success || !os.success) throw new Error(problems.join('\n'));

  const game = g.data;
  const objectives = os.data;
  const platformIds = new Set(platforms.map((p) => p.id));
  const gamePlatforms = new Set(game.platforms.map((p) => p.platformId));
  const sourceIds = new Set<string>();
  for (const s of game.sources) {
    if (sourceIds.has(s.id)) problems.push(`duplicate source id ${s.id}`);
    sourceIds.add(s.id);
  }
  const categoryIds = new Set(game.categories.map((c) => c.id));
  if (categoryIds.size !== game.categories.length) problems.push('duplicate category id');

  for (const p of game.platforms) {
    if (!platformIds.has(p.platformId)) problems.push(`game platform ${p.platformId} is not in platforms.json`);
    for (const s of p.sourceIds) if (!sourceIds.has(s)) problems.push(`platform ${p.platformId}: unknown source ${s}`);
  }
  for (const s of game.availability.sourceIds) if (!sourceIds.has(s)) problems.push(`availability: unknown source ${s}`);

  const seen = new Set<string>();
  for (const o of objectives) {
    const at = `objective ${o.id}`;
    if (seen.has(o.id)) problems.push(`${at}: duplicate id`);
    seen.add(o.id);
    if (o.gameId !== game.id) problems.push(`${at}: gameId ${o.gameId} is not ${game.id}`);
    if (!o.id.startsWith(`${game.id}:`)) problems.push(`${at}: id must start with "${game.id}:"`);
    if (!categoryIds.has(o.category)) problems.push(`${at}: unknown category ${o.category}`);
    for (const p of o.platformIds) if (!gamePlatforms.has(p)) problems.push(`${at}: platform ${p} is not supported by ${game.id}`);
    for (const s of o.sourceIds) if (!sourceIds.has(s)) problems.push(`${at}: unknown source ${s}`);
    if (o.publicationStatus === 'approved' && (o.sourceIds.length === 0 || !o.checkedAt))
      problems.push(`${at}: approved entries need at least one source and a checkedAt date`);
    if (o.spoilerLevel !== 'none' && !o.protected)
      problems.push(`${at}: spoilerLevel ${o.spoilerLevel} needs "protected" text (the safe fields must stay spoiler-free)`);
    if (o.protected) {
      const safe = `${o.safeTitle} ${o.safeSummary}`.toLowerCase();
      if (safe.includes(o.protected.title.toLowerCase()))
        problems.push(`${at}: safeTitle/safeSummary contains the protected title`);
    }
  }
  if (problems.length) throw new Error(`Content problems in ${game.id}:\n` + problems.join('\n'));
  return { game, objectives };
}
