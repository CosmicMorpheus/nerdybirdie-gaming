import { describe, expect, it } from 'vitest';
import realGame from '../../content/games/gta-vi/game.json';
import realObjectives from '../../content/games/gta-vi/objectives.json';
import realUpdates from '../../content/games/gta-vi/updates.json';
import fxGame from '../../content/fixtures/games/gta-vi/game.json';
import fxObjectives from '../../content/fixtures/games/gta-vi/objectives.json';
import platforms from '../../content/platforms.json';
import { validateGameBundle } from '../../src/lib/content/validate';
import { GameUpdates, type Platform } from '../../src/lib/content/schema';

const P = platforms as Platform[];
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

describe('game configuration (library architecture)', () => {
  it('GTA VI is featured and free', () => {
    const { game } = validateGameBundle(realGame, realObjectives, P);
    expect(game.featured).toBe(true);
    expect(game.access).toEqual({ tier: 'free' });
  });

  it('a game without the new fields defaults to free and not featured (older game.json files keep working)', () => {
    const { game } = validateGameBundle(fxGame, fxObjectives, P);
    expect(game.featured).toBe(false);
    expect(game.access.tier).toBe('free');
  });

  it('a paid (premium) guide fails the build until paid guides are approved and checked server-side', () => {
    const g = clone(realGame) as any;
    g.access = { tier: 'premium', grant: 'guide:gta-vi' };
    expect(() => validateGameBundle(g, realObjectives, P)).toThrow(/access tier "premium" is not allowed yet/);
  });

  it('rejects an unknown access tier or a malformed grant', () => {
    const g = clone(realGame) as any;
    g.access = { tier: 'subscription' };
    expect(() => validateGameBundle(g, realObjectives, P)).toThrow(/access/);
    g.access = { tier: 'free', grant: 'pro' };
    expect(() => validateGameBundle(g, realObjectives, P)).toThrow(/access/);
  });

  it('update history is valid, newest first, with no empty update', () => {
    const { updates } = GameUpdates.parse(realUpdates);
    expect(updates.length).toBeGreaterThan(0);
    for (let i = 1; i < updates.length; i++) expect(updates[i].date <= updates[i - 1].date).toBe(true);
    const bad = clone(realUpdates) as any;
    bad.updates[0].items = [];
    expect(GameUpdates.safeParse(bad).success).toBe(false);
  });
});
