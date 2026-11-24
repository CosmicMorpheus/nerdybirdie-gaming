import { describe, expect, it } from 'vitest';
import realGame from '../../content/games/gta-vi/game.json';
import realObjectives from '../../content/games/gta-vi/objectives.json';
import fxGame from '../../content/fixtures/games/gta-vi/game.json';
import fxObjectives from '../../content/fixtures/games/gta-vi/objectives.json';
import fxEntries from '../../content/fixtures/games/gta-vi/entries.json';
import fxVideos from '../../content/fixtures/games/gta-vi/videos.json';
import realEntries from '../../content/games/gta-vi/entries.json';
import realVideos from '../../content/games/gta-vi/videos.json';
import platforms from '../../content/platforms.json';
import { validateGameBundle, isPublishable } from '../../src/lib/content/validate';
import type { Platform } from '../../src/lib/content/schema';

const P = platforms as Platform[];
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

describe('content', () => {
  it('real GTA VI content is valid and every platform claim has an official source', () => {
    const b = validateGameBundle(realGame, realObjectives, P, realEntries, realVideos);
    for (const p of b.game.platforms) {
      expect(p.verificationStatus).toBe('official_confirmed');
      expect(b.game.sources.filter((s) => p.sourceIds.includes(s.id)).every((s) => s.official)).toBe(true);
    }
  });
  it('real content contains no fixture data', () => {
    const text = JSON.stringify([realGame, realObjectives, realEntries, realVideos]);
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

describe('entries', () => {
  it('fixture entries and videos are valid', () => {
    expect(validateGameBundle(fxGame, fxObjectives, P, fxEntries, fxVideos).entries.length).toBe(7);
  });
  it('every real entry cites a source with a check date, and only confirmed entries are published', () => {
    const b = validateGameBundle(realGame, realObjectives, P, realEntries, realVideos);
    expect(b.entries.length).toBeGreaterThan(0);
    for (const e of b.entries) {
      expect(e.sources.length).toBeGreaterThan(0);
      for (const s of e.sources) expect(s.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (e.status === 'published') expect(e.verification).not.toBe('rumor');
    }
  });
  it.each([
    ['unknown section', (es: any[]) => (es[0].category = 'nope')],
    ['id not matching slug', (es: any[]) => (es[0].id = 'gta-vi:entry:other')],
    ['duplicate id', (es: any[]) => es.push(clone(es[0]))],
    ['unknown video', (es: any[]) => (es[0].videoIds = ['nope'])],
    ['spoiler entry without details', (es: any[]) => { es[0].spoilerLevel = 'minor'; }],
    ['details on a spoiler-free entry', (es: any[]) => { es[0].details = { summary: 'x', steps: [] }; }],
    ['spoiler details repeated in the summary', (es: any[]) => { es[4].summary = es[4].details.summary; }],
    ['no sources', (es: any[]) => (es[0].sources = [])],
    ['source without check date', (es: any[]) => { delete es[0].sources[0].checkedAt; }],
    ['rumor calling itself confirmed', (es: any[]) => { es[2].summary = 'This is confirmed.'; }],
    ['bad verification value', (es: any[]) => (es[0].verification = 'probably')],
  ])('rejects: %s', (_n, mutate) => {
    const es = clone(fxEntries) as any[];
    mutate(es);
    expect(() => validateGameBundle(fxGame, fxObjectives, P, es, fxVideos)).toThrow();
  });
  it('rejects a malformed YouTube id', () => {
    const vs = clone(fxVideos) as any[];
    vs[0].youtubeId = 'https://youtu.be/x';
    expect(() => validateGameBundle(fxGame, fxObjectives, P, fxEntries, vs)).toThrow();
  });
});
