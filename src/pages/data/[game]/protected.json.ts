import type { APIRoute } from 'astro';
import { games, protectedText } from '../../../lib/content/load';

/** Spoiler text, fetched only when someone reveals it or picks a spoiler mode that shows it. */
export function getStaticPaths() {
  return games.map((g) => ({ params: { game: g.id } }));
}
export const GET: APIRoute = ({ params }) =>
  new Response(JSON.stringify(protectedText(params.game!)), { headers: { 'content-type': 'application/json' } });
