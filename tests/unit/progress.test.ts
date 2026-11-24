import { describe, expect, it } from 'vitest';
import {
  contextKey, emptyProgress, migrate, RECOVERY_KEY, resetContext, setBookmark, setCompleted, setNote, setPrefs,
  STORAGE_KEY, MAX_NOTE_LENGTH,
} from '../../src/lib/progress/model';
import { loadProgress, saveProgress, type KV } from '../../src/lib/progress/store';
import { progressFor, tally, formatTally } from '../../src/lib/progress/totals';
import { diffImport, exportProgress, parseImport, MAX_IMPORT_BYTES } from '../../src/lib/progress/io';

const X = contextKey('gta-vi', 'xbox-series');
const P = contextKey('gta-vi', 'ps5');
const memory = (init: Record<string, string> = {}): KV & { data: Record<string, string> } => {
  const data = { ...init };
  return { data, getItem: (k) => (k in data ? data[k]! : null), setItem: (k, v) => void (data[k] = v) };
};

describe('totals', () => {
  it('an empty list is not complete', () => {
    expect(tally([], {})).toEqual({ done: 0, total: 0, percent: null });
    expect(formatTally(tally([], {}))).toBe('Not verified yet');
  });
  it('counts only ids in the list and updates on check/uncheck', () => {
    let p = emptyProgress();
    const objs = [{ id: 'gta-vi:a', category: 'story' }, { id: 'gta-vi:b', category: 'story' }, { id: 'gta-vi:c', category: 'activities' }];
    p = setCompleted(p, X, 'gta-vi:a', true);
    p = setCompleted(p, X, 'gta-vi:retired', true);
    let r = progressFor(objs, p.contexts[X]!.completed, ['story', 'activities', 'collectibles']);
    expect(r.overall).toEqual({ done: 1, total: 3, percent: 33 });
    expect(r.byCategory.story).toEqual({ done: 1, total: 2, percent: 50 });
    expect(r.byCategory.collectibles!.percent).toBeNull();
    p = setCompleted(p, X, 'gta-vi:a', false);
    r = progressFor(objs, p.contexts[X]!.completed, ['story']);
    expect(r.overall.done).toBe(0);
  });
  it('never rounds up to 100% before everything is done', () => {
    const ids = Array.from({ length: 200 }, (_, i) => `gta-vi:o${i}`);
    const completed = Object.fromEntries(ids.slice(0, 199).map((id) => [id, 'x']));
    expect(tally(ids, completed).percent).toBe(99);
  });
});

describe('progress updates', () => {
  it('keeps Xbox and PS5 separate, and reset clears only one', () => {
    let p = setCompleted(emptyProgress(), X, 'gta-vi:a', true);
    p = setCompleted(p, P, 'gta-vi:b', true);
    p = setPrefs(p, { spoilerMode: 'minor' });
    expect(Object.keys(p.contexts[X]!.completed)).toEqual(['gta-vi:a']);
    p = resetContext(p, X);
    expect(p.contexts[X]).toBeUndefined();
    expect(p.contexts[P]!.completed['gta-vi:b']).toBeTruthy();
    expect(p.prefs.spoilerMode).toBe('minor');
  });
  it('re-ticking keeps the first completion time', () => {
    const t1 = new Date('2026-11-20T00:00:00Z');
    let p = setCompleted(emptyProgress(), X, 'gta-vi:a', true, t1);
    p = setCompleted(p, X, 'gta-vi:a', true, new Date('2026-11-21T00:00:00Z'));
    expect(p.contexts[X]!.completed['gta-vi:a']).toBe(t1.toISOString());
  });
  it('bookmarks and notes add, dedupe and clear', () => {
    let p = setBookmark(emptyProgress(), X, 'gta-vi:a', true);
    p = setBookmark(p, X, 'gta-vi:a', true);
    expect(p.contexts[X]!.bookmarks).toEqual(['gta-vi:a']);
    p = setBookmark(p, X, 'gta-vi:a', false);
    expect(p.contexts[X]!.bookmarks).toEqual([]);
    p = setNote(p, X, 'gta-vi:a', 'x'.repeat(MAX_NOTE_LENGTH + 50));
    expect(p.contexts[X]!.notes['gta-vi:a']!.length).toBe(MAX_NOTE_LENGTH);
    p = setNote(p, X, 'gta-vi:a', '   ');
    expect(p.contexts[X]!.notes['gta-vi:a']).toBeUndefined();
  });
});

