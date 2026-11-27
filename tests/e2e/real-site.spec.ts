import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REAL = 'http://localhost:4321';
const PAGES = ['/', '/games/', '/games/gta-vi/', '/games/gta-vi/achievements/', '/games/gta-vi/guides/', '/games/gta-vi/guides/tips/', '/games/gta-vi/guides/walkthrough/', '/games/gta-vi/guides/collectibles/', '/games/gta-vi/map/', '/account/', '/progress/', '/search/', '/about/', '/privacy/', '/corrections/', '/credits/', '/updates/'];

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

test('achievements: real Xbox and PS5 lists, spoiler-safe, ticks saved per platform', async ({ page }) => {
  await page.goto(REAL + '/games/gta-vi/achievements/');
  await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
  const rows = page.locator('li.row');
  await expect(rows).toHaveCount(54);
  await expect(page.locator('li.row', { hasText: 'A Long Road' })).toContainText('100G');
  // Story trophies stay hidden until revealed; their text isn't in the page.
  await expect(page.locator('body')).not.toContainText('Operation Savage Glory');
  await expect(page.locator('li.row', { hasText: 'Positive Mental Attitude' })).toContainText('Missable');
  await page.locator('li.row', { hasText: 'Cunning Stunts' }).getByRole('checkbox').check();
  await page.getByRole('radio', { name: 'PS5' }).check();
  await expect(rows).toHaveCount(55);
  await expect(page.locator('li.row', { hasText: 'Vice Got a Price!' })).toContainText('Platinum');
  await expect(page.locator('li.row', { hasText: 'Cunning Stunts' }).getByRole('checkbox')).not.toBeChecked();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('nbg:progress')!));
  expect(Object.keys(saved.contexts['gta-vi|xbox-series'].completed)).toContain('gta-vi:xbox:cunning-stunts');
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

