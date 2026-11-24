import { z } from 'zod';
import { Game, Guide, Objective, Platform, Video, type Guide as GuideT, type Objective as Obj, type Video as VideoT } from './schema';

export interface GameBundle {
  game: Game;
  objectives: Obj[];
  guides: GuideT[];
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
  rawGame: unknown, rawObjectives: unknown, platforms: Platform[], rawGuides: unknown = [], rawVideos: unknown = [],
): GameBundle {
  const problems: string[] = [];
  const g = Game.safeParse(rawGame);
  const os = z.array(Objective).safeParse(rawObjectives);
  const gs = z.array(Guide).safeParse(rawGuides);
  const vs = z.array(Video).safeParse(rawVideos);
  const issues = (name: string, r: { success: boolean; error?: z.ZodError }) =>
    r.success ? [] : r.error!.issues.map((i) => `${name}.${i.path.join('.')}: ${i.message}`);
  problems.push(...issues('game', g), ...issues('objectives', os), ...issues('guides', gs), ...issues('videos', vs));
  if (!g.success || !os.success || !gs.success || !vs.success) throw new Error(problems.join('\n'));

  const game = g.data;
  const objectives = os.data;
  const guides = gs.data;
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
  const guideSlugs = new Set<string>();
  for (const gd of guides) {
    const at = `guide ${gd.id}`;
    if (seen.has(gd.id)) problems.push(`${at}: duplicate id`);
    seen.add(gd.id);
    if (gd.id !== `${game.id}:guide:${gd.slug}`) problems.push(`${at}: id must be "${game.id}:guide:${gd.slug}"`);
    if (gd.gameId !== game.id) problems.push(`${at}: gameId ${gd.gameId} is not ${game.id}`);
    if (guideSlugs.has(gd.slug)) problems.push(`${at}: duplicate slug`);
    guideSlugs.add(gd.slug);
    if (!guideCats.has(gd.category)) problems.push(`${at}: unknown guide category ${gd.category}`);
    for (const p of gd.platformIds) if (!gamePlatforms.has(p)) problems.push(`${at}: platform ${p} is not supported by ${game.id}`);
    for (const s of gd.sourceIds) if (!sourceIds.has(s)) problems.push(`${at}: unknown source ${s}`);
    for (const o of gd.objectiveIds) if (!objectives.some((x) => x.id === o)) problems.push(`${at}: unknown objective ${o}`);
    if (gd.publicationStatus === 'approved' && !gd.checkedAt) problems.push(`${at}: approved guides need a checkedAt date`);
    for (const st of gd.steps) {
      const sat = `${at} step ${st.id}`;
      if (seen.has(st.id)) problems.push(`${sat}: duplicate id`);
      seen.add(st.id);
      if (!st.id.startsWith(`${gd.id}:`)) problems.push(`${sat}: step ids must start with "${gd.id}:"`);
      for (const s of st.sourceIds) if (!sourceIds.has(s)) problems.push(`${sat}: unknown source ${s}`);
      if (st.videoId && !videoIds.has(st.videoId)) problems.push(`${sat}: unknown video ${st.videoId}`);
      if (st.spoilerLevel !== 'none' && !st.protected) problems.push(`${sat}: spoilerLevel ${st.spoilerLevel} needs "protected" text`);
      if (st.protected && `${st.title} ${st.body}`.toLowerCase().includes(st.protected.title.toLowerCase()))
        problems.push(`${sat}: safe title/body contains the protected title`);
    }
  }

  if (problems.length) throw new Error(`Content problems in ${game.id}:\n` + problems.join('\n'));
  return { game, objectives, guides, videos };
}
