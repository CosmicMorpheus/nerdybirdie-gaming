import { publicFeed } from '../lib/feed/daily.mjs';
import { stagingStore } from '../lib/feed/netlify-store.mjs';
import { registry, CATEGORIES } from '../lib/feed/source.mjs';

export default async function feed(request, context) {
  const privateHeaders = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex',
    'X-Content-Type-Options': 'nosniff' };
  if (request.method !== 'GET') return new Response(null, { status: 405, headers: { ...privateHeaders, Allow: 'GET' } });
  // Not set up yet (no staging id or no approved channel): 404, which the page shows as "daily checks haven't started".
  if (!process.env.NB_STAGING_SITE_ID || !process.env.NB_YOUTUBE_CHANNEL_IDS) return new Response(null, { status: 404, headers: privateHeaders });
  const query = new URL(request.url).searchParams;
  const category = query.get('category');
  if (category !== null && !CATEGORIES.includes(category)) return new Response(null, { status: 400, headers: privateHeaders });
  try {
    const store = stagingStore(context);
    const channels = registry(process.env.NB_YOUTUBE_CHANNEL_IDS);
    const data = publicFeed(await store.read(), { reveal: query.get('reveal') === '1', category, channels });
    return Response.json(data, { headers: privateHeaders });
  } catch {
    return Response.json({ error: 'The discovery feed is temporarily unavailable.' }, { status: 503, headers: privateHeaders });
  }
}
