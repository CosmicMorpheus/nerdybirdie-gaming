import file from '../../../content/games/gta-vi/creators/youtube.json' with { type: 'json' };
import { CHANNEL } from './source.mjs';

const HANDLE = /^@[A-Za-z0-9._-]{3,30}$/;

/** Approved creators from content/games/gta-vi/creators/youtube.json, checked. Paused creators are left out. */
export function approvedCreators(data = file) {
  const list = Array.isArray(data?.creators) ? data.creators : [];
  for (const c of list) {
    if (!CHANNEL.test(c?.channelId || '') || !HANDLE.test(c?.handle || '') || typeof c?.name !== 'string' || !c.name.trim() ||
        !['approved', 'paused'].includes(c?.status)) throw new Error('Invalid creator record in the creators file.');
  }
  if (new Set(list.map(c => c.channelId)).size !== list.length) throw new Error('Duplicate creator in the creators file.');
  return list.filter(c => c.status === 'approved');
}
