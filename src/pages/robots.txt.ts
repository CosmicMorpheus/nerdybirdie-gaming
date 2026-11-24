import type { APIRoute } from 'astro';
import { INDEXABLE } from '../config';
import { USING_FIXTURES } from '../lib/content/load';

export const GET: APIRoute = ({ site }) => {
  const open = INDEXABLE && !USING_FIXTURES;
  const lines = open
    ? ['User-agent: *', 'Disallow: /data/', 'Disallow: /search/', ...(site ? [`Sitemap: ${new URL('sitemap-index.xml', site).href}`] : [])]
    : ['User-agent: *', 'Disallow: /'];
  return new Response(lines.join('\n') + '\n', { headers: { 'content-type': 'text/plain' } });
};
