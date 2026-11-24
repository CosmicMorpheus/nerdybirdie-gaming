import { runDaily, prune } from '../lib/feed/daily.mjs';
import { settings } from '../lib/feed/hosting.mjs';
import { stagingStore } from '../lib/feed/netlify-store.mjs';
import { youtubeReader } from '../lib/feed/source.mjs';

export const config = { schedule: '17 10 * * *' };
export default async function daily(_request, context) {
  if (!process.env.NB_STAGING_SITE_ID) return;
  const store = stagingStore(context);
  // Maintenance also runs when discovery is disabled, paused, or a source is unavailable.
  await prune(store);
  if (process.env.NB_DISCOVERY_ENABLED !== 'true') return;
  const { channels, apiKey, limit } = settings(process.env);
  const run = await runDaily({ store, channels, read: youtubeReader({ apiKey, limit }) });
  console.info('Nerdy Birdie discovery', JSON.stringify(run));
  if (run.outcome === 'incomplete') throw new Error('Source check incomplete. Inspect the run and retry.');
}
