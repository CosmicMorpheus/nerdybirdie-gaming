import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/progress-phase0-elegy.json';
import entries from '../../content/games/gta-vi/entries.json';
import pins from '../../content/games/gta-vi/map/pins.json';
import { migrate, contextKey } from '../../src/lib/progress/model';
import { tally } from '../../src/lib/progress/totals';
import { GUIDES_CONTEXT, MAP_CONTEXT } from '../../src/lib/progress/contexts';

/**
 * Phase 0 baseline (daily-feed handoff): one real guide item, traced from saved progress to percentages.
 * Any later integration (discovery feed, claims, community review) must leave these numbers unchanged.
 */
const ENTRY = 'gta-vi:entry:gta-plus-elegy';
const PIN = 'gta-vi:map:clothing-001';
const list = (x: unknown) => (Array.isArray(x) ? x : Object.values(x as object).find(Array.isArray)) as { id: string; status?: string; category?: string }[];

describe('phase 0 progress fixture', () => {
  it('the traced ids still exist in published content', () => {
    const e = list(entries).find((x) => x.id === ENTRY);
    expect(e).toMatchObject({ status: 'published', category: 'vehicles' });
    expect((pins as { pins: { id: string }[] }).pins.some((p) => p.id === PIN)).toBe(true);
  });

  it('migrates unchanged: same ids, notes, bookmarks and spoiler choice', () => {
    const r = migrate(structuredClone(fixture));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const g = r.progress.contexts[contextKey('gta-vi', GUIDES_CONTEXT)]!;
    expect(g.completed[ENTRY]).toBe('2026-11-24T18:00:00.000Z');
    expect(g.bookmarks).toEqual([ENTRY]);
    expect(g.notes[ENTRY]).toBe('Claimed from the GTA+ perks page');
    expect(r.progress.contexts[contextKey('gta-vi', MAP_CONTEXT)]!.completed[PIN]).toBeTruthy();
    expect(r.progress.prefs.spoilerMode).toBe('safe');
    expect(r.progress.prefs.platformByGame['gta-vi']).toBe('ps5');
  });

  it('guide total counts published entries only (1 of 6 → 16%), and unknown ids never count', () => {
    const ids = list(entries).filter((x) => x.status === 'published').map((x) => x.id);
    const done = { ...fixture.contexts['gta-vi|guides'].completed, 'gta-vi:source:not-a-guide-entry': 'x' };
    expect(tally(ids, done)).toEqual({ done: 1, total: ids.length, percent: Math.floor(100 / ids.length) });
    expect(ids.length).toBe(6);
  });
});
