import type { APIRoute } from 'astro';
import { games, mapData } from '../../../lib/content/load';
import crossref from '../../../../content/games/gta-vi/map/crossref-ign.json';

/** Robbery map categories, in the order the Robberies page shows them. */
export const ROBBERY_KINDS = ['gang', 'smash', 'store', 'bank', 'payday'] as const;

/**
 * Every robbery spot on the map (illegal operations, smash 'n' grabs, stick-ups, banks, payday loans), for the
 * checklist on the Robberies page. Same pin ids as the map, so a tick in either place counts in both. Spoiler-safe:
 * mapData() has already removed spoiler notes.
 */
export function getStaticPaths() { return games.filter((g) => mapData(g.id)).map((g) => ({ params: { game: g.id } })); }
export const GET: APIRoute = ({ params }) => {
  const m = mapData(params.game!)!;
  const matches = (params.game === 'gta-vi' ? crossref.matches : {}) as Record<string, unknown>;
  const categories = ROBBERY_KINDS.map((k) => m.categories.find((c) => c.id === k && c.trackable)).filter((c) => !!c).map((c) => ({
    id: c.id, label: c.label, colour: c.colour,
    // The map files two plain ATMs under banks; they aren't robbery spots.
    pins: m.pins.filter((p) => p.kind === c.id && p.trackable && p.type !== 'ATM').map((p) => ({ id: p.id, src: p.src, name: p.name, area: p.area, note: p.note, ign: p.src in matches })),
  })).filter((c) => c.pins.length);
  return new Response(JSON.stringify({ categories, ignSource: params.game === 'gta-vi' ? crossref.source : null, mapSource: m.provenance.source }), { headers: { 'content-type': 'application/json' } });
};