describe('migrate', () => {
  it('rejects junk and newer versions', () => {
    expect(migrate(null)).toMatchObject({ ok: false, reason: 'malformed' });
    expect(migrate({})).toMatchObject({ ok: false, reason: 'malformed' });
    expect(migrate({ schemaVersion: 99 })).toMatchObject({ ok: false, reason: 'newer' });
  });
  it('drops bad entries one by one and keeps the good ones', () => {
    const m = migrate({
      schemaVersion: 1,
      contexts: {
        [X]: { completed: { 'gta-vi:a': '2026-11-20T00:00:00Z', 'BAD ID': '2026-11-20', 'gta-vi:b': 'not a date', 'gta-vi:c': 5 },
               bookmarks: ['gta-vi:a', 'gta-vi:a', 7, '<script>'], notes: { 'gta-vi:a': 'hi', 'gta-vi:z': '' } },
        'bad key': { completed: { 'gta-vi:a': '2026-11-20T00:00:00Z' } },
      },
      prefs: { spoilerMode: 'everything', platformByGame: { 'gta-vi': 'ps5', 'x y': 'z' } },
      extra: 'ignored',
    });
    expect(m.ok).toBe(true);
    if (!m.ok) return;
    expect(Object.keys(m.progress.contexts)).toEqual([X]);
    expect(m.progress.contexts[X]).toEqual({ completed: { 'gta-vi:a': '2026-11-20T00:00:00Z' }, bookmarks: ['gta-vi:a'], notes: { 'gta-vi:a': 'hi' } });
    expect(m.progress.prefs).toEqual({ spoilerMode: 'safe', platformByGame: { 'gta-vi': 'ps5' } });
  });
});

describe('store', () => {
  it('round-trips and survives a reload', () => {
    const s = memory();
    expect(loadProgress(s).status).toBe('empty');
    const p = setCompleted(emptyProgress(), X, 'gta-vi:a', true);
    expect(saveProgress(s, p)).toEqual({ ok: true });
    const r = loadProgress(s);
    expect(r.status).toBe('ok');
    expect(r.progress.contexts[X]!.completed['gta-vi:a']).toBeTruthy();
  });
  it('storage blocked: works for this visit and says so', () => {
    const r = loadProgress(null);
    expect(r).toMatchObject({ status: 'unavailable', canSave: false });
    const throwing: KV = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => { throw new Error('x'); } };
    expect(loadProgress(throwing).status).toBe('unavailable');
  });
  it('quota full is reported, not thrown', () => {
    const full: KV = { getItem: () => null, setItem: () => { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; } };
    expect(saveProgress(full, emptyProgress())).toEqual({ ok: false, reason: 'quota' });
  });
  it('unreadable data is copied aside before starting fresh', () => {
    const s = memory({ [STORAGE_KEY]: '{not json' });
    const r = loadProgress(s);
    expect(r).toMatchObject({ status: 'recovered', canSave: true });
    expect(s.data[RECOVERY_KEY]).toBe('{not json');
  });
  it('data from a newer version is never overwritten', () => {
    const s = memory({ [STORAGE_KEY]: JSON.stringify({ schemaVersion: 2 }) });
    const r = loadProgress(s);
    expect(r).toMatchObject({ status: 'newer', canSave: false });
    expect(saveProgress(s, emptyProgress(), r.canSave)).toEqual({ ok: false, reason: 'blocked' });
    expect(s.data[STORAGE_KEY]).toBe(JSON.stringify({ schemaVersion: 2 }));
  });
});

describe('export / import', () => {
  it('round-trips through a backup file', () => {
    let p = setCompleted(emptyProgress(), X, 'gta-vi:a', true);
    p = setNote(p, X, 'gta-vi:a', 'done on stream');
    const r = parseImport(exportProgress(p));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.progress.contexts).toEqual(p.contexts);
  });
  it('rejects bad files with a readable reason', () => {
    expect(parseImport('nope')).toMatchObject({ ok: false });
    expect(parseImport('{"schemaVersion":1}')).toMatchObject({ ok: false, error: expect.stringMatching(/isn't a Nerdy Birdie/) });
    expect(parseImport(JSON.stringify({ app: 'nerdybirdie-gaming', schemaVersion: 5 }))).toMatchObject({ ok: false, error: expect.stringMatching(/newer/) });
    expect(parseImport(' '.repeat(MAX_IMPORT_BYTES + 1))).toMatchObject({ ok: false });
  });
  it('previews what a restore would change', () => {
    let now = setCompleted(emptyProgress(), X, 'gta-vi:a', true);
    now = setCompleted(now, X, 'gta-vi:b', true);
    let inc = setCompleted(emptyProgress(), X, 'gta-vi:b', true);
    inc = setCompleted(inc, P, 'gta-vi:c', true);
    expect(diffImport(now, inc)).toEqual([
      { key: X, current: 2, incoming: 1, added: 0, removed: 1 },
      { key: P, current: 0, incoming: 1, added: 1, removed: 0 },
    ].sort((a, b) => a.key.localeCompare(b.key)));
  });
});
