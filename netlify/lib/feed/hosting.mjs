import { registry } from './source.mjs';

export function stagingContext(context, env) {
  const expected = env.NB_STAGING_SITE_ID;
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(expected || '') ||
      context.site?.id !== expected) throw new Error('Select the dedicated staging project.');
}
export function settings(env) {
  return { channels: registry(env.NB_YOUTUBE_CHANNEL_IDS), apiKey: env.NB_YOUTUBE_KEY,
    limit: Number(env.NB_UPLOAD_LIMIT || '12') };
}

export function blobAdapter(bucket) {
  const key = 'gta-vi/daily-v1';
  return {
    read: () => bucket.getWithMetadata(key, { type: 'json', consistency: 'strong' }),
    async write(etag, data) {
      const condition = etag ? { onlyIfMatch: etag } : { onlyIfNew: true };
      return (await bucket.setJSON(key, data, condition)).modified;
    }
  };
}
