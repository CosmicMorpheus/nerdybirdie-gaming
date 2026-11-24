import type { APIRoute } from 'astro';
import { games, mapChecklist } from '../../../lib/content/load';

/** Per-category trackable pin ids for checklists (much smaller than the full map). */
export function getStaticPaths() { return games.filter((g) => mapChecklist(g.id)).map((g) => ({ params: { game: g.id } })); }
export const GET: APIRoute = ({ params }) => new Response(JSON.stringify(mapChecklist(params.game!)), { headers: { 'content-type': 'application/json' } });
