import { test, expect } from '@playwright/test';

// Fixture test build (port 4322). Guides and the video are fake.
const G = 'http://localhost:4322/games/gta-vi/guides/';

test('guide checklist: tick steps, progress persists, quest board updates', async ({ page }) => {
  await page.goto(G + 'fixture-money/');
  await expect(page.locator('.summary')).toContainText('0/3');
  await page.getByRole('checkbox', { name: 'Fixture step 1', exact: true }).check();
  await expect(page.locator('.summary')).toContainText('1/3');
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Fixture step 1', exact: true })).toBeChecked();
  await page.goto(G);
  await expect(page.locator('.quest', { hasText: 'Money' })).toContainText('1/3');
});

test('clearing every step stamps the guide as cleared', async ({ page }) => {
  await page.goto(G + 'fixture-tips/');
  await page.getByRole('checkbox', { name: 'Fixture step 1', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Fixture step 2', exact: true }).check();
  await expect(page.getByText('Guide cleared!')).toBeVisible();
  await page.goto(G);
  await expect(page.locator('.quest', { hasText: 'Tips' }).locator('.stamp')).toHaveText('Cleared');
});

test('video: nothing loads from YouTube until play is pressed; creator credited', async ({ page }) => {
  const yt: string[] = [];
  page.on('request', (r) => { if (/youtube|ytimg|googlevideo/.test(r.url())) yt.push(r.url()); });
  await page.goto(G + 'fixture-money/');
  await expect(page.getByRole('link', { name: 'Fixture Creator' })).toHaveAttribute('href', 'https://example.com/fixture-channel');
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(yt).toEqual([]);
  await page.route(/youtube-nocookie/, (r) => r.fulfill({ body: '<html></html>', contentType: 'text/html' }));
  await page.getByRole('button', { name: /Play video/ }).click();
  await expect(page.locator('iframe')).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/FIXTURE0001\?autoplay=1&rel=0&start=42$/);
});

test('guide step spoilers: hidden by default, reveal shows one step', async ({ page }) => {
  await page.goto(G + 'fixture-money/');
  await expect(page.locator('.steps')).not.toContainText('FIXTURE-SECRET');
  await page.getByRole('button', { name: /Reveal step/ }).click();
  await expect(page.locator('.steps')).toContainText('FIXTURE-SECRET-STEP-fixture-money-3');
});

test('every guide cites its sources with links', async ({ page }) => {
  await page.goto(G + 'fixture-money/');
  await expect(page.locator('.sources a').first()).toHaveAttribute('href', /^https:\/\//);
  await expect(page.locator('.cite').first()).toContainText('Source:');
});

test('tracker: crossing a checkpoint celebrates and shows the rank', async ({ page }) => {
  await page.goto('http://localhost:4322/games/gta-vi/achievements/');
  const summary = page.locator('.tracker .summary');
  await expect(summary).toContainText('New Arrival');
  await page.getByRole('checkbox', { name: 'Fixture objective 01', exact: true }).check();
  await expect(summary).toContainText('Local');
  await page.getByRole('checkbox', { name: 'Fixture objective 02', exact: true }).check();
  await expect(page.locator('.toast')).toContainText('Checkpoint! 25% reached');
  await expect(summary).toContainText('Hustler');
  // Next up lists the missable item first until it's done
  await page.reload();
  await expect(page.locator('.next-up li').first()).not.toContainText('Fixture objective 02');
});

test('home HUD reflects progress from both tracker and guides', async ({ page }) => {
  await page.goto('http://localhost:4322/games/gta-vi/achievements/');
  await page.getByRole('checkbox', { name: 'Fixture objective 01', exact: true }).check();
  await page.goto(G + 'fixture-tips/');
  await page.getByRole('checkbox', { name: 'Fixture step 1', exact: true }).check();
  await page.goto('http://localhost:4322/');
  const hud = page.locator('.hud');
  await expect(hud).toContainText('1/7');
  await expect(hud).toContainText('1/5');
  await expect(hud).toContainText('16% complete'); // 2 of 12
});
