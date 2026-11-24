import { describe, expect, it } from 'vitest';
import { displayText, modeAllows } from '../../src/lib/spoilers';
import { search } from '../../src/lib/search';

const o = { id: 'gta-vi:x', safeTitle: 'Hidden objective', safeSummary: 'Hidden in spoiler-free mode.', spoilerLevel: 'major' as const, hasProtected: true };
const prot = { 'gta-vi:x': { title: 'SECRET', summary: 'SECRET SUMMARY' } };

describe('spoilers', () => {
  it('mode thresholds', () => {
    expect(modeAllows('none', 'safe')).toBe(true);
    expect(modeAllows('minor', 'safe')).toBe(false);
    expect(modeAllows('minor', 'minor')).toBe(true);
    expect(modeAllows('major', 'minor')).toBe(false);
    expect(modeAllows('major', 'all')).toBe(true);
  });
  it('safe by default, even when protected text is already loaded', () => {
    expect(displayText(o, 'safe', new Set(), prot)).toEqual({ title: 'Hidden objective', summary: 'Hidden in spoiler-free mode.', concealed: true });
  });
  it('a deliberate reveal shows one item only', () => {
    expect(displayText(o, 'safe', new Set(['gta-vi:x']), prot).title).toBe('SECRET');
    expect(displayText({ ...o, id: 'gta-vi:y' }, 'safe', new Set(['gta-vi:x']), { 'gta-vi:y': prot['gta-vi:x'] }).concealed).toBe(true);
  });
  it('stays concealed until the protected text has loaded', () => {
    expect(displayText(o, 'all', new Set(), null).concealed).toBe(true);
    expect(displayText(o, 'all', new Set(), prot).title).toBe('SECRET');
  });
});

describe('search', () => {
  const docs = [
    { title: 'Money guide', text: 'early game cash' },
    { title: 'Café locations', text: 'collectibles' },
    { title: 'Settings', text: 'money display options' },
  ];
  it('matches all words, ignores case and accents, ranks title hits first', () => {
    expect(search(docs, 'MONEY').map((d) => d.title)).toEqual(['Money guide', 'Settings']);
    expect(search(docs, 'cafe').map((d) => d.title)).toEqual(['Café locations']);
    expect(search(docs, 'money cash').map((d) => d.title)).toEqual(['Money guide']);
    expect(search(docs, '   ')).toEqual([]);
  });
});
