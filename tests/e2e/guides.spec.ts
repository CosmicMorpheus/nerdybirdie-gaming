import { test, expect, type Page } from '@playwright/test';

// Fixture test build (port 4322). Entries and the video are fake; spoiler text starts "FIXTURE-SECRET".
const G = 'http://localhost:4322/games/gta-vi/guides/';
const box = (page: Page, slug: string) => page.getByRole('checkbox', { name: `Fixture entry ${slug}`, exact: true });
const entry = (page: Page, slug: string) => page.locator('li.entry', { has: page.locator('label', { hasText: `Fixture entry ${slug}` }) });
async function ready(page: Page) { await expect(page.locator('.save-status')).not.toHaveText(/Loading/); }

test('check an entry: saves, says so, survives reload, shows on quest board and My Progress', async ({ page }) => {
  await page.goto(G + 'tips/');
  await ready(page);
  await box(page, 'fx-tip-1').check();
  await expect(page.locator('.save-status')).toHaveText(/Saved on this device/);
  await expect(page.locator('.summary')).toContainText('1/3');
  await page.reload();
  await expect(box(page, 'fx-tip-1')).toBeChecked();
  await page.goto(G);
  await expect(page.locator('.quest', { hasText: 'Beginner tips' })).toContainText('1/3');
  await page.goto('http://localhost:4322/progress/');
  await expect(page.locator('.ctx-list li', { hasText: 'Beginner tips' })).toContainText('1 of 3');
  await expect(page.getByText(/in this browser on this device/).first()).toBeVisible();
});

test('verification labels are shown and rumors are never labelled confirmed', async ({ page }) => {
  await page.goto(G + 'tips/');
  await expect(entry(page, 'fx-tip-1').locator('.tag.v-ok')).toHaveText(/Confirmed/);
  await expect(entry(page, 'fx-tip-2').locator('.tag.v-warn')).toHaveText(/Unconfirmed/);
  await expect(entry(page, 'fx-tip-3').locator('.tag.v-bad')).toHaveText(/Rumor/);
  await expect(entry(page, 'fx-tip-3')).not.toContainText('Confirmed');
});

test('More details shows steps, facts and sources with last-checked dates', async ({ page }) => {
  await page.goto(G + 'tips/');
  await entry(page, 'fx-tip-1').getByRole('button', { name: /More details/ }).click();
  const more = entry(page, 'fx-tip-1').locator('.entry-more');
  await expect(more).toContainText('Fixture step one.');
  await expect(more).toContainText('Fixture fact');
  await more.locator('summary', { hasText: 'Sources and last checked' }).click();
  await expect(more.getByRole('link', { name: /Test fixture/ })).toHaveAttribute('href', 'https://example.com/fixture');
  await expect(more).toContainText('checked 2026-11-24');
});

test('spoilers: hidden by default, deliberate reveal, mode change hides again', async ({ page }) => {
  await page.goto(G + 'walkthrough/');
  await expect(page.locator('body')).not.toContainText('FIXTURE-SECRET');
  await expect(entry(page, 'fx-walk-2')).toContainText('Major spoiler');
  await entry(page, 'fx-walk-2').getByRole('button', { name: /More details/ }).click();
  await expect(entry(page, 'fx-walk-2')).not.toContainText('FIXTURE-SECRET');
  await entry(page, 'fx-walk-2').getByRole('button', { name: /Reveal major spoiler/ }).click();
  await expect(entry(page, 'fx-walk-2')).toContainText('FIXTURE-SECRET-fx-walk-2');
  await page.getByLabel('Spoilers').selectOption('minor');
  await expect(entry(page, 'fx-walk-2')).not.toContainText('FIXTURE-SECRET');
});

test('search and filters: section, spoiler level, verification, done', async ({ page }) => {
  await page.goto(G);
  await ready(page);
  const rows = page.locator('li.entry');
  await expect(rows).toHaveCount(7); // test build shows the draft too, labelled
  await page.getByRole('searchbox', { name: 'Search guide entries' }).fill('FIXTURE-SECRET');
  await expect(rows).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Search guide entries' }).fill('fx-walk');
  await expect(rows).toHaveCount(2);
  await page.getByRole('searchbox', { name: 'Search guide entries' }).fill('');
  await page.getByRole('combobox', { name: /^Section/ }).selectOption('money');
  await expect(rows).toHaveCount(2);
  await page.getByRole('combobox', { name: /^Section/ }).selectOption('all');
  await page.getByLabel('Spoiler level').selectOption('major');
  await expect(rows).toHaveCount(1);
  await page.getByLabel('Spoiler level').selectOption('all');
  await page.getByLabel('Verification').selectOption('rumor');
  await expect(rows).toHaveCount(1);
  await page.getByLabel('Verification').selectOption('all');
  await box(page, 'fx-money-1').check();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(rows).toHaveCount(1);
  await expect(entry(page, 'fx-draft-1')).toHaveCount(0);
});

