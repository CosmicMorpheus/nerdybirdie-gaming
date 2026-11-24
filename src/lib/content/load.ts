import platformsJson from '../../../content/platforms.json';
import { Platform, type Game, type Objective, type PublicEntry, type PublicObjective, type Video } from './schema';
import { isPublishable, validateGameBundle, type GameBundle } from './validate';
import { z } from 'zod';
import { parseVideoUrl, type ParsedVideo } from '../video';
import { SHOW_UNREVIEWED_MEDIA } from '../../config';

/** True only in the NBG_FIXTURES=1 test build, which uses content/fixtures instead of real content. */
export const USING_FIXTURES: boolean = typeof __NBG_FIXTURES__ !== 'undefined' && __NBG_FIXTURES__;

const real = {
  games: import.meta.glob('/content/games/*/game.json', { eager: true, import: 'default' }),
  objectives: import.meta.glob('/content/games/*/objectives.json', { eager: true, import: 'default' }),
  entries: import.meta.glob('/content/games/*/entries.json', { eager: true, import: 'default' }),
  videos: import.meta.glob('/content/games/*/videos.json', { eager: true, import: 'default' }),
  map: import.meta.glob('/content/games/*/map/pins.json', { eager: true, import: 'default' }),
};
const fixture = {
  games: import.meta.glob('/content/fixtures/games/*/game.json', { eager: true, import: 'default' }),
  objectives: import.meta.glob('/content/fixtures/games/*/objectives.json', { eager: true, import: 'default' }),
  entries: import.meta.glob('/content/fixtures/games/*/entries.json', { eager: true, import: 'default' }),
  videos: import.meta.glob('/content/fixtures/games/*/videos.json', { eager: true, import: 'default' }),
  map: import.meta.glob('/content/fixtures/games/*/map/pins.json', { eager: true, import: 'default' }),
};

export const platforms: Platform[] = z.array(Platform).parse(platformsJson);

export interface MapPin { id: string; src: string; kind: string; name: string; type: string; x: number; y: number; area: string | null; region: string | null; note: string; evidence: string; trackable: boolean; exact: boolean; spoiler: 'none' | 'minor' | 'major' }
export interface MapSnapshot {
  provenance: { source: string; author: string; repo: string; revision: string; license: string; licenseUrl: string; credit: string; importedAt: string; checkedAt: string; changes: string };
  categories: { id: string; label: string; colour: string; group: string; trackable: boolean }[];
  pins: MapPin[];
  retired: { id: string; name: string; retiredAt: string }[];
}

function loadAll(): (GameBundle & { map: MapSnapshot | null })[] {
  const src = USING_FIXTURES ? fixture : real;
  return Object.entries(src.games).map(([path, rawGame]) => {
    const at = (f: string) => path.replace(/game\.json$/, f);
    const map = (src.map[at('map/pins.json')] as MapSnapshot | undefined) ?? null;
    return { ...validateGameBundle(rawGame, src.objectives[at('objectives.json')] ?? [], platforms,
      src.entries[at('entries.json')] ?? [], src.videos[at('videos.json')] ?? [], new Set(map?.pins.map((p) => p.id) ?? [])), map };
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
  for (const p of b?.map?.pins ?? []) if (p.exact && p.spoiler !== 'none' && p.note) out[p.id] = { title: p.name, summary: p.note };
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

/** A video as the browser gets it: editor notes removed, provider id parsed, unreviewed flagged. */
export type PublicVideo = Omit<Video, 'notes'> & { parsed: ParsedVideo; unreviewed: boolean };

/** Videos to show: approved ones, plus (on preview builds only) ones still in review, labelled as such. */
export function videosFor(gameId: string): PublicVideo[] {
  return (bundles.find((x) => x.game.id === gameId)?.videos ?? [])
    .filter((v) => v.status === 'approved' || (v.status === 'review' && SHOW_UNREVIEWED_MEDIA))
    .map(({ notes: _n, ...v }) => ({ ...v, parsed: parseVideoUrl(v.url)!, unreviewed: v.status !== 'approved' }));
}

/** Everything in review, for the editor queue page (preview builds only). */
export function reviewQueue(gameId: string) {
  const b = bundles.find((x) => x.game.id === gameId);
  return {
    videos: (b?.videos ?? []).filter((v) => v.status === 'review'),
    draftEntries: (b?.entries ?? []).filter((e) => e.status === 'draft'),
    chancePins: (b?.map?.pins ?? []).filter((p) => !p.exact),
  };
}

/** Map snapshot for the map page. Chance spawns stay out (review queue); places are kept but never counted. */
export function mapData(gameId: string) {
  const m = bundles.find((x) => x.game.id === gameId)?.map;
  if (!m) return null;
  // Spoiler notes are stripped here and served only from protected.json, after a deliberate reveal.
  return { provenance: m.provenance, categories: m.categories, withheld: m.pins.filter((p) => !p.exact).length,
    pins: m.pins.filter((p) => p.exact).map((p) => (p.spoiler === 'none' ? p : { ...p, note: '' })) };
}

export function sourcesFor(game: Game, ids: string[]) {
  return game.sources.filter((s) => ids.includes(s.id));
}

/** The map's completion denominator: trackable pins in trackable categories with an exact location. Filters never change it. */
export function trackablePinIds(gameId: string): string[] {
  const m = mapData(gameId);
  if (!m) return [];
  const cats = new Set(m.categories.filter((c) => c.trackable).map((c) => c.id));
  return m.pins.filter((p) => p.trackable && cats.has(p.kind)).map((p) => p.id);
}

/** Small per-category summary for checklists (ids only), instead of shipping the whole map. */
export function mapChecklist(gameId: string) {
  const m = mapData(gameId);
  if (!m) return null;
  const ids = new Set(trackablePinIds(gameId));
  return m.categories.filter((c) => c.trackable)
    .map((c) => ({ id: c.id, label: c.label, colour: c.colour, group: c.group, ids: m.pins.filter((p) => p.kind === c.id && ids.has(p.id)).map((p) => p.id) }))
    .filter((c) => c.ids.length);
}
