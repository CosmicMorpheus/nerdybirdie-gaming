import { describe, expect, it } from 'vitest';
import { emptyProgress, setBookmark, setCompleted, setNote, setPrefs } from '../../src/lib/progress/model';
import { mergeGuestIntoAccount, syncMerge } from '../../src/lib/progress/merge';

const K = 'gta-vi|guides';
const at = (s: string) => new Date(s);

describe('guest → account merge (one-time, account preserved)', () => {
  it('adds new guest ticks, keeps earliest time, unions saved items', () => {
    let acct = setCompleted(emptyProgress(), K, 'gta-vi:entry:a', true, at('2026-11-21T00:00:00Z'));
    acct = setBookmark(acct, K, 'gta-vi:entry:x', true);
    let guest = setCompleted(emptyProgress(), K, 'gta-vi:entry:a', true, at('2026-11-20T00:00:00Z'));
    guest = setCompleted(guest, K, 'gta-vi:entry:b', true);
    guest = setBookmark(guest, K, 'gta-vi:entry:y', true);
    const { merged, added } = mergeGuestIntoAccount(acct, guest);
    expect(Object.keys(merged.contexts[K]!.completed).sort()).toEqual(['gta-vi:entry:a', 'gta-vi:entry:b']);
    expect(merged.contexts[K]!.completed['gta-vi:entry:a']).toBe('2026-11-20T00:00:00.000Z');
    expect(merged.contexts[K]!.bookmarks.sort()).toEqual(['gta-vi:entry:x', 'gta-vi:entry:y']);
    expect(added).toBe(1);
  });
  it("never undoes the account's deliberate untick", () => {
    let acct = setCompleted(emptyProgress(), K, 'gta-vi:entry:a', true, at('2026-11-20T00:00:00Z'));
    acct = setCompleted(acct, K, 'gta-vi:entry:a', false, at('2026-11-21T00:00:00Z'));
    const guest = setCompleted(emptyProgress(), K, 'gta-vi:entry:a', true, at('2026-11-22T00:00:00Z'));
    const { merged, conflictsKept } = mergeGuestIntoAccount(acct, guest);
    expect(merged.contexts[K]!.completed['gta-vi:entry:a']).toBeUndefined();
    expect(merged.contexts[K]!.unchecked['gta-vi:entry:a']).toBeTruthy();
    expect(conflictsKept).toBe(1);
  });
  it('account wins on note and preference conflicts', () => {
    const acct = setNote(setPrefs(emptyProgress(), { spoilerMode: 'all' }), K, 'gta-vi:entry:a', 'account note');
    let guest = setNote(setPrefs(emptyProgress(), { spoilerMode: 'safe' }), K, 'gta-vi:entry:a', 'guest note');
    guest = setNote(guest, K, 'gta-vi:entry:b', 'only guest');
    const { merged } = mergeGuestIntoAccount(acct, guest);
    expect(merged.contexts[K]!.notes).toEqual({ 'gta-vi:entry:a': 'account note', 'gta-vi:entry:b': 'only guest' });
    expect(merged.prefs.spoilerMode).toBe('all');
  });
});

describe('device ↔ account sync (same player)', () => {
  it('newest action per item wins, both ways', () => {
    let phone = setCompleted(emptyProgress(), K, 'gta-vi:entry:a', true, at('2026-11-20T10:00:00Z'));
    let pc = setCompleted(emptyProgress(), K, 'gta-vi:entry:a', true, at('2026-11-20T09:00:00Z'));
    pc = setCompleted(pc, K, 'gta-vi:entry:a', false, at('2026-11-20T11:00:00Z')); // untick later on the PC
    phone = setCompleted(phone, K, 'gta-vi:entry:b', true, at('2026-11-20T12:00:00Z'));
    const m = syncMerge(phone, pc);
    expect(m.contexts[K]!.completed['gta-vi:entry:a']).toBeUndefined();
    expect(m.contexts[K]!.completed['gta-vi:entry:b']).toBeTruthy();
    expect(syncMerge(pc, phone).contexts).toEqual(m.contexts); // order doesn't matter
  });
  it('unrelated changes on two devices are both kept', () => {
    const a = setCompleted(emptyProgress(), K, 'gta-vi:entry:a', true, at('2026-11-20T10:00:00Z'));
    const b = setCompleted(emptyProgress(), 'gta-vi|map', 'gta-vi:map:card-1', true, at('2026-11-20T10:05:00Z'));
    const m = syncMerge(a, b);
    expect(m.contexts[K]!.completed['gta-vi:entry:a']).toBeTruthy();
    expect(m.contexts['gta-vi|map']!.completed['gta-vi:map:card-1']).toBeTruthy();
  });
});
