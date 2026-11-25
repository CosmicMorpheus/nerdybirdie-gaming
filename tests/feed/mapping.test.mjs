// Site-specific checks for the daily feed (the kit's own tests are daily.test.mjs and functions.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATEGORIES, sourceRecord, youtubeReader } from '../../netlify/lib/feed/source.mjs';
import { approvedCreators } from '../../netlify/lib/feed/creators.mjs';
import { settings } from '../../netlify/lib/feed/hosting.mjs';
import { publicFeed, runDaily } from '../../netlify/lib/feed/daily.mjs';
import { A, B, t0, memoryStore, video } from './helpers.mjs';

const game = JSON.parse(readFileSync(new URL('../../content/games/gta-vi/game.json', import.meta.url), 'utf8'));
const at = '2026-01-01T10:17:00.000Z';
const cat = title => sourceRecord(video('sample00001', A, title), A, at)?.category;

test('every feed category is a real guide section or general', () => {
  const ours = new Set(game.guideCategories.map(c => c.id));
  for (const c of CATEGORIES) assert.ok(c === 'general' || ours.has(c), c);
  assert.equal(new Set(CATEGORIES).size, CATEGORIES.length);
});

test('approved mapping: title words land in our sections', () => {
  assert.equal(cat('GTA VI mission walkthrough part 1'), 'walkthrough');
  assert.equal(cat('GTA 6 all side missions'), 'side-missions');
  assert.equal(cat('GTA VI The Cartel Heist perfect run'), 'robberies');
  assert.equal(cat('GTA 6 every illegal operation location'), 'robberies');
  assert.equal(cat('GTA VI best bank robbery tips'), 'robberies');
  assert.equal(cat("GTA 6 smash 'n' grab guide"), 'robberies');
  assert.equal(cat('GTA VI side activities guide'), 'side-missions');
  assert.equal(cat('GTA 6 rare cars you can keep'), 'vehicles');
  assert.equal(cat('GTA VI best weapons'), 'weapons');
  assert.equal(cat('GTA 6 all collectibles'), 'collectibles');
  assert.equal(cat('GTA VI fast money strategy'), 'money');
  assert.equal(cat('GTA 6 easter eggs'), 'secrets');
  assert.equal(cat('GTA VI hidden mechanics'), 'secrets');
  assert.equal(cat('GTA 6 best graphics settings'), 'settings');
  assert.equal(cat('GTA VI beginner tips and tricks'), 'tips');
  // Unverified achievement lists, map locations and news never get their own section.
  assert.equal(cat('GTA VI all achievements'), 'general');
  assert.equal(cat('GTA 6 map locations'), 'general');
  assert.equal(cat('GTA VI patch notes update'), 'general');
  assert.equal(cat('GTA VI first impressions'), 'general');
});

test('creators file: the three founder-supplied channels, valid and unique', () => {
  const list = approvedCreators();
  assert.deepEqual(list.map(c => c.handle), ['@GTASeriesVideos', '@MKIceAndFire', '@TGG_']);
  assert.deepEqual(list.map(c => c.channelId), ['UCuWcjpKbIDAbZfHoru1toFg', 'UC1bwliGvJogr7cWK0nT2Eag', 'UC72PuhDwKtZ5MikpGNhPAtA']);
  const s = settings({}, list);
  assert.deepEqual(s.channels, list.map(c => c.channelId));
  assert.equal(s.handles.UC72PuhDwKtZ5MikpGNhPAtA, '@TGG_');
  // Paused creators drop out; bad or duplicate records are refused.
  const one = { channelId: A, handle: '@abc', name: 'X', status: 'approved' };
  assert.deepEqual(approvedCreators({ creators: [one, { ...one, channelId: B, status: 'paused' }] }).map(c => c.channelId), [A]);
  assert.throws(() => approvedCreators({ creators: [{ ...one, channelId: 'UCshort' }] }));
  assert.throws(() => approvedCreators({ creators: [{ ...one, handle: 'no-at' }] }));
  assert.throws(() => approvedCreators({ creators: [one, one] }));
  // The env var still overrides for a one-channel test.
  assert.deepEqual(settings({ NB_YOUTUBE_CHANNEL_IDS: A }, list).channels, [A]);
});

function fakeYouTube(customUrl, embeddable) {
  return async u => Response.json({ items: {
    channels: [{ id: A, snippet: { customUrl }, contentDetails: { relatedPlaylists: { uploads: 'UU' + 'a'.repeat(22) } } }],
    playlistItems: [{ contentDetails: { videoId: 'sample00001' } }],
    videos: [{ ...video(), status: { ...video().status, embeddable } }],
  }[u.pathname.split('/').pop()] });
}

test('handle check: matching handle (any case, with or without @) passes; a mismatch is refused', async () => {
  const signal = new AbortController().signal;
  const ok = youtubeReader({ apiKey: 'test-only', handles: { [A]: '@Creator_A' }, fetchImpl: fakeYouTube('@creator_a', true) });
  const rows = await ok(A, at, signal);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].embeddable, true);
  const bad = youtubeReader({ apiKey: 'test-only', handles: { [A]: '@Creator_A' }, fetchImpl: fakeYouTube('@someone_else', true) });
  await assert.rejects(bad(A, at, signal), /Handle mismatch/);
  const noEmbed = youtubeReader({ apiKey: 'test-only', fetchImpl: fakeYouTube('@x', false) });
  assert.equal((await noEmbed(A, at, signal))[0].embeddable, false);
});

test('a refused channel is logged with its reason and nothing from it is published; others still publish', async () => {
  const store = memoryStore();
  const read = async (id) => { if (id === B) throw new Error('Handle mismatch: @x is not the handle of this channel ID.'); return [sourceRecord(video(), A, at)]; };
  const run = await runDaily({ store, channels: [A, B], read, clock: () => t0 });
  assert.equal(run.outcome, 'incomplete');
  assert.deepEqual(run.problems, [{ channel: B, reason: 'Handle mismatch: @x is not the handle of this channel ID.' }]);
  const feed = publicFeed(await store.read(), { channels: [A, B], reveal: true, now: t0 });
  assert.equal(feed.items.length, 1);
  assert.equal(feed.items[0].channelUrl, 'https://www.youtube.com/channel/' + A);
  assert.equal(feed.items[0].embeddable, false);
  // Spoiler-safe projection has no title, creator, links or embed flag.
  const safe = publicFeed(await store.read(), { channels: [A, B], now: t0 }).items[0];
  for (const k of ['title', 'creator', 'url', 'channelUrl', 'embeddable']) assert.equal(k in safe, false, k);
});

test('feed reports "not set up" (404) without the staging id', async t => {
  const keep = process.env.NB_STAGING_SITE_ID;
  t.after(() => { if (keep === undefined) delete process.env.NB_STAGING_SITE_ID; else process.env.NB_STAGING_SITE_ID = keep; });
  delete process.env.NB_STAGING_SITE_ID;
  const { default: feed } = await import('../../netlify/functions/nb-feed.mjs');
  const res = await feed(new Request('https://example.invalid/.netlify/functions/nb-feed'), { site: { id: 'x' } });
  assert.equal(res.status, 404);
  assert.match(res.headers.get('x-robots-tag'), /noindex/);
});
