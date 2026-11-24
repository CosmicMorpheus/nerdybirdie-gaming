import { describe, expect, it } from 'vitest';
import creators from '../../content/games/gta-vi/creators/youtube.json';
import { creatorDoc } from '../../src/lib/ask/docs';
import { answerFromGuide } from '../../src/lib/ask/retrieve';
import { CreatorsFile } from '../../src/lib/content/schema';

const docs = CreatorsFile.parse(creators).creators.map(creatorDoc);

describe('ASK "COZMC" knows the creators we follow', () => {
  it('the creators file passes the build-time schema', () => {
    expect(docs).toHaveLength(3);
  });
  it.each([
    ['who has money making strategies', 'TGG'],
    ['where can I find mission walkthroughs videos', 'GTA Series Videos'],
    ['TGG youtube', 'TGG'],
    ['MKIceAndFire', 'MKIceAndFire'],
  ])('%s → %s', (q, name) => {
    const g = answerFromGuide(q, docs, 'safe');
    expect(g.top?.doc.title).toContain(name);
    expect(g.actions.map((a) => a.href)).toContain('/updates/#disc-h');
    expect(g.actions.some((a) => /^https:\/\/www\.youtube\.com\/channel\/UC[\w-]{22}$/.test(a.href))).toBe(true);
  });
});
