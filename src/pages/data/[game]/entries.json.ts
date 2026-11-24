import type { APIRoute } from 'astro';
import { games, publicEntries } from '../../../lib/content/load';
/** Published entries (no spoiler details), for the editor's side-by-side review view. */
export function getStaticPaths() { return games.map((g) => ({ params: { game: g.id } })); }
export const GET: APIRoute = ({ params }) => new Response(JSON.stringify(publicEntries(params.game!)), { headers: { 'content-type': 'application/json' } });