test('real guide entries: every entry cites a source with a check date', async ({ page }) => {
  await page.goto(REAL + '/games/gta-vi/guides/tips/');
  const entries = page.locator('li.entry');
  await expect(entries.first()).toBeVisible();
  for (const e of await entries.all()) {
    await e.getByRole('button', { name: /More details/ }).click();
    await e.locator('summary', { hasText: 'Sources and last checked' }).click();
    await expect(e.locator('.sources-box a').first()).toHaveAttribute('href', /^https:\/\/(www\.rockstargames\.com|www\.ign\.com|www\.youtube\.com)\//);
    await expect(e.locator('.sources-box')).toContainText(/checked \d{4}-\d{2}-\d{2}/);
  }
});

test('walkthrough: story missions in order, sourced, with plot details kept out of the page until revealed', async ({ page }) => {
  await page.goto(REAL + '/games/gta-vi/guides/walkthrough/');
  const titles = page.locator('li.entry .entry-head');
  await expect(titles.first()).toContainText('Prologue');
  expect(await page.locator('li.entry').count()).toBeGreaterThanOrEqual(68);
  // Spoiler text lives only in protected.json until the player reveals it.
  await expect(page.locator('body')).not.toContainText('packed up and left town');
  const e = page.locator('li.entry', { hasText: 'Don Gone' });
  await e.getByRole('button', { name: /More details/ }).click();
  await e.locator('summary', { hasText: 'Sources and last checked' }).click();
  await expect(e.locator('.sources-box a').first()).toHaveAttribute('href', 'https://www.ign.com/wikis/gta-6/Walkthrough');
  await e.getByRole('button', { name: /Reveal mild spoiler/ }).click();
  await expect(e).toContainText('packed up and left town');
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

test('accounts: the site says plainly that progress is device-only until accounts are switched on', async ({ page }) => {
  await page.goto(REAL + '/account/');
  await expect(page.getByText("Accounts aren't switched on yet")).toBeVisible();
  await expect(page.getByText(/in this browser on this device only/)).toBeVisible();
});

test('real map: loads the imported snapshot and finds the pilot card', async ({ page }) => {
  await page.goto(REAL + '/games/gta-vi/map/?pin=collectible-card-086');
  await expect(page.locator('.pin-detail h2')).toHaveText('Jack of Hearts card: Pricilla Pace (Silver)');
  await expect(page.locator('.pin-detail')).toContainText('Unconfirmed');
  await expect(page.locator('.pin-detail .video-flag')).toContainText('Not yet checked');
  await expect(page.locator('.pin-detail').getByRole('button', { name: /Play from 0:49/ })).toBeVisible();
});

test('robberies: own section on the board, every robbery spot listed, grouped by chapter', async ({ page }) => {
  await page.goto(REAL + '/games/gta-vi/guides/');
  await expect(page.locator('.quest', { hasText: 'Robberies & heists' })).toBeVisible();
  await page.goto(REAL + '/games/gta-vi/guides/robberies/');
  await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
  for (const name of ['Fishing Shacks', 'Exotic Animals Front', 'Backroom Weed Front', 'Industrial Weed Grow', 'Manatee Motel', 'Sunrise RV Park',
    'Brooks Boatworks', 'June Warehouse', 'Kingpin Bowling', 'La Cascara Motel', 'Stash House', 'Nova Auto Junkyard'])
    await expect(page.locator('li.entry', { hasText: name }).first()).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Jump to chapter' })).toContainText('Chapter 2');
  await expect(page.getByRole('heading', { name: /Chapter 2/ })).toBeVisible();
  // Moved from Money: same id, so an existing tick still counts.
  await expect(page.locator('#entry-money-kingfishers-fishing-shacks')).toBeVisible();
});

test('guides overview: the long list waits for a search, and results are grouped by section', async ({ page }) => {
  await page.goto(REAL + '/games/gta-vi/guides/');
  await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
  await expect(page.getByText(/Search all \d+ entries above/)).toBeVisible();
  await expect(page.locator('li.entry')).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Search guide entries' }).fill('safe');
  await expect(page.getByRole('navigation', { name: 'Jump to section' })).toContainText('Robberies & heists');
  expect(await page.locator('li.entry').count()).toBeGreaterThan(3);
});

test('robbery checklist: map colours, IGN cross-check, and a tick here is the same tick as on the map', async ({ page }) => {
  await page.goto(REAL + '/games/gta-vi/guides/robberies/');
  await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
  const list = page.locator('.robbery-list');
  for (const label of ['Illegal operations', "Smash 'n' Grabs", 'Stick-ups', 'Banks and vaults', 'Payday loans']) await expect(list.locator('summary', { hasText: label })).toBeVisible();
  const smash = list.locator('details', { has: page.locator('summary', { hasText: "Smash 'n' Grabs" }) });
  await smash.locator('summary').click();
  await expect(smash.locator('li', { hasText: 'Marshal' }).getByText('IGN lists it too')).toBeVisible();
  await smash.getByRole('checkbox', { name: /Marshal/ }).check();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('nbg:progress')!));
  expect(Object.keys(saved.contexts['gta-vi|map'].completed)).toContain('gta-vi:map:smash-n-grab-026');
  // No plain ATMs in the bank list.
  await list.locator('summary', { hasText: 'Banks and vaults' }).click();
  await expect(list.locator('li', { hasText: /^ATM/ })).toHaveCount(0);
  // Same tick on the map.
  await page.goto(REAL + '/games/gta-vi/map/?pin=smash-n-grab-026');
  await expect(page.locator('.pin-detail').getByRole('checkbox')).toBeChecked();
});

test('exploration: own section with a purple map checklist; Kenton sets link to their map pins', async ({ page }) => {
  await page.goto(REAL + '/games/gta-vi/guides/exploration/');
  await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
  const list = page.locator('.explore-list');
  for (const label of ['WAiNK', 'Treasures', 'Meditation']) await expect(list.locator('summary', { hasText: label }).first()).toBeVisible();
  const wrecks = list.locator('details', { has: page.locator('summary', { hasText: 'Treasures' }) });
  await wrecks.locator('summary').click();
  await expect(wrecks.getByText('IGN lists it too')).toHaveCount(5);
  const e = page.locator('li.entry', { hasText: 'Urca de Cinco Torres' });
  await e.getByRole('button', { name: /More details/ }).click();
  await expect(e.getByRole('link', { name: /Show on map/ })).toHaveAttribute('href', /pin=treasure-004/);
});

test('achievements show how-to tips and guide links; hidden tips only after Reveal', async ({ page }) => {
  await page.goto(REAL + '/games/gta-vi/achievements/');
  await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
  const wainker = page.locator('li.row', { hasText: 'You WAiNKer!' });
  await expect(wainker.locator('.ach-tip')).toContainText('WAiNK phone app');
  await expect(wainker.getByRole('link', { name: /WAiNK guide/ })).toHaveAttribute('href', '/games/gta-vi/guides/exploration/#entry-exploration-waink');
  await expect(page.locator('body')).not.toContainText('Keep the alarm off for a perfect heist');
  // Found by its permanent id: the visible text changes once revealed.
  const heist = page.locator('li.row', { has: page.locator('#o-gta-vi-xbox-break-the-bank') });
  await expect(heist).toContainText('Story progress (Chapter 3).');
  await heist.getByRole('button', { name: /Reveal/ }).click();
  await expect(heist).toContainText('Break the Bank');
  await expect(heist.locator('.ach-tip')).toContainText('Keep the alarm off');
});

test('walkthrough Chapter 4: listed with a jump button, plot behind Reveal, choices flagged', async ({ page }) => {
  await page.goto(REAL + '/games/gta-vi/guides/walkthrough/');
  await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
  await expect(page.getByRole('navigation', { name: 'Jump to chapter' })).toContainText('Chapter 4');
  await expect(page.locator('body')).not.toContainText('Gustavo');
  const e = page.locator('li.entry', { hasText: "Child's Play" });
  await e.getByRole('button', { name: /More details/ }).click();
  await expect(e).toContainText('no lasting consequence');
  await e.getByRole('button', { name: /Reveal major spoiler/ }).click();
  await expect(e).toContainText('Gustavo');
});

test('standout vehicles: grouped location lists, access shown; the laptop-password secret is findable by its words', async ({ page }) => {
  await page.goto(REAL + '/games/gta-vi/guides/vehicles/');
  await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
  const fast = page.locator('li.entry', { hasText: 'Standout supercars' });
  await fast.getByRole('button', { name: /More details/ }).click();
  await expect(fast).toContainText('Granforma Tsunami Zorrusso');
  await expect(fast).toContainText('Needs the Key Cloner');
  await page.goto(REAL + '/games/gta-vi/guides/');
  await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
  await page.getByRole('searchbox').first().fill('muffins queen');
  await expect(page.locator('li.entry', { hasText: "Vanessa's pink Pfister Growler" })).toBeVisible();
});

test('report a problem: each entry links to a report helper that names the entry and builds the text; nothing is sent', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(REAL + '/games/gta-vi/guides/secrets/');
  await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
  const e = page.locator('li.entry', { hasText: "Vanessa's pink" });
  await e.getByRole('button', { name: /More details/ }).click();
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await e.getByRole('link', { name: 'Report a problem with this entry' }).click();
  await expect(page.locator('#report-entry')).toContainText("Vanessa's pink Pfister Growler");
  await page.getByLabel("What's the problem?").selectOption('Wrong or out of date');
  await page.getByLabel('What did you see, and how do you know?').fill('Garage code did not work on PS5');
  requests.length = 0;
  await page.getByRole('button', { name: 'Copy report' }).click();
  await expect(page.getByRole('status')).toContainText(/Copied|Select/);
  await expect(page.locator('#r-out')).toHaveValue(/Problem: Wrong or out of date[\s\S]*Garage code did not work/);
  expect(requests.filter((u) => !u.startsWith(REAL))).toEqual([]);
});

