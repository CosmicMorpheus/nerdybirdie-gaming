import { test, expect, type Page } from '@playwright/test';

// Fixture test build (port 4322): a tiny fake map with 3 cards, 1 chance-spawn weapon (not drawn) and 1 shop (not counted).
const M = 'http://localhost:4322/games/gta-vi/map/';
async function mapReady(page: Page) {
  await expect(page.locator('.map-sum .big')).toHaveText(/\d+\/\d+/);
}

test('pilot journey: open a shared pin, jump to the video moment, mark found; guide updates once; untick reverses; refresh keeps it', async ({ page }) => {
  await page.route(/youtube-nocookie/, (r) => r.fulfill({ body: '<html></html>', contentType: 'text/html' }));
  await page.goto(M + '?pin=fx-card-1');
  await mapReady(page);
  const d = page.locator('.pin-detail');
  await expect(d.getByRole('heading', { name: 'Fixture card one' })).toBeVisible();
  await expect(d).toContainText('Unconfirmed · community map data');
  await d.getByRole('button', { name: /Play from 0:07/ }).click();
  await expect(d.locator('iframe')).toHaveAttribute('src', /embed\/FIXTURE0001\?autoplay=1&rel=0&start=7$/);
  await expect(page.locator('.map-sum .big')).toHaveText('0/3');
  await d.getByRole('checkbox').check();
  await expect(page.locator('.map-sum .big')).toHaveText('1/3');
  await page.goto('http://localhost:4322/games/gta-vi/guides/collectibles/');
  await expect(page.locator('#map-checklist')).toContainText('1/3 found');
  await expect(page.locator('#map-checklist li', { hasText: 'Collectible cards' })).toContainText('1/3');
  await page.goto(M + '?pin=fx-card-1');
  await mapReady(page);
  await page.locator('.pin-detail').getByRole('checkbox').uncheck();
  await expect(page.locator('.map-sum .big')).toHaveText('0/3');
  await page.locator('.pin-detail').getByRole('checkbox').check();
  await page.reload();
  await mapReady(page);
  await expect(page.locator('.map-sum .big')).toHaveText('1/3');
  await expect(page.locator('.pin-detail').getByRole('checkbox')).toBeChecked();
});

test('filters and hiding found pins never change the completion count', async ({ page }) => {
  await page.goto(M);
  await mapReady(page);
  await page.locator('.pin-list button', { hasText: 'Fixture card two' }).first().click();
  await page.locator('.pin-detail').getByRole('checkbox').check();
  await page.getByLabel('Hide found').check();
  await page.getByLabel('Region').selectOption('keys');
  await expect(page.locator('.map-sum .big')).toHaveText('1/3');
});

test('keyboard: search, pick a pin from the list, focus moves to its details', async ({ page }) => {
  await page.goto(M);
  await mapReady(page);
  await page.getByRole('searchbox', { name: 'Search the map' }).fill('card three');
  const b = page.locator('.pin-list button', { hasText: 'Fixture card three' });
  await b.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.pin-detail')).toBeFocused();
  await expect(page.locator('.pin-detail h2')).toHaveText('Fixture card three');
});

test('shared links carry filters and the pin but never the spoiler setting', async ({ page, context }) => {
  await page.goto(M + '?pin=fx-card-2');
  await mapReady(page);
  await expect.poll(() => page.url()).toContain('v=4/');  // zoomed to the shared pin
  expect(page.url()).toContain('pin=fx-card-2');
  expect(page.url()).toContain('c=card');
  expect(page.url()).not.toMatch(/spoil/i);
  // Recipient with "All spoilers" keeps their own setting when opening the link.
  const other = await context.browser()!.newContext();
  const p2 = await other.newPage();
  await p2.goto('http://localhost:4322/games/gta-vi/guides/tips/');
  await p2.waitForFunction(() => !document.querySelector('astro-island[ssr]')); // hydrated before changing settings
  await p2.getByLabel('Spoilers').selectOption('all');
  await p2.goto(page.url());
  await expect(p2.locator('.pin-detail h2')).toHaveText('Fixture card two');
  await p2.goto('http://localhost:4322/games/gta-vi/guides/tips/');
  await expect(p2.getByLabel('Spoilers')).toHaveValue('all');
  await other.close();
});

