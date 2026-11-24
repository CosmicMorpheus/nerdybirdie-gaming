import { test, expect, type Page } from '@playwright/test';
import { readFileSync, readdirSync, statSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Runs against the fixture test build (dist-test/, port 4322). Fixture objectives are fake; protected text starts "FIXTURE-SECRET".
const T = 'http://localhost:4322/games/gta-vi/achievements/';
const SECRET = /FIXTURE-SECRET/;

const row = (page: Page, title: string) => page.locator('li.row', { has: page.locator('label', { hasText: title }) });
const checkbox = (page: Page, title: string) => page.getByRole('checkbox', { name: title, exact: true });

async function open(page: Page) {
  await page.goto(T);
  await expect(page.locator('.tracker .summary')).toContainText('of'); // hydrated, list loaded
}

test('spoiler text is not in the page, its metadata, or the search index', async ({ page, request }) => {
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await open(page);
  expect(await page.content()).not.toMatch(SECRET);
  expect(requests.some((u) => u.includes('protected.json'))).toBe(false); // not fetched before a reveal
  expect(await (await request.get('http://localhost:4322/data/search.json')).text()).not.toMatch(SECRET);

  const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
  const leaking = walk('dist-test').filter((f) => !f.endsWith('protected.json') && /\.(html|json|js|txt|xml)$/.test(f) && SECRET.test(readFileSync(f, 'utf8')));
  expect(leaking).toEqual([]);
});

test('check/uncheck updates totals and survives a reload', async ({ page }) => {
  await open(page);
  const summary = page.locator('.tracker .summary');
  await expect(summary).toContainText('0 of 7 achievements');
  await checkbox(page, 'Fixture objective 01').check();
  await expect(summary).toContainText('1 of 7');
  await expect(summary).toContainText('14%');
  await page.reload();
  await expect(checkbox(page, 'Fixture objective 01')).toBeChecked();
  await expect(summary).toContainText('1 of 7');
  await checkbox(page, 'Fixture objective 01').uncheck();
  await expect(summary).toContainText('0 of 7');
});

test('Xbox and PS5 progress are kept separate', async ({ page }) => {
  await open(page);
  await checkbox(page, 'Fixture objective 01').check();
  await page.getByRole('radio', { name: 'PS5' }).check();
  await expect(page.locator('.tracker .summary')).toContainText('0 of 7 trophies');
  await expect(checkbox(page, 'Fixture objective 01')).not.toBeChecked();
  await page.reload();
  await expect(page.getByRole('radio', { name: 'PS5' })).toBeChecked(); // platform choice remembered
  await page.getByRole('radio', { name: 'Xbox Series X|S' }).check();
  await expect(checkbox(page, 'Fixture objective 01')).toBeChecked();
});

test('spoilers: safe by default, reveal one, mode change hides again', async ({ page }) => {
  await open(page);
  await expect(page.locator('.list')).not.toContainText(SECRET);
  await row(page, 'Fixture hidden objective 05').getByRole('button', { name: /Reveal/ }).click();
  await expect(page.locator('.list')).toContainText('FIXTURE-SECRET-TITLE-xbox-series-05');
  await expect(page.locator('.list')).not.toContainText('FIXTURE-SECRET-TITLE-xbox-series-06'); // only the one revealed
  await page.getByLabel('Spoilers').selectOption('minor');
  await expect(page.locator('.list')).toContainText('FIXTURE-SECRET-TITLE-xbox-series-06'); // minor shown
  await expect(page.locator('.list')).not.toContainText('FIXTURE-SECRET-TITLE-xbox-series-05'); // major hidden again
  await page.reload();
  await expect(page.getByLabel('Spoilers')).toHaveValue('minor');
  await page.getByLabel('Spoilers').selectOption('safe');
  await expect(page.locator('.list')).not.toContainText(SECRET);
});

test('search uses safe text only; filters and bookmarks work', async ({ page }) => {
  await open(page);
  const search = page.getByRole('searchbox', { name: /Search achievements/ });
  await search.fill('FIXTURE-SECRET');
  await expect(page.locator('li.row')).toHaveCount(0);
  await search.fill('objective 03');
  await expect(page.locator('li.row')).toHaveCount(1);
  await search.fill('');
  await checkbox(page, 'Fixture objective 02').check();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('li.row')).toHaveCount(1);
  await page.getByRole('button', { name: 'To do', exact: true }).click();
  await expect(page.locator('li.row')).toHaveCount(6);
  await page.getByRole('button', { name: 'All', exact: true }).first().click();
  await row(page, 'Fixture objective 04').getByRole('button', { name: /Save/ }).click();
  await page.getByRole('button', { name: /^Saved/ }).click();
  await expect(page.locator('li.row')).toHaveCount(1);
  await page.reload();
  await page.getByRole('button', { name: /^Saved/ }).click();
  await expect(page.locator('li.row')).toHaveCount(1);
});

