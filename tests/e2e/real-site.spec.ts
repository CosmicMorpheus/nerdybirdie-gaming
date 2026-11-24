import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REAL = 'http://localhost:4321';
const PAGES = ['/', '/games/', '/games/gta-vi/', '/games/gta-vi/achievements/', '/games/gta-vi/guides/', '/games/gta-vi/guides/tips/', '/games/gta-vi/guides/walkthrough/', '/progress/', '/search/', '/about/', '/privacy/', '/corrections/', '/updates/'];

test('COZMC links are exact, separate, and open safely', async ({ page }) => {
  await page.goto(REAL + '/');
  const panel = page.locator('section.cozmc');
  await expect(panel.getByRole('link', { name: /Join the COZMC Discord/ })).toHaveAttribute('href', 'https://discord.gg/VBeBE7MSSq');
  await expect(panel.getByRole('link', { name: /Explore COZMC.US/ })).toHaveAttribute('href', 'https://cozmc.us/');
  for (const a of await page.locator('a[target=_blank]').all()) await expect(a).toHaveAttribute('rel', /noopener/);
  await expect(page.locator('footer').getByRole('link', { name: /COZMC Discord/ })).toBeVisible();
  await expect(page.locator('header').getByRole('link', { name: /COZMC Discord/ })).toBeVisible();
});

test('preview build is not indexable', async ({ page, request }) => {
  await page.goto(REAL + '/');
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/);
  expect(await (await request.get(REAL + '/robots.txt')).text()).toContain('Disallow: /');
});

test('tracker shows an honest empty state, not fake data', async ({ page }) => {
  await page.goto(REAL + '/games/gta-vi/achievements/');
  await expect(page.getByText(/Xbox Series X\|S achievements list isn't verified yet/)).toBeVisible();
  await expect(page.getByText('—', { exact: true })).toBeVisible();
  await page.getByRole('radio', { name: 'PS5' }).check();
  await expect(page.getByText(/PlayStation 5 trophies list isn't verified yet/)).toBeVisible();
});

test('the public build contains no fixture data', () => {
  const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
  for (const f of walk('dist').filter((f) => /\.(html|json|js)$/.test(f))) {
    expect(readFileSync(f, 'utf8'), f).not.toMatch(/FIXTURE|Fixture objective|TEST BUILD/);
  }
});

test('platforms come from the official source and PC is not claimed', async ({ page }) => {
  await page.goto(REAL + '/games/gta-vi/');
  await expect(page.getByText('Xbox Series X|S · PlayStation 5')).toBeVisible();
  await expect(page.getByRole('link', { name: /Rockstar Games: Grand Theft Auto VI Now Available/ })).toHaveAttribute('href', 'https://www.rockstargames.com/newswire/article/39akk424a9oo53');
});

for (const path of PAGES) {
  test(`axe: no serious accessibility issues on ${path}`, async ({ page }) => {
    await page.goto(REAL + path);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
  });
}

test('@phone no sideways scrolling at phone and 320px widths', async ({ page }) => {
  for (const w of [320, 390]) {
    await page.setViewportSize({ width: w, height: 800 });
    for (const path of PAGES) {
      await page.goto(REAL + path);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(over, `${path} at ${w}px`).toBeLessThanOrEqual(0);
    }
  }
});

test('@phone mobile menu has both community links', async ({ page }) => {
  await page.goto(REAL + '/');
  await page.getByText('Menu', { exact: true }).click();
  const sheet = page.locator('.sheet');
  await expect(sheet.getByRole('link', { name: /Join the COZMC Discord/ })).toHaveAttribute('href', 'https://discord.gg/VBeBE7MSSq');
  await expect(sheet.getByRole('link', { name: /Explore COZMC.US/ })).toHaveAttribute('href', 'https://cozmc.us/');
});

test('real guide entries: every entry cites Rockstar with a check date; walkthrough is honestly empty', async ({ page }) => {
  await page.goto(REAL + '/games/gta-vi/guides/tips/');
  const entries = page.locator('li.entry');
  await expect(entries.first()).toBeVisible();
  for (const e of await entries.all()) {
    await e.getByRole('button', { name: /More details/ }).click();
    await e.locator('summary', { hasText: 'Sources and last checked' }).click();
    await expect(e.locator('.sources-box a').first()).toHaveAttribute('href', /^https:\/\/www\.rockstargames\.com\//);
    await expect(e.locator('.sources-box')).toContainText(/checked \d{4}-\d{2}-\d{2}/);
  }
  await page.goto(REAL + '/games/gta-vi/guides/walkthrough/');
  await expect(page.getByText(/Nothing verified for Walkthrough yet/)).toBeVisible();
});

test('character bios are behind a deliberate reveal', async ({ page }) => {
  await page.goto(REAL + '/games/gta-vi/guides/tips/');
  await expect(page.locator('body')).not.toContainText('Leonida Penitentiary');
  const e = page.locator('li.entry', { hasText: 'Meet the main characters' });
  await expect(e).toContainText('Mild spoiler');
  await e.getByRole('button', { name: /More details/ }).click();
  await e.getByRole('button', { name: /Reveal mild spoiler/ }).click();
  await expect(e).toContainText('Leonida Penitentiary');
});
