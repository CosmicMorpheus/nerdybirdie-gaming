import platformsJson from '../../../content/platforms.json';
import { Platform, type Game, type Objective, type PublicEntry, type PublicObjective, type Video } from './schema';
import { isPublishable, validateGameBundle, type GameBundle } from './validate';
import { z } from 'zod';

/** True only in the NBG_FIXTURES=1 test build, which uses content/fixtures instead of real content. */
export const USING_FIXTURES: boolean = typeof __NBG_FIXTURES__ !== 'undefined' && __NBG_FIXTURES__;

const real = {
  games: import.meta.glob('/content/games/*/game.json', { eager: true, import: 'default' }),
  objectives: import.meta.glob('/content/games/*/objectives.json', { eager: true, import: 'default' }),
  entries: import.meta.glob('/content/games/*/entries.json', { eager: true, import: 'default' }),
  videos: import.meta.glob('/content/games/*/videos.json', { eager: true, import: 'default' }),
};
const fixture = {
  games: import.meta.glob('/content/fixtures/games/*/game.json', { eager: true, import: 'default' }),
  objectives: import.meta.glob('/content/fixtures/games/*/objectives.json', { eager: true, import: 'default' }),
  entries: import.meta.glob('/content/fixtures/games/*/entries.json', { eager: true, import: 'default' }),
  videos: import.meta.glob('/content/fixtures/games/*/videos.json', { eager: true, import: 'default' }),
};

export const platforms: Platform[] = z.array(Platform).parse(platformsJson);

function loadAll(): GameBundle[] {
  const src = USING_FIXTURES ? fixture : real;
  return Object.entries(src.games).map(([path, rawGame]) => {
    const at = (f: string) => path.replace(/game\.json$/, f);
    return validateGameBundle(rawGame, src.objectives[at('objectives.json')] ?? [], platforms,
      src.entries[at('entries.json')] ?? [], src.videos[at('videos.json')] ?? []);
  });
}

const bundles = loadAll();

export const games: Game[] = bundles.map((b) => b.game);

export function getGame(id: string): Game {
  const g = games.find((x) => x.id === id);
  if (!g) throw new Error(`Unknown game ${id}`);
  return g;
}

export function getPlatform(id: string): Platform {
  const p = platforms.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown platform ${id}`);
  return p;
}

/** Objectives shown on the site. The test build also shows drafts (marked), so their handling can be tested. */
function visible(o: Pick<Objective, 'publicationStatus' | 'verificationStatus'>): boolean {
  if (o.publicationStatus === 'retired') return false;
  return isPublishable(o) || USING_FIXTURES;
}

/** Objectives for the browser, with spoiler text removed. */
export function publicObjectives(gameId: string): PublicObjective[] {
  const b = bundles.find((x) => x.game.id === gameId);
  if (!b) return [];
  return b.objectives.filter(visible).map(({ protected: p, ...rest }) => ({
    ...rest,
    hasProtected: p !== null,
    draft: !isPublishable(rest),
  }));
}

/** Spoiler text for objectives and entries, keyed by id. Served only from /data/<game>/protected.json. */
export function protectedText(gameId: string): Record<string, { title: string; summary: string; steps?: string[] }> {
  const b = bundles.find((x) => x.game.id === gameId);
  const out: Record<string, { title: string; summary: string; steps?: string[] }> = {};
  for (const o of b?.objectives ?? []) if (o.protected && visible(o)) out[o.id] = o.protected;
  for (const e of b?.entries ?? []) if (e.details && entryVisible(e)) out[e.id] = { title: e.title, summary: e.details.summary, steps: e.details.steps };
  return out;
}

/** Published entries; the fixture test build also shows drafts so their handling can be tested. */
function entryVisible(e: { status: string }): boolean {
  return e.status === 'published' || USING_FIXTURES;
}

/** Guide entries for the browser, in file order, with spoiler details removed. */
export function publicEntries(gameId: string): PublicEntry[] {
  const b = bundles.find((x) => x.game.id === gameId);
  return (b?.entries ?? []).filter(entryVisible).map(({ details, ...e }) => ({ ...e, hasDetails: details !== null }));
}

export function videosFor(gameId: string): Video[] {
  return bundles.find((x) => x.game.id === gameId)?.videos.slice() ?? [];
}

export function sourcesFor(game: Game, ids: string[]) {
  return game.sources.filter((s) => ids.includes(s.id));
}