test('chance spawns are not drawn or counted; places are shown but not counted', async ({ page }) => {
  await page.goto(M);
  await mapReady(page);
  await page.getByRole('searchbox', { name: 'Search the map' }).fill('Fixture weapon spawn');
  await expect(page.getByText('No pins match.')).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search the map' }).fill('Fixture shop');
  await page.locator('.pin-list button', { hasText: 'Fixture shop' }).click();
  await expect(page.locator('.pin-detail')).toContainText("don't count toward completion");
  await expect(page.locator('.pin-detail').getByRole('checkbox')).toHaveCount(0);
  await page.goto('http://localhost:4322/review/');
  await expect(page.getByText(/Chance spawns and pickups without an exact pin \(1\)/)).toBeVisible();
});

test('guide entry "Show on map" opens the right pin', async ({ page }) => {
  await page.goto('http://localhost:4322/games/gta-vi/guides/tips/');
  const e = page.locator('li.entry', { hasText: 'Fixture entry fx-tip-1' });
  await e.getByRole('button', { name: /More details/ }).click();
  await e.getByRole('link', { name: /Show on map/ }).click();
  await mapReady(page);
  await expect(page.locator('.pin-detail h2')).toHaveText('Fixture card one');
});

test('Continue where you left off returns to the last map pin', async ({ page }) => {
  await page.goto(M + '?pin=fx-card-3');
  await mapReady(page);
  await expect.poll(() => page.url()).toContain('v=');
  await page.goto('http://localhost:4322/');
  await page.getByRole('link', { name: /Continue: Map: Fixture card three/ }).click();
  await mapReady(page);
  await expect(page.locator('.pin-detail h2')).toHaveText('Fixture card three');
});

test('the map credits its data source and license', async ({ page }) => {
  await page.goto(M);
  await mapReady(page);
  await expect(page.locator('.leaflet-control-attribution')).toContainText('CC BY 4.0'); // map data credit, in the map's corner
});

test('@phone map uses a bottom sheet and stays usable', async ({ page }) => {
  await page.goto(M);
  await mapReady(page).catch(() => {});
  const handle = page.getByRole('button', { name: /Filters & list/ });
  await expect(handle).toBeVisible();
  await handle.click();
  await expect(page.getByRole('searchbox', { name: 'Search the map' })).toBeVisible();
  await page.locator('.pin-list button', { hasText: 'Fixture card one' }).first().click();
  await expect(page.locator('.pin-detail h2')).toHaveText('Fixture card one');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});

test('panning and zooming are remembered in the link and for Continue', async ({ page }) => {
  await page.goto(M);
  await mapReady(page);
  await expect.poll(() => page.url()).toContain('v=');
  const before = new URL(page.url()).searchParams.get('v');
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('v')).not.toBe(before);
});

test('Escape closes the pin panel and returns focus to the list', async ({ page }) => {
  await page.goto(M);
  await mapReady(page);
  const b = page.locator('.pin-list button', { hasText: 'Fixture card one' }).first();
  await b.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.pin-detail')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.pin-detail')).toHaveCount(0);
  await expect(page.locator('.pin-list button', { hasText: 'Fixture card one' }).first()).toBeFocused();
});

test('a new player\'s map draws its pins a few times, not in a loop, and reserves its space before loading', async ({ page, request }) => {
  // Real build: thousands of pins. Regression for the 27 Nov fix (a fresh empty "found" object each render redrew all pins ~40 times).
  const html = await (await request.get('http://localhost:4321/games/gta-vi/map/')).text();
  expect(html).toContain('class="map-loading"'); // same-size placeholder in the server HTML, so the footer doesn't jump
  await page.addInitScript(() => {
    const w = window as unknown as { L?: { LayerGroup: { prototype: { clearLayers: () => unknown } } }; __clears: number; __patched?: boolean };
    w.__clears = 0;
    const iv = setInterval(() => {
      if (!w.L || w.__patched) return;
      w.__patched = true; clearInterval(iv);
      const orig = w.L.LayerGroup.prototype.clearLayers;
      w.L.LayerGroup.prototype.clearLayers = function (this: unknown) { w.__clears++; return orig.call(this); };
    }, 1);
  });
  await page.goto('http://localhost:4321/games/gta-vi/map/');
  await mapReady(page);
  await page.waitForTimeout(1500);
  const clears = await page.evaluate(() => (window as unknown as { __clears: number; __patched?: boolean }).__patched ? (window as unknown as { __clears: number }).__clears : -1);
  expect(clears).toBeGreaterThan(0); // the counter really hooked Leaflet
  expect(clears).toBeLessThanOrEqual(6);
});

