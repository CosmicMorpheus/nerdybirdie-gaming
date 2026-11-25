import crossref from '../../../content/games/gta-vi/map/crossref-ign.json';
import { mapData } from './load';

/**
 * Map spots of the given kinds, for a section checklist (Robberies, Exploration). Same pin ids as the map, so a tick
 * in either place counts in both. Spoiler-safe: mapData() has already removed spoiler notes.
 */
export function spotData(gameId: string, kinds: readonly string[]) {
  const m = mapData(gameId);
  if (!m) return null;
  const matches = (gameId === 'gta-vi' ? crossref.matches : {}) as Record<string, unknown>;
  const categories = kinds.map((k) => m.categories.find((c) => c.id === k && c.trackable)).filter((c) => !!c).map((c) => ({
    id: c.id, label: c.label, colour: c.colour,
    // The map files two plain ATMs under banks; they aren't robbery spots.
    pins: m.pins.filter((p) => p.kind === c.id && p.trackable && p.type !== 'ATM')
      .map((p) => ({ id: p.id, src: p.src, name: p.name, area: p.area, note: p.note, ign: p.src in matches })),
  })).filter((c) => c.pins.length);
  return { categories, ignSource: gameId === 'gta-vi' ? crossref.source : null, mapSource: m.provenance.source };
}

export const ROBBERY_KINDS = ['gang', 'smash', 'store', 'bank', 'payday'] as const;
export const EXPLORATION_KINDS = ['waink', 'treasure', 'meditation', 'magazine', 'playlist', 'flamingo', 'underwater', 'kenton'] as const;
