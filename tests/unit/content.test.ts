import { describe, expect, it } from 'vitest';
import realGame from '../../content/games/gta-vi/game.json';
import realObjectives from '../../content/games/gta-vi/objectives.json';
import fxGame from '../../content/fixtures/games/gta-vi/game.json';
import fxObjectives from '../../content/fixtures/games/gta-vi/objectives.json';
import platforms from '../../content/platforms.json';
import { validateGameBundle, isPublishable } from '../../src/lib/content/validate';
import type { Platform } from '../../src/lib/content/schema';

const P = platforms as Platform[];
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

describe('content', () => {
  it('real GTA VI content is valid and every platform claim has an official source', () => {
    const b = validateGameBundle(realGame, realObjectives, P);
    for (const p of b.game.platforms) {
      expect(p.verificationStatus).toBe('official_confirmed');
      expect(b.game.sources.filter((s) => p.sourceIds.includes(s.id)).every((s) => s.official)).toBe(true);
    }
  });
  it('real content contains no fixture data', () => {
    const text = JSON.stringify([realGame, realObjectives]);
    expect(text).not.toMatch(/fixture|example\.com/i);
  });
  it('fixtures are valid too', () => {
    expect(validateGameBundle(fxGame, fxObjectives, P).objectives.length).toBeGreaterThan(0);
  });
  it('drafts and unverified entries are not publishable', () => {
    const b = validateGameBundle(fxGame, fxObjectives, P);
    expect(b.objectives.filter((o) => o.publicationStatus === 'draft').every((o) => !isPublishable(o))).toBe(true);
  });
  it.each([
    ['duplicate id', (os: any[]) => os.push(clone(os[0]))],
    ['unknown platform', (os: any[]) => (os[0].platformIds = ['switch-2'])],
    ['unknown source', (os: any[]) => (os[0].sourceIds = ['nope'])],
    ['unknown category', (os: any[]) => (os[0].category = 'nope')],
    ['wrong game prefix', (os: any[]) => (os[0].id = 'gta-v:fixture:1')],
    ['spoiler without protected text', (os: any[]) => { os[0].spoilerLevel = 'major'; os[0].protected = null; }],
    ['protected title leaked into safe title', (os: any[]) => { os[4].safeTitle = os[4].protected.title; }],
    ['approved without a date', (os: any[]) => (os[0].checkedAt = null)],
  ])('rejects: %s', (_name, mutate) => {
    const os = clone(fxObjectives) as any[];
    mutate(os);
    expect(() => validateGameBundle(fxGame, os, P)).toThrow();
  });
});
