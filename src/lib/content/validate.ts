import { z } from 'zod';
import { Entry, Game, Objective, Platform, Video, type Entry as EntryT, type Objective as Obj, type Video as VideoT } from './schema';

export interface GameBundle {
  game: Game;
  objectives: Obj[];
  entries: EntryT[];
  videos: VideoT[];
}

const PUBLISHABLE = new Set(['official_confirmed', 'independently_verified']);

/** Shown on the public site: approved and adequately verified. */
export function isPublishable(o: Pick<Obj, 'publicationStatus' | 'verificationStatus'>): boolean {
  return o.publicationStatus === 'approved' && PUBLISHABLE.has(o.verificationStatus);
}

/**
 * Parse and cross-check one game's content. Throws one error listing every problem, so a bad
 * file fails the build instead of reaching the site.
 */
export function validateGameBundle(
  rawGame: unknown, rawObjectives: unknown, platforms: Platform[], rawEntries: unknown = [], rawVideos: unknown = [],
): GameBundle {
  const problems: string[] = [];
  const g = Game.safeParse(rawGame);
  const os = z.array(Objective).safeParse(rawObjectives);
  const gs = z.array(Entry).safeParse(rawEntries);
  const vs = z.array(Video).safeParse(rawVideos);
  const issues = (name: string, r: { success: boolean; error?: z.ZodError }) =>
    r.success ? [] : r.error!.issues.map((i) => `${name}.${i.path.join('.')}: ${i.message}`);
  problems.push(...issues('game', g), ...issues('objectives', os), ...issues('entries', gs), ...issues('videos', vs));
  if (!g.success || !os.success || !gs.success || !vs.success) throw new Error(problems.join('\n'));

  const game = g.data;
  const objectives = os.data;
  const entries = gs.data;
  const videos = vs.data;
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

  const videoIds = new Set<string>();
  for (const v of videos) {
    if (videoIds.has(v.id)) problems.push(`video ${v.id}: duplicate id`);
    videoIds.add(v.id);
  }
  const guideCats = new Set(game.guideCategories.map((c) => c.id));
  const slugs = new Set<string>();
  for (const e of entries) {
    const at = `entry ${e.id}`;
    if (seen.has(e.id)) problems.push(`${at}: duplicate id`);
    seen.add(e.id);
    if (e.id !== `${game.id}:entry:${e.slug}`) problems.push(`${at}: id must be "${game.id}:entry:${e.slug}"`);
    if (e.gameId !== game.id) problems.push(`${at}: gameId ${e.gameId} is not ${game.id}`);
    if (slugs.has(e.slug)) problems.push(`${at}: duplicate slug`);
    slugs.add(e.slug);
    if (!guideCats.has(e.category)) problems.push(`${at}: unknown guide section ${e.category}`);
    for (const v of e.videoIds) if (!videoIds.has(v)) problems.push(`${at}: unknown video ${v}`);
    for (const o of e.objectiveIds) if (!objectives.some((x) => x.id === o)) problems.push(`${at}: unknown objective ${o}`);
    if (e.spoilerLevel !== 'none' && !e.details)
      problems.push(`${at}: spoilerLevel ${e.spoilerLevel} needs "details" (keep title/summary/steps spoiler-free)`);
    if (e.spoilerLevel === 'none' && e.details)
      problems.push(`${at}: "details" is only for spoiler content; set spoilerLevel to minor or major, or move it into steps`);
    if (e.details) {
      const safe = `${e.title} ${e.summary} ${e.steps.join(' ')}`.toLowerCase();
      if (safe.includes(e.details.summary.toLowerCase().slice(0, 40)))
        problems.push(`${at}: spoiler details are repeated in the spoiler-free fields`);
    }
    if (e.verification === 'rumor' && /\bconfirmed\b/i.test(`${e.title} ${e.summary}`))
      problems.push(`${at}: a rumor can't call itself confirmed`);
  }

  if (problems.length) throw new Error(`Content problems in ${game.id}:\n` + problems.join('\n'));
  return { game, objectives, entries, videos };
}
