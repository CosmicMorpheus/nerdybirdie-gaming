import { test, expect, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fixture from '../fixtures/progress-phase0-elegy.json' with { type: 'json' };

// What's New creator feed on the real build. The test server has no functions, so the feed is stubbed per test.
const R = 'http://localhost:4321';
const hydrated = (p: Page) => p.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
const TITLE = 'GTA VI rare car location (test fixture)';
const item = { id: 'a'.repeat(64), category: 'vehicles', kind: 'source', status: 'Needs Community Review', discoveredAt: '2026-11-24T10:17:00.000Z', lastVerified: null };
const feed = (reveal: boolean) => ({
  gameId: 'gta-vi', revision: 1, lastAttempt: '2026-11-24T10:17:00.000Z', lastSuccessfulCheck: '2026-11-24T10:17:00.000Z',
  lastPublication: '2026-11-24T10:17:00.000Z', lastCommunityVerification: null, paused: false,
  items: [reveal ? { ...item, title: TITLE, creator: 'Test creator', publishedAt: '2026-11-23T05:00:00.000Z', url: 'https://www.youtube.com/watch?v=sample00001' } : item],
});
async function stub(page: Page, seen: string[] = []) {
  await page.route('**/.netlify/functions/nb-feed*', (r: Route) => {
    const u = new URL(r.request().url());
    seen.push(u.search);
    return r.fulfill({ json: feed(u.searchParams.get('reveal') === '1') });
  });
  return seen;
}

test('not set up yet: Updates explains, the vehicles guide shows nothing extra', async ({ page }) => {
  await page.goto(R + '/updates/');
  await expect(page.getByRole('heading', { name: "What's New from creators" })).toBeVisible();
  await expect(page.getByText("Daily source checks haven't started yet")).toBeVisible();
  await page.goto(R + '/games/gta-vi/guides/vehicles/');
  await hydrated(page);
  await expect(page.getByRole('checkbox', { name: /Elegy/ })).toBeVisible();
  await expect(page.locator('.disc')).toHaveCount(0);
});

test('spoiler-safe by default; titles only after the visitor chooses', async ({ page }) => {
  const seen = await stub(page);
  await page.goto(R + '/updates/');
  await expect(page.getByText('title hidden (spoiler-safe)')).toBeVisible();
  await expect(page.getByText(TITLE)).toHaveCount(0);
  expect(seen.every((q) => !q.includes('reveal'))).toBe(true);
  await expect(page.locator('.disc-meta a', { hasText: 'Rare vehicles' })).toHaveAttribute('href', '/games/gta-vi/guides/vehicles/');

  const show = page.getByRole('button', { name: /Show video titles/ });
  await expect(show).toHaveAttribute('aria-pressed', 'false');
  await show.click();
  const link = page.getByRole('link', { name: new RegExp(TITLE.replace(/[()]/g, '\\$&')) });
  await expect(link).toHaveAttribute('href', 'https://www.youtube.com/watch?v=sample00001');
  await expect(link).toHaveAttribute('target', '_blank');
  expect(seen.at(-1)).toContain('reveal=1');
  await page.getByRole('button', { name: 'Hide video titles' }).click();
  await expect(page.getByText(TITLE)).toHaveCount(0);
});

test('a saved "show all spoilers" setting counts as the choice', async ({ page }) => {
  await page.addInitScript((p) => localStorage.setItem('nbg:progress', JSON.stringify(p)),
    { ...fixture, prefs: { ...fixture.prefs, spoilerMode: 'all' } });
  const seen = await stub(page);
  await page.goto(R + '/updates/');
  await expect(page.getByRole('link', { name: /rare car location/ })).toBeVisible();
  expect(seen.length).toBeGreaterThan(0);
  expect(seen.every((q) => q.includes('reveal=1'))).toBe(true);
});

test('vehicles guide: same source, filtered by section, saved progress untouched', async ({ page }) => {
  await page.addInitScript((p) => { if (!localStorage.getItem('nbg:progress')) localStorage.setItem('nbg:progress', JSON.stringify(p)); }, fixture);
  const seen = await stub(page);
  await page.goto(R + '/games/gta-vi/guides/vehicles/');
  await hydrated(page);
  const panel = page.locator('.disc');
  await panel.scrollIntoViewIfNeeded();
  await expect(panel.getByText('title hidden (spoiler-safe)')).toBeVisible();
  expect(seen.some((q) => q.includes('category=vehicles'))).toBe(true);
  await expect(page.getByRole('checkbox', { name: /Elegy/ })).toBeChecked();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('nbg:progress')!));
  expect(Object.keys(saved.contexts['gta-vi|guides'].completed)).toEqual(['gta-vi:entry:gta-plus-elegy']);
  expect(JSON.stringify(saved)).not.toContain(item.id);
  // Home HUD guide total is still 1 of 6.
  await page.goto(R + '/');
  await hydrated(page);
  await expect(page.locator('.hud-meter', { hasText: /guide/i }).first()).toContainText('1/6');
});

test('feed failure leaves the page usable', async ({ page }) => {
  await page.route('**/.netlify/functions/nb-feed*', (r) => r.fulfill({ status: 503, json: { error: 'x' } }));
  await page.goto(R + '/updates/');
  await expect(page.getByText('New sources are unavailable right now')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Preview 6/ })).toBeVisible();
});

test('Updates with the feed passes axe', async ({ page }) => {
  await stub(page);
  await page.goto(R + '/updates/');
  await page.getByRole('button', { name: /Show video titles/ }).click();
  await expect(page.getByRole('link', { name: /rare car location/ })).toBeVisible();
  const r = await new AxeBuilder({ page }).include('.disc').analyze();
  expect(r.violations).toEqual([]);
});

test('Updates feed fits a phone screen @phone', async ({ page }) => {
  await stub(page);
  await page.goto(R + '/updates/');
  await page.getByRole('button', { name: /Show video titles/ }).click();
  await expect(page.getByRole('link', { name: /rare car location/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
