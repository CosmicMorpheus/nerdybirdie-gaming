import { getStore } from '@netlify/blobs';
import { blobAdapter, stagingContext } from './hosting.mjs';

export function stagingStore(context, env = process.env) {
  stagingContext(context, env);
  return blobAdapter(getStore({ name: 'nb-staging-source-feed-v1', consistency: 'strong' }));
}
