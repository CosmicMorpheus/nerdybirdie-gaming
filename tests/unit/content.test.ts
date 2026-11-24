import { describe, expect, it } from 'vitest';
import realGame from '../../content/games/gta-vi/game.json';
import realObjectives from '../../content/games/gta-vi/objectives.json';
import fxGame from '../../content/fixtures/games/gta-vi/game.json';
import fxObjectives from '../../content/fixtures/games/gta-vi/objectives.json';
import fxGuides from '../../content/fixtures/games/gta-vi/guides.json';
import fxVideos from '../../content/fixtures/games/gta-vi/videos.json';
import realGuides from '../../content/games/gta-vi/guides.json';
import realVideos from '../../content/games/gta-vi/videos.json';
import platforms from '../../content/platforms.json';
import { validateGameBundle, isPublishable } from '../../src/lib/content/validate';
import type { Platform } from '../../src/lib/content/schema';

const P = platforms as Platform[];
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

describe('content', () => {
  it('real GTA VI content is valid and every platform claim has an official source', () => {
    const b = validateGameBundle(realGame, realObjectives, P, realGuides, realVideos);
    for (const p of b.game.platforms) {
      expect(p.verificationStatus).toBe('official_confirmed');
      expect(b.game.sources.filter((s) => p.sourceIds.includes(s.id)).every((s) => s.official)).toBe(true);
    }
  });
  it('real content contains no fixture data', () => {
    const text = JSON.stringify([realGame, realObjectives, realGuides, realVideos]);
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

describe('guides', () => {
  it('fixture guides and videos are valid', () => {
    const b = validateGameBundle(fxGame, fxObjectives, P, fxGuides, fxVideos);
    expect(b.guides.length).toBe(2);
  });
  it.each([
    ['unknown guide category', (gs: any[]) => (gs[0].category = 'nope')],
    ['id not matching slug', (gs: any[]) => (gs[0].id = 'gta-vi:guide:other')],
    ['duplicate step id', (gs: any[]) => gs[0].steps.push(clone(gs[0].steps[0]))],
    ['step id outside its guide', (gs: any[]) => (gs[0].steps[0].id = 'gta-vi:guide:fixture-tips:step-9')],
    ['unknown video', (gs: any[]) => (gs[0].steps[0].videoId = 'nope')],
    ['spoiler step without protected text', (gs: any[]) => { gs[0].steps[0].spoilerLevel = 'minor'; }],
    ['guide without sources', (gs: any[]) => (gs[0].sourceIds = [])],
    ['unknown objective link', (gs: any[]) => (gs[0].objectiveIds = ['gta-vi:nope'])],
  ])('rejects: %s', (_n, mutate) => {
    const gs = clone(fxGuides) as any[];
    mutate(gs);
    expect(() => validateGameBundle(fxGame, fxObjectives, P, gs, fxVideos)).toThrow();
  });
  it('rejects a malformed YouTube id', () => {
    const vs = clone(fxVideos) as any[];
    vs[0].youtubeId = 'https://youtu.be/x';
    expect(() => validateGameBundle(fxGame, fxObjectives, P, fxGuides, vs)).toThrow();
  });
});