test('catalog and credits: the Games card shows status, counts and last update; Credits lists cited sources and the map licence', async ({ page }) => {
  await page.goto(REAL + '/games/');
  const card = page.locator('.lib li').first();
  await expect(card).toContainText('Available');
  await expect(card).toContainText('Free');
  await expect(card).toContainText(/\d+ guide entries in \d+ sections/);
  await expect(card).toContainText(/Last updated \d+ \w+ 2026/);
  await page.goto(REAL + '/credits/');
  await expect(page.locator('.pubs')).toContainText('IGN');
  await expect(page.locator('main')).toContainText('CC BY 4.0');
});

for (const path of ['/', '/games/gta-vi/guides/robberies/', '/credits/']) {
  test(`header logo goes to the games list from ${path}, keeps its name and shows keyboard focus`, async ({ page }) => {
    await page.goto(REAL + path);
    const logo = page.getByRole('link', { name: 'NerdyBirdie LLC Gaming Guides, games list', exact: true });
    await expect(logo).toHaveAttribute('href', '/games/');
    await expect(logo.locator('img')).toHaveAttribute('src', '/brand/nerdy-birdie-mark-96.webp');
    await page.keyboard.press('Tab');
    if (!(await logo.evaluate((el) => el === document.activeElement))) await page.keyboard.press('Tab'); // skip link first
    await expect(logo).toBeFocused();
    expect(await logo.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(REAL + '/games/');
    await expect(page.getByRole('heading', { level: 1, name: 'Games' })).toBeVisible();
  });
}
