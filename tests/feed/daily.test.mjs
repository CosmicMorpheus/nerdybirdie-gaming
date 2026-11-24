import test from 'node:test';
import assert from 'node:assert/strict';
import { publicFeed, runDaily, rollback, resume, prune } from '../../netlify/lib/feed/daily.mjs';
import { registry, sourceRecord, youtubeReader } from '../../netlify/lib/feed/source.mjs';
import { stagingContext, blobAdapter } from '../../netlify/lib/feed/hosting.mjs';
import { A, B, t0, day, memoryStore, video } from './helpers.mjs';
const stamp = new Date(t0).toISOString();
const single = async (id, when) => [sourceRecord(video(id === A ? 'sample00001' : 'sample00003', id), id, when)];
const run = (store, now = t0, read = single, channels = [A]) =>
  runDaily({ store, channels, clock: () => now, read });
const show = (entry, opts = {}) => publicFeed(entry, { channels: [A], now: t0, ...opts });

test('channel and relevance checks restrict ingestion', () => {
  assert.deepEqual(registry(A + ',' + B), [A, B]);
  for (const value of ['', A + ',' + A, 'https://invalid.test']) assert.throws(() => registry(value));
  for (const title of ['GTA V mission', 'GTA VI free money generator', 'GTA VII car', '<b>GTA VI</b>'])
    assert.equal(sourceRecord(video(undefined, A, title), A, stamp), null);
  const item = video(); item.status.privacyStatus = 'private';
  assert.equal(sourceRecord(item, A, stamp), null);
  assert.equal(sourceRecord(video(), B, stamp), null);
});
test('the YouTube adapter uses three bounded official requests and rejects unrequested IDs', async () => {
  const hits = [], beans = [video(), video('sample00002')];
  const reader = youtubeReader({ apiKey: 'fixture', fetchImpl: async (u, opts) => {
    assert.equal(u.origin, 'https://www.googleapis.com'); assert.equal(opts.redirect, 'error');
    hits.push(u.pathname.split('/').pop());
    const responses = [[{ id: A, contentDetails: { relatedPlaylists: { uploads: 'UU' + 'a'.repeat(22) } } }],
      [{ contentDetails: { videoId: beans[0].id } }], beans];
    return Response.json({ items: responses[hits.length - 1] });
  }});
  const result = await reader(A, stamp, new AbortController().signal);
  assert.deepEqual(hits, ['channels','playlistItems','videos']); assert.equal(result.length, 1);
  assert.equal(result[0].kind, 'source'); assert.equal(result[0].status, 'Needs Community Review');
});
test('initial publication, hidden title, explicit reveal and category filter', async () => {
  const store = memoryStore(); assert.equal((await run(store)).added, 1);
  const entry = await store.read(), feed = show(entry);
  assert.equal(feed.items[0].category, 'vehicles');
  assert.ok(!JSON.stringify(feed).includes('Test creator')); assert.ok(!('url' in feed.items[0]));
  assert.equal(show(entry, { reveal: true }).items[0].url, 'https://www.youtube.com/watch?v=sample00001');
  assert.equal(show(entry, { category: 'walkthrough' }).items.length, 0);
  assert.equal(show(entry, { channels: [] }).items.length, 0);
  assert.equal(feed.lastCommunityVerification, null);
});
test('same day is idempotent and a quiet day preserves publication timestamp', async () => {
  const store = memoryStore(); await run(store); assert.equal((await run(store)).outcome, 'already checked');
  const quiet = await run(store, t0 + day); assert.equal(quiet.duplicates, 1); assert.equal(quiet.changed, false);
  const feed = show(await store.read()); assert.equal(feed.lastPublication, stamp);
  assert.equal(feed.lastSuccessfulCheck, new Date(t0 + day).toISOString());
});
test('partial outage retains the last good source and retries only failed channels', async () => {
  const store = memoryStore(); await run(store, t0, single, [A,B]);
  const partial = await run(store, t0 + day, async (id, when) => {
    if (id === B) throw new Error('offline'); return single(id, when);
  }, [A,B]);
  assert.equal(partial.failed, 1); assert.equal(show(await store.read(), { channels: [A,B] }).items.length, 2);
  const retried = []; await run(store, t0 + day + 10, async (id, when) => { retried.push(id); return single(id, when); }, [A,B]);
  assert.deepEqual(retried, [B]);
});
test('a healthy empty uploads window withdraws its references', async () => {
  const store = memoryStore(); await run(store); await run(store, t0+day, async () => []);
  assert.equal(show(await store.read()).items.length, 0);
});
test('concurrent runs have only one fetcher', async () => {
  const store = memoryStore(); let calls = 0;
  const read = async (...args) => { calls++; return single(...args); };
  const result = await Promise.all([run(store, t0, read), run(store, t0, read)]);
  assert.equal(calls, 1); assert.ok(result.some(r => r.outcome === 'busy'));
});
test('failed publication retains the previous data and an expired lease recovers', async () => {
  const store = memoryStore(); await run(store);
  let n = 0; const flaky = { read: store.read, write(...args) {
    if (++n === 2) throw new Error('commit failed'); return store.write(...args);
  }};
  await assert.rejects(run(flaky, t0 + day, async () => []), /commit failed/);
  assert.equal(show(await store.read()).items.length, 1);
  assert.equal((await run(store, t0 + day + 10)).outcome, 'busy');
  assert.equal((await run(store, t0 + day + 61000)).outcome, 'complete');
});
test('outdated metadata disappears from reads on time and is physically swept', async () => {
  const store = memoryStore(); await run(store);
  assert.equal(show(await store.read(), { now: t0+7*day, reveal: true }).items.length, 0);
  await prune(store, t0+7*day); assert.equal((await store.read()).data.rows.length, 0);
});
test('rollback removes an edition’s additions, stays paused and can be resumed', async () => {
  const store = memoryStore(); await run(store);
  await run(store, t0+day, async (id, when) => [...await single(id, when), sourceRecord(video('sample00002'), id, when)]);
  await assert.rejects(rollback(store, 99, t0+day));
  assert.equal(await rollback(store, 2, t0+day), 3);
  assert.equal(show(await store.read()).items.length, 1);
  assert.equal((await run(store, t0+2*day)).outcome, 'paused');
  await resume(store, 3, t0+2*day);
  assert.equal((await run(store, t0+2*day)).outcome, 'complete');
});
test('staging binding and conditional-write response are enforced', async () => {
  const expected = '00000000-0000-0000-0000-000000000001';
  assert.throws(() => stagingContext({site:{id:'other'}},{NB_STAGING_SITE_ID:expected}));
  assert.throws(() => stagingContext({site:{}},{}));
  stagingContext({site:{id:expected}},{NB_STAGING_SITE_ID:expected});
  const calls = []; const store = blobAdapter({ getWithMetadata: (...a) => calls.push(a),
    setJSON: async (...a) => { calls.push(a); return { modified: false }; } });
  store.read(); assert.equal(await store.write(undefined, {}), false); await store.write('tag', {});
  assert.deepEqual(calls[0][1], { type:'json', consistency:'strong' });
  assert.deepEqual(calls[1][2], { onlyIfNew:true }); assert.deepEqual(calls[2][2], { onlyIfMatch:'tag' });
});
