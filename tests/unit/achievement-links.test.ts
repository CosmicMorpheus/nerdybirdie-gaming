import { describe, expect, it } from 'vitest';
import objectives from '../../content/games/gta-vi/objectives.json';
import entries from '../../content/games/gta-vi/entries.json';
import game from '../../content/games/gta-vi/game.json';
import pins from '../../content/games/gta-vi/map/pins.json';

const sections = new Set(game.guideCategories.map((c) => c.id));
const slugs = new Map((entries as { slug: string; category: string; status: string }[]).filter((e) => e.status === 'published').map((e) => [e.slug, e.category]));
const kinds = new Set((pins as { categories: { id: string }[] }).categories.map((c) => c.id));
type Obj = { id: string; tip?: string; protected: { tip?: string } | null; links?: { label: string; href: string }[] };

describe('achievement how-to tips', () => {
  it('every achievement has a tip (public, or behind Reveal for hidden ones)', () => {
    for (const o of objectives as Obj[]) expect(o.tip ?? o.protected?.tip, o.id).toBeTruthy();
  });
  it('every link points to a real guide section, entry or map filter', () => {
    for (const o of objectives as Obj[]) for (const l of o.links ?? []) {
      const u = new URL(l.href, 'https://x.invalid');
      const g = u.pathname.match(/^\/games\/gta-vi\/guides\/([a-z-]+)\/$/);
      if (g) {
        expect(sections.has(g[1]!), `${o.id} → ${l.href}`).toBe(true);
        if (u.hash) expect(slugs.get(u.hash.replace('#entry-', '')), `${o.id} → ${l.href}`).toBe(g[1]);
      } else {
        expect(u.pathname, `${o.id} → ${l.href}`).toBe('/games/gta-vi/map/');
        for (const k of (u.searchParams.get('c') ?? '').split(',').filter(Boolean)) expect(kinds.has(k), `${o.id} → ${k}`).toBe(true);
      }
    }
  });
  it('hidden story achievements keep spoilers out of their public links', () => {
    for (const o of objectives as Obj[]) if (o.protected) for (const l of o.links ?? []) expect(l.href, o.id).not.toMatch(/#entry-mission-/);
  });
});
