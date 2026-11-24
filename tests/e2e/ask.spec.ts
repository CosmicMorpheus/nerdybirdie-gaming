import { test, expect } from '@playwright/test';

// TEST DATA: the mocked server responses below are fixtures, not real game information.
const T = 'http://localhost:4322';
const NAME = 'ASK "COZMC"';

test('button and chat header use the exact name; greeting asks what to find', async ({ page }) => {
  await page.goto(T + '/');
  const fab = page.getByRole('button', { name: NAME, exact: false });
  await expect(fab).toHaveText(/ASK "COZMC"/);
  await fab.click();
  await expect(page.getByRole('dialog', { name: NAME })).toBeVisible();
  await expect(page.locator('.ask-head h2')).toHaveText(/^ASK "COZMC"GTA VI guide helper$/); // exact name + subtitle
  await expect(page.getByText('What are you trying to find in GTA?')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: NAME })).toHaveCount(0);
});

test('browser-only (option A): answers from our guide with a real Show on map action, and sends nothing anywhere', async ({ page }) => {
  const sent: string[] = [];
  page.on('request', (r) => { if (r.method() !== 'GET' || r.url().includes('/api/')) sent.push(`${r.method()} ${r.url()}`); });
  await page.goto(T + '/');
  await page.getByRole('button', { name: /ASK "COZMC"/ }).click();
  await page.getByLabel('Your question').fill('Where is Fixture card one?');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  const answer = page.locator('.ask-from').last();
  await expect(answer).toContainText('Fixture card one');
  await expect(page.locator('.ask-foot')).toContainText('your questions aren’t sent anywhere');
  expect(sent).toEqual([]);
  await answer.getByRole('link', { name: /Show on map/ }).click();
  await expect(page.locator('.pin-detail h2')).toHaveText('Fixture card one');
});

test('browser-only: an unknown question gets an honest "no verified answer" and the Discord option', async ({ page }) => {
  await page.goto(T + '/');
  await page.getByRole('button', { name: /ASK "COZMC"/ }).click();
  await page.getByLabel('Your question').fill('Where is the purple unicorn?');
  await page.keyboard.press('Enter');
  const a = page.locator('.ask-from').last();
  await expect(a).toContainText("We don't have a verified answer for that yet");
  await expect(a.getByRole('link', { name: /COZMC Discord/ })).toHaveAttribute('href', /discord\.gg/);
});

test('review page: approve and undo call the private API with the editor token', async ({ page }) => {
  const calls: unknown[] = [];
  const item = { id: 'keep-test-fixture-comet', clusterKey: 'keep:gta-vi:entry:fx-tip-1', intent: 'keep', title: 'Can I keep the Fixture Comet? (TEST)', questions: [{ text: 'Can I keep it? (TEST)', at: '2026-11-24T10:00:00Z' }], count: 3,
    firstAt: '2026-11-24T10:00:00Z', lastAt: '2026-11-24T10:20:00Z', origin: 'player', affected: { id: 'gta-vi:entry:fx-tip-1', title: 'Fixture entry fx-tip-1', href: '/games/gta-vi/guides/tips/' },
    gap: 'TEST gap', findings: null, findingsCheckedAt: null, draft: { id: 'gta-vi:entry:fx-tip-1', title: 'TEST draft' }, needsVerification: ['TEST: needs a second source'], status: 'open', log: [] };
  await page.route('**/api/guide-updates', async (r) => {
    if (r.request().headers().authorization !== 'Bearer test-editor-token-0123456789abcdef') return r.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"no"}' });
    if (r.request().method() === 'POST') { calls.push(JSON.parse(r.request().postData()!)); return r.fulfill({ contentType: 'application/json', body: '{"ok":true}' }); }
    return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: [item], overrides: {}, history: [{ id: 'h1', at: '2026-11-24T11:00:00Z', itemId: item.id, entryId: 'gta-vi:entry:fx-tip-1', before: null, after: { version: 1 } }] }) });
  });
  await page.goto(T + '/admin/guide-updates/');
  await page.waitForFunction(() => !document.querySelector('astro-island[ssr]')); // all islands hydrated
  await page.getByLabel('Editor token').fill('test-editor-token-0123456789abcdef');
  await page.getByRole('button', { name: 'Open queue' }).click();
  await page.locator('.pin-list button', { hasText: 'Can I keep the Fixture Comet?' }).click();
  await expect(page.getByText('TEST: needs a second source')).toBeVisible();
  await expect(page.locator('.admin-compare pre')).toContainText('Fixture entry fx-tip-1'); // current entry beside the proposal
  await page.getByRole('button', { name: 'Approve & publish' }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  expect(calls).toEqual([
    { action: 'approve', id: item.id, draft: { id: 'gta-vi:entry:fx-tip-1', title: 'TEST draft' } },
    { action: 'undo', id: 'h1' },
  ]);
});

test('@phone ASK button leaves the map controls usable', async ({ page }) => {
  await page.goto(T + '/games/gta-vi/map/');
  const fab = await page.getByRole('button', { name: /ASK "COZMC"/ }).boundingBox();
  const handle = await page.getByRole('button', { name: /Filters & list/ }).boundingBox();
  expect(fab!.y + fab!.height).toBeLessThanOrEqual(handle!.y); // sits above the bottom sheet handle
  await page.getByRole('button', { name: /Filters & list/ }).click();
  await expect(page.getByRole('searchbox', { name: 'Search the map' })).toBeVisible();
});
