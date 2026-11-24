import type { APIRoute } from 'astro';
import { games, mapData } from '../../../lib/content/load';

/** Map pins (verified-location kinds only) and categories, for the map page. Built at deploy time from the local snapshot. */
export function getStaticPaths() {
  return games.filter((g) => mapData(g.id)).map((g) => ({ params: { game: g.id } }));
}
export const GET: APIRoute = ({ params }) => new Response(JSON.stringify(mapData(params.game!)), { headers: { 'content-type': 'application/json' } });
