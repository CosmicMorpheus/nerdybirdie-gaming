import type { APIRoute } from 'astro';
import { games, mapData } from '../../../lib/content/load';
import { EXPLORATION_KINDS, spotData } from '../../../lib/content/spots';

/** Every exploration spot on the map (WAiNK, treasure, meditation, magazines, playlists…), for the Exploration page. */
export function getStaticPaths() { return games.filter((g) => mapData(g.id)).map((g) => ({ params: { game: g.id } })); }
export const GET: APIRoute = ({ params }) => new Response(JSON.stringify(spotData(params.game!, EXPLORATION_KINDS)), { headers: { 'content-type': 'application/json' } });
