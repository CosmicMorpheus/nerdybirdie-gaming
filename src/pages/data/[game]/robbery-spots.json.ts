import type { APIRoute } from 'astro';
import { games, mapData } from '../../../lib/content/load';
import { ROBBERY_KINDS, spotData } from '../../../lib/content/spots';

/** Every robbery spot on the map, for the checklist on the Robberies page. */
export function getStaticPaths() { return games.filter((g) => mapData(g.id)).map((g) => ({ params: { game: g.id } })); }
export const GET: APIRoute = ({ params }) => new Response(JSON.stringify(spotData(params.game!, ROBBERY_KINDS)), { headers: { 'content-type': 'application/json' } });
