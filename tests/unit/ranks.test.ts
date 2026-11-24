import { describe, expect, it } from 'vitest';
import { crossedCheckpoint, nextRank, nextUp, rankFor } from '../../src/lib/progress/ranks';

describe('ranks', () => {
  it('maps percent to rank, and nothing-to-count to no rank', () => {
    expect(rankFor(null)).toBeNull();
    expect(rankFor(0)!.title).toBe('New Arrival');
    expect(rankFor(24)!.title).toBe('Local');
    expect(rankFor(25)!.title).toBe('Hustler');
    expect(rankFor(99)!.title).toBe('Legend');
    expect(rankFor(100)!.title).toBe('List Cleared');
    expect(nextRank(60)!.title).toBe('Legend');
    expect(nextRank(100)).toBeNull();
  });
  it('checkpoints fire only when crossed upward', () => {
    expect(crossedCheckpoint(20, 25)).toBe(25);
    expect(crossedCheckpoint(20, 80)).toBe(75);
    expect(crossedCheckpoint(25, 30)).toBeNull();
    expect(crossedCheckpoint(80, 70)).toBeNull();
    expect(crossedCheckpoint(null, 50)).toBeNull();
  });
  it('next up: missable, then saved, then list order; skips done', () => {
    const list = [
      { id: 'g:a', missable: false }, { id: 'g:b', missable: 'unknown' as const },
      { id: 'g:c', missable: true }, { id: 'g:d', missable: false }, { id: 'g:e', missable: true },
    ];
    expect(nextUp(list, { 'g:e': 'x' }, ['g:d']).map((o) => o.id)).toEqual(['g:c', 'g:d', 'g:a']);
  });
});
