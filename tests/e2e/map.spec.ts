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
  await expect(page.locator('.map-credit')).toContainText('CC BY 4.0');
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
