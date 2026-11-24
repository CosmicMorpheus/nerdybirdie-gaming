// Site-specific checks for the daily feed (the kit's own tests are daily.test.mjs and functions.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATEGORIES, sourceRecord } from '../../netlify/lib/feed/source.mjs';
import { A, video } from './helpers.mjs';

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
  assert.equal(cat('GTA 6 rare cars you can keep'), 'vehicles');
  assert.equal(cat('GTA VI best weapons'), 'weapons');
  assert.equal(cat('GTA 6 all collectibles'), 'collectibles');
  assert.equal(cat('GTA VI fast money strategy'), 'money');
  assert.equal(cat('GTA 6 easter eggs'), 'secrets');
  // Unverified achievement lists, map locations and news never get their own section.
  assert.equal(cat('GTA VI all achievements'), 'general');
  assert.equal(cat('GTA 6 map locations'), 'general');
  assert.equal(cat('GTA VI patch notes update'), 'general');
  assert.equal(cat('GTA VI first impressions'), 'general');
});

test('feed reports "not set up" (404) until a channel is approved', async t => {
  const keep = { ...process.env };
  t.after(() => { for (const k of ['NB_STAGING_SITE_ID', 'NB_YOUTUBE_CHANNEL_IDS']) { if (keep[k] === undefined) delete process.env[k]; else process.env[k] = keep[k]; } });
  process.env.NB_STAGING_SITE_ID = '00000000-0000-0000-0000-000000000001';
  delete process.env.NB_YOUTUBE_CHANNEL_IDS;
  const { default: feed } = await import('../../netlify/functions/nb-feed.mjs');
  const res = await feed(new Request('https://example.invalid/.netlify/functions/nb-feed'), { site: { id: process.env.NB_STAGING_SITE_ID } });
  assert.equal(res.status, 404);
  assert.match(res.headers.get('x-robots-tag'), /noindex/);
});