test('empty sections explain that nothing is verified yet', async ({ page }) => {
  await page.goto(G + 'weapons/');
  await expect(page.getByText(/Nothing verified for Rare weapons yet/)).toBeVisible();
});

test('video: nothing loads from YouTube until play is pressed; creator credited', async ({ page }) => {
  const yt: string[] = [];
  page.on('request', (r) => { if (/youtube|ytimg|googlevideo/.test(r.url())) yt.push(r.url()); });
  await page.goto(G + 'tips/');
  await entry(page, 'fx-tip-1').getByRole('button', { name: /More details/ }).click();
  await expect(page.getByRole('link', { name: 'Fixture Creator' })).toHaveAttribute('href', 'https://example.com/fixture-channel');
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(yt).toEqual([]);
  await page.route(/youtube-nocookie/, (r) => r.fulfill({ body: '<html></html>', contentType: 'text/html' }));
  await expect(page.getByRole('button', { name: /Play from 0:42/ })).toBeVisible();
  await page.getByRole('button', { name: /Play from 0:42/ }).click();
  await expect(page.locator('iframe')).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/FIXTURE0001\?autoplay=1&rel=0&start=42$/);
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
});

test('home HUD counts achievements and guide entries', async ({ page }) => {
  await page.goto('http://localhost:4322/games/gta-vi/achievements/');
  await page.getByRole('checkbox', { name: 'Fixture objective 01', exact: true }).check();
  await page.goto(G + 'tips/');
  await ready(page);
  await box(page, 'fx-tip-1').check();
  await page.goto('http://localhost:4322/');
  const hud = page.locator('.hud');
  await expect(hud.locator('.hud-meter', { hasText: 'Achievements' })).toContainText('1/7');
  await expect(hud.locator('.hud-meter', { hasText: 'Guide entries' })).toContainText('1/7'); // 7 entries in the test build
  await expect(hud).toContainText('2 of 14 checked off');
  await expect(hud).toContainText("not the game's own 100%");
});

test('spoiler videos hide their title until shown; Twitch embeds list this host as parent', async ({ page }) => {
  await page.goto(G + 'walkthrough/');
  const e = entry(page, 'fx-walk-1');
  await e.getByRole('button', { name: /More details/ }).click();
  await expect(e).not.toContainText('Fixture spoiler moment');
  await e.getByRole('button', { name: /Show video/ }).click();
  await expect(e).toContainText('Fixture spoiler moment');
  await page.route(/player\.twitch\.tv/, (r) => r.fulfill({ body: '<html></html>', contentType: 'text/html' }));
  await e.getByRole('button', { name: /Play from 1:02:03/ }).click();
  await expect(e.locator('iframe')).toHaveAttribute('src', /^https:\/\/player\.twitch\.tv\/\?video=v1234567890&parent=localhost&parent=guides\.nerdy-birdie\.com&parent=nerdybirdiegameguides\.netlify\.app&autoplay=true&time=1h2m3s$/);
});

test('videos still in review are labelled on the preview, and the original link is always offered', async ({ page }) => {
  await page.goto(G + 'tips/');
  const e = entry(page, 'fx-tip-2');
  await e.getByRole('button', { name: /More details/ }).click();
  await expect(e.locator('.video-flag')).toContainText('Not yet checked');
  await expect(e.getByRole('link', { name: /Watch on TikTok/ })).toHaveAttribute('href', 'https://www.tiktok.com/@fixture/video/1234567890123456789');
});

test('one shared store: ticking an entry updates the quest board on the same page without reloading', async ({ page }) => {
  await page.goto(G);
  await ready(page);
  const board = page.locator('.quest', { hasText: 'Beginner tips' });
  await expect(board).toContainText('0/3');
  await box(page, 'fx-tip-1').check();
  await expect(board).toContainText('1/3');
});

test('revealing a video does not reveal the written spoiler details (and vice versa)', async ({ page }) => {
  await page.goto(G + 'walkthrough/');
  const e = entry(page, 'fx-walk-1');
  await e.getByRole('button', { name: /More details/ }).click();
  await e.getByRole('button', { name: /Show video/ }).click();
  const w2 = entry(page, 'fx-walk-2');
  await w2.getByRole('button', { name: /More details/ }).click();
  await expect(w2).not.toContainText('FIXTURE-SECRET');
});

test('every guide checkbox is labelled by its entry title (no duplicate ids)', async ({ page }) => {
  await page.goto(G);
  const dupes = await page.evaluate(() => { const ids = [...document.querySelectorAll('[id]')].map((e) => e.id); return ids.filter((id, i) => ids.indexOf(id) !== i); });
  expect(dupes).toEqual([]);
  for (const c of await page.locator('li.entry input[type=checkbox]').all()) await expect(c).toHaveAccessibleName(/Fixture entry/);
});
