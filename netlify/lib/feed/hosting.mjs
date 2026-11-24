import { registry } from './source.mjs';
import { approvedCreators } from './creators.mjs';

export function stagingContext(context, env) {
  const expected = env.NB_STAGING_SITE_ID;
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(expected || '') ||
      context.site?.id !== expected) throw new Error('Select the dedicated staging project.');
}
// Channels come from the creators file. NB_YOUTUBE_CHANNEL_IDS (optional) overrides it, e.g. for a one-channel test.
export function settings(env, creators = approvedCreators()) {
  const override = (env.NB_YOUTUBE_CHANNEL_IDS || '').trim();
  const channels = registry(override || creators.map(c => c.channelId).join(','));
  const handles = Object.fromEntries(creators.map(c => [c.channelId, c.handle]));
  return { channels, handles, apiKey: env.NB_YOUTUBE_KEY, limit: Number(env.NB_UPLOAD_LIMIT || '12') };
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