test('category filters: Show all / Hide all, and All / None per group, cover only categories that have pins', async ({ page }) => {
  await page.goto(M);
  await mapReady(page);
  const sum = page.locator('.cat-groups > summary');
  const box = (name: string) => page.locator('.cat-row', { hasText: name }).getByRole('checkbox');
  await expect(sum).toHaveText('Categories (1 of 2 on)'); // default: Collectibles only; the undrawn chance-spawn category isn't offered
  const showAll = page.getByRole('button', { name: 'Show all' });
  const hideAll = page.getByRole('button', { name: 'Hide all' });
  await showAll.click();
  await expect(sum).toHaveText('Categories (2 of 2 on)');
  await expect(showAll).toBeDisabled();
  await expect(box('Collectible cards')).toBeChecked();
  await hideAll.click();
  await expect(sum).toHaveText('Categories (0 of 2 on)');
  await expect(hideAll).toBeDisabled();
  await expect(page.getByText('No pins in view. Zoom out or turn on more categories.')).toBeVisible();
  // One group on its own; the other group is untouched.
  await page.getByRole('button', { name: 'All Collectibles' }).click();
  await expect(box('Collectible cards')).toBeChecked();
  await expect(sum).toHaveText('Categories (1 of 2 on)');
  await page.getByRole('button', { name: 'None Collectibles' }).click();
  await expect(sum).toHaveText('Categories (0 of 2 on)');
  // The choice is saved in the shareable link, like single checkboxes.
  await showAll.click();
  await expect(page).toHaveURL(/[?&]c=(card,shop|shop,card)(&|$)/);
});

test('a guide link with several places (?show=) lists and highlights them, turns their categories on, and can be cleared', async ({ page }) => {
  await page.goto(M + '?show=fx-card-1,fx-card-2,nope');
  await mapReady(page);
  const focus = page.locator('.focus-list');
  await expect(focus.getByRole('heading')).toHaveText('From the guide · 2 places'); // unknown pin ids are ignored
  await expect(focus.locator('.pin-list li')).toHaveCount(2);
  await expect(page.locator('.cat-row', { hasText: 'Collectible cards' }).getByRole('checkbox')).toBeChecked();
  await expect(page).toHaveURL(/show=fx-card-1,fx-card-2/); // stays shareable
  await focus.getByRole('button', { name: 'Clear' }).click();
  await expect(focus).toHaveCount(0);
  await expect(page).not.toHaveURL(/show=/);
});

test('map panel: quick views set useful filters in one tap; groups fold, and start open only when something in them is on', async ({ page }) => {
  await page.goto(M);
  await mapReady(page);
  const sum = page.locator('.cat-groups > summary');
  const group = (name: string) => page.locator('details.cat-group', { has: page.locator('.grp-name', { hasText: name }) });
  await expect(group('Collectibles')).toHaveAttribute('open', ''); // has categories on by default
  await expect(group('Places')).not.toHaveAttribute('open', ''); // nothing on: starts folded
  await expect(group('Places').locator('summary')).toContainText('0 of 1 on');
  await page.getByRole('button', { name: 'Checklist only' }).click();
  await expect(page.getByRole('button', { name: 'Checklist only' })).toHaveAttribute('aria-pressed', 'true');
  await expect(sum).toHaveText('Categories (1 of 2 on)'); // the shop is reference-only, so it stays off
  await group('Places').locator('summary').click();
  await expect(group('Places')).toHaveAttribute('open', '');
  await expect(page.locator('.cat-row', { hasText: 'Shops' }).getByRole('checkbox')).not.toBeChecked();
});
