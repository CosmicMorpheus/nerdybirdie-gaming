import { describe, expect, it } from 'vitest';
import { emptyProgress, setBookmark, setCompleted, setNote, setPrefs } from '../../src/lib/progress/model';
import { mergeProgress } from '../../src/lib/progress/merge';

const K = 'gta-vi|guides';
describe('guest → account merge', () => {
  it('never unticks, keeps earliest time, unions saved items', () => {
    let acct = setCompleted(emptyProgress(), K, 'gta-vi:entry:a', true, new Date('2026-11-21T00:00:00Z'));
    acct = setBookmark(acct, K, 'gta-vi:entry:x', true);
    let guest = setCompleted(emptyProgress(), K, 'gta-vi:entry:a', true, new Date('2026-11-20T00:00:00Z'));
    guest = setCompleted(guest, K, 'gta-vi:entry:b', true);
    guest = setBookmark(guest, K, 'gta-vi:entry:y', true);
    const { merged, added } = mergeProgress(acct, guest);
    expect(Object.keys(merged.contexts[K]!.completed).sort()).toEqual(['gta-vi:entry:a', 'gta-vi:entry:b']);
    expect(merged.contexts[K]!.completed['gta-vi:entry:a']).toBe('2026-11-20T00:00:00.000Z');
    expect(merged.contexts[K]!.bookmarks.sort()).toEqual(['gta-vi:entry:x', 'gta-vi:entry:y']);
    expect(added).toBe(1);
  });
  it('account wins on note and preference conflicts', () => {
    let acct = setNote(setPrefs(emptyProgress(), { spoilerMode: 'all' }), K, 'gta-vi:entry:a', 'account note');
    let guest = setNote(setPrefs(emptyProgress(), { spoilerMode: 'safe' }), K, 'gta-vi:entry:a', 'guest note');
    guest = setNote(guest, K, 'gta-vi:entry:b', 'only guest');
    const { merged, conflictsKept } = mergeProgress(acct, guest);
    expect(merged.contexts[K]!.notes).toEqual({ 'gta-vi:entry:a': 'account note', 'gta-vi:entry:b': 'only guest' });
    expect(merged.prefs.spoilerMode).toBe('all');
    expect(conflictsKept).toBe(1);
  });
  it('merging into an empty account keeps all guest progress', () => {
    const guest = setCompleted(emptyProgress(), 'gta-vi|ps5', 'gta-vi:fixture:1', true);
    expect(mergeProgress(emptyProgress(), guest).merged.contexts).toEqual(guest.contexts);
  });
});
