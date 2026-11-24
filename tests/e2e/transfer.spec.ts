import { test, expect } from '@playwright/test';

// Fixture test build. Two separate browser contexts stand in for two different browsers/devices.
const T = 'http://localhost:4322';
const hydrated = (p: import('@playwright/test').Page) => p.waitForFunction(() => !document.querySelector('astro-island[ssr]'));

test('continue in another browser: copy a transfer link in A, open it in B, combine, pick up where you left off', async ({ browser }) => {
  const a = await (await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })).newPage();
  await a.goto(T + '/games/gta-vi/guides/tips/');
  await hydrated(a);
  await a.getByRole('checkbox', { name: 'Fixture entry fx-tip-1', exact: true }).check();
  await a.goto(T + '/games/gta-vi/map/?pin=fx-card-2');
  await expect(a.locator('.pin-detail h2')).toHaveText('Fixture card two');
  await a.locator('.pin-detail').getByRole('checkbox').check();

  await a.goto(T + '/progress/');
  await hydrated(a);
  await a.getByRole('button', { name: 'Copy transfer link' }).click();
  await expect(a.getByRole('button', { name: 'Link copied ✓' })).toBeVisible();
  const link = await a.locator('textarea.code').inputValue();
  expect(link).toMatch(/\/progress\/#transfer=z\./);
  expect(await a.evaluate(() => navigator.clipboard.readText())).toBe(link);

  // Browser B already has some progress of its own.
  const b = await (await browser.newContext()).newPage();
  await b.goto(T + '/games/gta-vi/guides/tips/');
  await hydrated(b);
  await b.getByRole('checkbox', { name: 'Fixture entry fx-tip-2', exact: true }).check();
  const sent: string[] = [];
  b.on('request', (r) => sent.push(r.url()));
  await b.goto(link);
  await hydrated(b);
  await expect.poll(() => b.evaluate(() => location.hash)).toBe(''); // code removed from the address bar
  expect(sent.some((u) => u.includes('transfer=') || u.includes('z.'))).toBe(false); // the code is never sent to the server
  await expect(b.getByRole('group', { name: 'Load transferred progress' })).toContainText('Load progress from your other browser?');
  await b.getByRole('button', { name: 'Combine (recommended)' }).click();
  await expect(b.getByText('Progress combined')).toBeVisible();

  await b.goto(T + '/games/gta-vi/guides/tips/');
  await hydrated(b);
  await expect(b.getByRole('checkbox', { name: 'Fixture entry fx-tip-1', exact: true })).toBeChecked(); // from A
  await expect(b.getByRole('checkbox', { name: 'Fixture entry fx-tip-2', exact: true })).toBeChecked(); // B's own, kept
  await b.goto(T + '/games/gta-vi/map/?pin=fx-card-2');
  await expect(b.locator('.pin-detail').getByRole('checkbox')).toBeChecked();
});

test('a damaged transfer code is rejected and nothing changes', async ({ page }) => {
  await page.goto(T + '/progress/');
  await hydrated(page);
  await page.getByPlaceholder('Paste a transfer link or code from your other browser').fill('https://x/progress/#transfer=z.AAAAbroken');
  await page.getByRole('button', { name: 'Load', exact: true }).click();
  await expect(page.getByText(/damaged or incomplete.*Nothing was changed|Nothing was changed/)).toBeVisible();
});
