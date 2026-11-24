import { createHash } from 'node:crypto';

export const GAME = 'gta-vi';
export const MAX_UPLOADS = 20;
export const CHANNEL = /^UC[A-Za-z0-9_-]{22}$/;
const VIDEO = /^[A-Za-z0-9_-]{11}$/;
const PLAYLIST = /^[A-Za-z0-9_-]{10,80}$/;
// Title words → this site's guide sections (content/games/gta-vi/game.json guideCategories). Founder-approved mapping,
// docs/PHASE0_DAILY_FEED_AUDIT.md. First match wins, in the kit's original order. Achievements stay "general" until
// our list is verified, and locations stay "general" because a video never adds map coordinates.
const categories = [
  ['walkthrough', /\b(missions?|walkthroughs?)\b/i],
  ['general', /\b(achievements?|troph(?:y|ies))\b/i],
  ['collectibles', /\b(collectibles?|collectables?)\b/i],
  ['vehicles', /\b(vehicles?|cars?|boats?|planes?|motorcycles?)\b/i],
  ['weapons', /\bweapons?\b/i],
  ['general', /\b(locations?|maps?)\b/i],
  ['money', /\b(money|strategies|strategy)\b/i],
  ['secrets', /\b(secrets?|easter eggs?)\b/i],
  ['general', /\b(updates?|patch|trailer|announcement)\b/i],
];
export const CATEGORIES = [...new Set([...categories.map(([key]) => key), 'general'])];
export const REVIEW = 'Needs Community Review';

export function registry(value) {
  const ids = (value || '').split(',').map(id => id.trim()).filter(Boolean);
  if (ids.length < 1 || ids.length > 3 || ids.some(id => !CHANNEL.test(id)) ||
      new Set(ids).size !== ids.length) throw new Error('Configure one to three distinct approved YouTube channel IDs.');
  return ids;
}

const clean = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max &&
  v.trim().length > 0 && !/[<>\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(v);
export function sourceRecord(video, channel, checkedAt) {
  const s = video?.snippet;
  if (!s || !VIDEO.test(video.id || '') || video.status?.privacyStatus !== 'public' ||
      video.status?.uploadStatus !== 'processed' || s.channelId !== channel ||
      !clean(s.title, 150) || !clean(s.channelTitle, 120) ||
      !/\b(?:GTA|Grand Theft Auto)\s*[-:]?\s*(?:VI|6)\b/i.test(s.title) ||
      /https?:|www\.|\b(?:free money|giveaway|generator|leak(?:ed|s)?|crack(?:ed)?|download link)\b/i.test(s.title) ||
      !Number.isFinite(Date.parse(s.publishedAt)) || Date.parse(s.publishedAt) > Date.parse(checkedAt)) return null;
  const category = categories.find(([, pattern]) => pattern.test(s.title))?.[0] || 'general';
  return {
    id: createHash('sha256').update(GAME + ':youtube:' + video.id).digest('hex'),
    videoId: video.id, channel, title: s.title.trim(), creator: s.channelTitle.trim(),
    publishedAt: new Date(s.publishedAt).toISOString(), category,
    checkedAt, gameId: GAME, status: REVIEW, kind: 'source', spoiler: 'hidden'
  };
}

// Endpoint, response fields and input IDs are controlled by the server. No submitted URLs are fetched.
export function youtubeReader({ apiKey, fetchImpl = fetch, limit = MAX_UPLOADS }) {
  if (!apiKey || !Number.isInteger(limit) || limit < 1 || limit > MAX_UPLOADS)
    throw new Error('Missing API key or invalid discovery limit.');
  async function list(endpoint, params, signal) {
    const url = new URL('https://www.googleapis.com/youtube/v3/' + endpoint);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    const res = await fetchImpl(url, { headers: { 'X-Goog-Api-Key': apiKey }, redirect: 'error',
      signal: AbortSignal.any([signal, AbortSignal.timeout(4000)]) });
    if (!res.ok) throw new Error('YouTube returned HTTP ' + res.status);
    const doc = await res.json();
    if (!Array.isArray(doc.items)) throw new Error('Unexpected YouTube response.');
    return doc.items;
  }
  return async (channel, checkedAt, signal) => {
    if (!CHANNEL.test(channel)) throw new Error('Invalid channel ID.');
    const [owner] = await list('channels', { id: channel, part: 'contentDetails',
      fields: 'items(id,contentDetails/relatedPlaylists/uploads)' }, signal);
    const playlist = owner?.contentDetails?.relatedPlaylists?.uploads;
    if (owner?.id !== channel || !PLAYLIST.test(playlist || '')) throw new Error('Uploads unavailable.');
    const uploads = await list('playlistItems', { playlistId: playlist, part: 'contentDetails', maxResults: limit,
      fields: 'items(contentDetails/videoId)' }, signal);
    if (uploads.some(x => !VIDEO.test(x?.contentDetails?.videoId || ''))) throw new Error('Invalid playlist response.');
    const ids = new Set(uploads.map(x => x.contentDetails.videoId));
    if (!ids.size) return [];
    const videos = await list('videos', { id: [...ids].join(','), part: 'snippet,status',
      fields: 'items(id,snippet(title,channelId,channelTitle,publishedAt),status(privacyStatus,uploadStatus))' }, signal);
    return videos.filter(v => ids.has(v?.id)).map(v => sourceRecord(v, channel, checkedAt)).filter(Boolean);
  };
}
