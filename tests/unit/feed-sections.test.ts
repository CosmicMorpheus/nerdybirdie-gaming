import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '../../netlify/lib/feed/source.mjs';
import { DISCOVERY_SECTIONS } from '../../src/config';
import game from '../../content/games/gta-vi/game.json';

describe('daily feed sections', () => {
  it('every section the feed sorts into shows a panel, and every panel section is a real guide section', () => {
    expect([...DISCOVERY_SECTIONS].sort()).toEqual((CATEGORIES as unknown as string[]).filter((c) => c !== 'general').sort());
    const ours = new Set(game.guideCategories.map((c) => c.id));
    for (const s of DISCOVERY_SECTIONS) expect(ours.has(s)).toBe(true);
  });
});
