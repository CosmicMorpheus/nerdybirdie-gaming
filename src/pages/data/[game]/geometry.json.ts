import type { APIRoute } from 'astro';
import { games } from '../../../lib/content/load';
import { USING_FIXTURES } from '../../../lib/content/load';

const real = import.meta.glob('/content/games/*/map/geometry.json', { eager: true, import: 'default' });
const fixture = import.meta.glob('/content/fixtures/games/*/map/geometry.json', { eager: true, import: 'default' });
const src = USING_FIXTURES ? fixture : real;
const find = (id: string) => Object.entries(src).find(([p]) => p.includes(`/games/${id}/map/`))?.[1];

/** Coastline, main roads and district labels for drawing our own map (CC BY 4.0 geometry; see map credits). */
export function getStaticPaths() {
  return games.filter((g) => find(g.id)).map((g) => ({ params: { game: g.id } }));
}
export const GET: APIRoute = ({ params }) => new Response(JSON.stringify(find(params.game!)), { headers: { 'content-type': 'application/json' } });
