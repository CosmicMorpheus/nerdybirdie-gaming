import { getStore } from '@netlify/blobs';
import { blobAdapter, stagingContext } from '../netlify/lib/feed/hosting.mjs';
import { rollback, resume } from '../netlify/lib/feed/daily.mjs';

const [action, siteID, rawRevision] = process.argv.slice(2);
if (!['inspect', 'rollback', 'resume'].includes(action)) throw new Error('Choose inspect, rollback or resume.');
stagingContext({ site: { id: siteID } }, process.env);
const token = process.env.NETLIFY_AUTH_TOKEN;
if (!token) throw new Error('Use the authorized operator’s staging credentials.');
const store = blobAdapter(getStore({ name: 'nb-staging-source-feed-v1', siteID, token, consistency: 'strong' }));
if (action !== 'inspect') {
  if (!/^\d+$/.test(rawRevision || '')) throw new Error('Supply the expected revision from inspect.');
  if (action === 'rollback') await rollback(store, Number(rawRevision));
  else await resume(store, Number(rawRevision));
}
const entry = await store.read();
console.log(JSON.stringify({ revision: entry?.data.revision ?? 0, paused: entry?.data.held ?? false,
  recoverableFrom: entry?.data.recovery?.from ?? null, runs: entry?.data.runs || [] }, null, 2));