test('missable and draft entries are labelled', async ({ page }) => {
  await open(page);
  await expect(row(page, 'Fixture objective 02')).toContainText('Missable');
  await expect(row(page, 'Fixture objective 07')).toContainText('Draft · unverified');
});

test('notes persist', async ({ page }) => {
  await open(page);
  await row(page, 'Fixture objective 03').getByRole('button', { name: /Note for/ }).click();
  await page.getByRole('textbox', { name: 'Your note' }).fill('do this at night');
  await page.reload();
  await row(page, 'Fixture objective 03').getByRole('button', { name: /Note for/ }).click();
  await expect(page.getByRole('textbox', { name: 'Your note' })).toHaveValue('do this at night');
});

test('reset asks first, and cancel keeps everything', async ({ page }) => {
  await open(page);
  await checkbox(page, 'Fixture objective 01').check();
  await page.getByRole('button', { name: /Reset Xbox Series X\|S progress/ }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(checkbox(page, 'Fixture objective 01')).toBeChecked();
  await page.getByRole('button', { name: /Reset Xbox Series X\|S progress/ }).click();
  await page.getByRole('button', { name: 'Yes, clear it' }).click();
  await expect(checkbox(page, 'Fixture objective 01')).not.toBeChecked();
});

test('keyboard only: tick an objective', async ({ page }) => {
  await open(page);
  await checkbox(page, 'Fixture objective 01').focus();
  await page.keyboard.press('Space');
  await expect(checkbox(page, 'Fixture objective 01')).toBeChecked();
});

test('blocked storage: works for the visit and explains why it won\'t save', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
  });
  await open(page);
  await expect(page.getByText(/isn't letting this site save/)).toBeVisible();
  await checkbox(page, 'Fixture objective 01').check();
  await expect(page.locator('.tracker .summary')).toContainText('1 of 7');
});

test('backup: export, bad import rejected without data loss, good import restores', async ({ page }) => {
  await open(page);
  await checkbox(page, 'Fixture objective 01').check();
  await page.goto('http://localhost:4322/progress/');
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download backup' }).click();
  const file = await (await dl).path();
  const backup = readFileSync(file!, 'utf8');
  expect(JSON.parse(backup).contexts['gta-vi|xbox-series'].completed).toHaveProperty(['gta-vi:fixture:xbox-series-01']);

  const dir = mkdtempSync(join(tmpdir(), 'nbg-'));
  const bad = join(dir, 'bad.json');
  writeFileSync(bad, '{"hello":1}');
  await page.locator('input[type=file]').setInputFiles(bad);
  await expect(page.getByText(/isn't a Nerdy Birdie Gaming backup. Nothing was changed/)).toBeVisible();

  // Untick, then restore the backup: preview first, then confirm.
  await open(page);
  await expect(checkbox(page, 'Fixture objective 01')).toBeChecked(); // saved state loaded
  await checkbox(page, 'Fixture objective 01').uncheck();
  await page.goto('http://localhost:4322/progress/');
  const good = join(dir, 'good.json');
  writeFileSync(good, backup);
  await page.locator('input[type=file]').setInputFiles(good);
  await expect(page.getByRole('alertdialog')).toContainText('1 new');
  await page.getByRole('button', { name: 'Restore backup' }).click();
  await open(page);
  await expect(checkbox(page, 'Fixture objective 01')).toBeChecked();
});

test('@phone tracker is usable on a phone: no sideways scroll, big tap targets', async ({ page }) => {
  await open(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  const box = await page.locator('li.row .act').first().boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await checkbox(page, 'Fixture objective 01').tap();
  await expect(checkbox(page, 'Fixture objective 01')).toBeChecked();
});
