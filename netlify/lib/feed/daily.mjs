import { randomUUID } from 'node:crypto';
import { CATEGORIES, GAME, REVIEW } from './source.mjs';

const DAY = 86400000;
const TTL = 7 * DAY;
const blank = () => ({ schema: 1, rows: [], revision: 0, recovery: null, held: false, lease: null,
  attemptedAt: null, successfulAt: null, fullDay: null, publishedAt: null, checks: {}, runs: [] });
const time = ms => new Date(ms).toISOString();
const fresh = (record, ms) => Date.parse(record.checkedAt) + TTL > ms;
const signature = records => JSON.stringify(records.map(({ checkedAt, ...rest }) => rest));
const order = (a, b) => b.discoveredAt.localeCompare(a.discoveredAt) || a.id.localeCompare(b.id);

function snapshot(entry) {
  if (!entry) return blank();
  if (entry.data?.schema !== 1 || !Array.isArray(entry.data.rows)) throw new Error('Unknown storage format.');
  return structuredClone(entry.data);
}

// Both lock acquisition and publication compare the exact version read. An expired worker cannot publish.
export async function runDaily({ store, channels, read, clock = Date.now, force = false }) {
  const start = clock(), stamp = time(start), day = stamp.slice(0, 10);
  const entry = await store.read();
  const s = snapshot(entry);
  if (s.held) return { outcome: 'paused' };
  if (s.lease && s.lease.until > start) return { outcome: 'busy' };
  const registryKey = channels.slice().sort().join(',');
  if (!force && s.fullDay === day && s.registryKey === registryKey) return { outcome: 'already checked' };
  const token = randomUUID();
  s.lease = { token, until: start + 60000 };
  s.attemptedAt = stamp;
  if (!await store.write(entry?.etag, s)) return { outcome: 'busy' };
  const locked = await store.read();
  if (locked?.data.lease?.token !== token) return { outcome: 'superseded' };
  const signal = AbortSignal.timeout(16000);
  const pending = channels.filter(id => force || s.checks[id]?.slice(0, 10) !== day);
  const result = await Promise.allSettled(pending.map(id => read(id, stamp, signal)));
  const byId = new Map(s.rows.map(row => [row.id, row]));
  const live = new Set(channels);
  let next = s.rows.filter(row => live.has(row.channel) && fresh(row, start));
  let failed = 0, fetched = 0, existing = 0;
  const problems = [];
  result.forEach((r, index) => {
    const channel = pending[index];
    // Reasons are our own short messages or "YouTube returned HTTP n": never a key or a URL with one.
    if (r.status !== 'fulfilled') { failed++; problems.push({ channel, reason: String(r.reason?.message || 'failed').slice(0, 140) }); return; }
    const unique = new Map();
    for (const row of r.value) {
      if (row.channel !== channel || row.gameId !== GAME || row.status !== REVIEW) throw new Error('Adapter contract mismatch.');
      if (byId.has(row.id) || unique.has(row.id)) existing++;
      unique.set(row.id, { ...row, discoveredAt: byId.get(row.id)?.discoveredAt || stamp });
    }
    fetched += r.value.length;
    next = next.filter(row => row.channel !== channel).concat([...unique.values()]);
    s.checks[channel] = stamp;
  });
  next.sort(order);
  const changed = signature(s.rows) !== signature(next);
  if (changed) {
    // Keep an editorial membership checkpoint only. Removed/private videos cannot be resurrected by rollback.
    s.recovery = { from: s.revision, ids: s.rows.map(r => r.id) };
    s.revision++; s.publishedAt = stamp;
  }
  s.rows = next;
  s.checks = Object.fromEntries(Object.entries(s.checks).filter(([id]) => live.has(id)));
  if (!failed) { s.fullDay = day; s.registryKey = registryKey; s.successfulAt = stamp; }
  s.lease = null;
  const run = { at: stamp, outcome: failed ? 'incomplete' : 'complete', checked: pending.length,
    failed, fetched, duplicates: existing, revision: s.revision, changed,
    added: next.filter(row => !byId.has(row.id)).length, ...(problems.length ? { problems } : {}) };
  s.runs = [run, ...s.runs].slice(0, 30);
  if (!await store.write(locked.etag, s)) return { outcome: 'superseded' };
  return run;
}

export async function rollback(store, expectedRevision, ms = Date.now()) {
  const entry = await store.read(), s = snapshot(entry);
  if (s.lease?.until > ms || s.held || !s.recovery || s.revision !== expectedRevision)
    throw new Error('Rollback requires the current available revision.');
  const ids = new Set(s.recovery.ids);
  s.rows = s.rows.filter(row => ids.has(row.id) && fresh(row, ms));
  s.lease = null; s.held = true; s.recovery = null; s.revision++; s.publishedAt = time(ms);
  s.runs = [{ at: time(ms), outcome: 'rolled back and paused', revision: s.revision }, ...s.runs].slice(0, 30);
  if (!await store.write(entry.etag, s)) throw new Error('Concurrent update. Read the current revision.');
  return s.revision;
}

// Paused records still expire on reads. Maintenance physically removes old source metadata.
export async function prune(store, ms = Date.now()) {
  const entry = await store.read();
  if (!entry) return;
  const s = snapshot(entry);
  if (s.lease?.until > ms) return;
  const next = s.rows.filter(r => fresh(r, ms));
  if (next.length === s.rows.length) return;
  s.rows = next; s.revision++; s.publishedAt = time(ms);
  s.recovery = null;
  if (!await store.write(entry.etag, s)) throw new Error('Maintenance conflict.');
}

export async function resume(store, expectedRevision, ms = Date.now()) {
  const entry = await store.read(), s = snapshot(entry);
  if (!s.held || s.revision !== expectedRevision) throw new Error('Select the paused revision.');
  s.held = false; s.fullDay = null; s.checks = {};
  s.runs = [{ at: time(ms), outcome: 'resumed', revision: s.revision }, ...s.runs].slice(0, 30);
  if (!await store.write(entry.etag, s)) throw new Error('Concurrent recovery action.');
}

export function publicFeed(entry, { reveal = false, category = null, channels, now = Date.now() }) {
  const s = snapshot(entry), allowed = new Set(channels);
  if (category && !CATEGORIES.includes(category)) throw new Error('Unknown guide category.');
  return { gameId: GAME, revision: s.revision, lastAttempt: s.attemptedAt, lastSuccessfulCheck: s.successfulAt,
    lastPublication: s.publishedAt, lastCommunityVerification: null, paused: s.held,
    items: s.rows.filter(r => allowed.has(r.channel) && fresh(r, now) && (!category || r.category === category))
      .map(r => {
        const base = { id: r.id, category: r.category, kind: 'source', status: REVIEW,
          discoveredAt: r.discoveredAt, lastVerified: null };
        return reveal ? { ...base, title: r.title, creator: r.creator, publishedAt: r.publishedAt,
          url: 'https://www.youtube.com/watch?v=' + r.videoId,
          channelUrl: 'https://www.youtube.com/channel/' + r.channel, embeddable: r.embeddable === true } : base;
      })
  };
}
