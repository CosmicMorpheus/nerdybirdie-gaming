import platformsJson from '../../../content/platforms.json';
import { Platform, type Game, type Objective, type PublicObjective } from './schema';
import { isPublishable, validateGameBundle, type GameBundle } from './validate';
import { z } from 'zod';

/** True only in the NBG_FIXTURES=1 test build, which uses content/fixtures instead of real content. */
export const USING_FIXTURES: boolean = typeof __NBG_FIXTURES__ !== 'undefined' && __NBG_FIXTURES__;

const real = {
  games: import.meta.glob('/content/games/*/game.json', { eager: true, import: 'default' }),
  objectives: import.meta.glob('/content/games/*/objectives.json', { eager: true, import: 'default' }),
};
const fixture = {
  games: import.meta.glob('/content/fixtures/games/*/game.json', { eager: true, import: 'default' }),
  objectives: import.meta.glob('/content/fixtures/games/*/objectives.json', { eager: true, import: 'default' }),
};

export const platforms: Platform[] = z.array(Platform).parse(platformsJson);

function loadAll(): GameBundle[] {
  const src = USING_FIXTURES ? fixture : real;
  return Object.entries(src.games).map(([path, rawGame]) => {
    const objPath = path.replace(/game\.json$/, 'objectives.json');
    return validateGameBundle(rawGame, src.objectives[objPath] ?? [], platforms);
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
function visible(o: Objective): boolean {
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
    draft: !isPublishable(rest as Objective),
  }));
}

/** Spoiler text, keyed by objective id. Served only from /data/<game>/protected.json. */
export function protectedText(gameId: string): Record<string, { title: string; summary: string }> {
  const b = bundles.find((x) => x.game.id === gameId);
  const out: Record<string, { title: string; summary: string }> = {};
  for (const o of b?.objectives ?? []) if (o.protected && visible(o)) out[o.id] = o.protected;
  return out;
}

export function sourcesFor(game: Game, ids: string[]) {
  return game.sources.filter((s) => ids.includes(s.id));
}
