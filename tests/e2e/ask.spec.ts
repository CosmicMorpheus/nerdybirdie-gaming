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
  await expect(page.locator('.ask-head h2')).toHaveText(NAME);
  await expect(page.getByText('What are you trying to find in GTA?')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: NAME })).toHaveCount(0);
});

test('server unavailable: still answers from our guide, with a real Show on map action, and says it was not saved', async ({ page }) => {
  // The local static server has no /api routes, so this exercises the real fallback.
  await page.goto(T + '/');
  await page.getByRole('button', { name: /ASK "COZMC"/ }).click();
  await page.getByLabel('Your question').fill('Where is Fixture card one?');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  const answer = page.locator('.ask-from').last();
  await expect(answer).toContainText('Fixture card one');
  await expect(answer).toContainText("wasn't saved");
  await answer.getByRole('link', { name: /Show on map/ }).click();
  await expect(page.locator('.pin-detail h2')).toHaveText('Fixture card one');
});

test('server answer: guide part + outside sources with disagreement, spoiler hidden until revealed, Discord offered', async ({ page }) => {
  await page.route('**/api/ask', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({
    status: 'guide+outside',
    guide: { coverage: 'partial', text: 'Our guide (confirmed): TEST DATA Fixture Comet is at the Fixture Marina garage.', actions: [{ label: 'Open checklist', href: '/games/gta-vi/guides/vehicles/', kind: 'checklist' }], spoilerGate: null, confirms: [], title: 'TEST Fixture Comet', sources: [] },
    outside: { answer: 'TEST DATA: sources disagree on whether you keep it.', spoilerDetail: 'TEST-SPOILER mission name', spoilerLevel: 'minor', reports: [], disagreements: ['TEST: Site A says keep; Video B shows it lost.'], uncertain: ['TEST: game version not stated'],
      sources: [{ publisher: 'Example Guide Site (TEST)', title: 'Fixture Comet guide (TEST)', url: 'https://example.com/a', checkedAt: '2026-11-24', kind: 'guide' }, { publisher: 'YouTube', title: 'Fixture walkthrough (TEST)', url: 'https://example.com/b', checkedAt: '2026-11-24', creator: 'Example Creator', kind: 'creator' }],
      proposed: null, platform: null, patch: null, cached: false, checkedAt: '2026-11-24T10:00:00Z' },
    outsideSpoilerHidden: true, notes: ["We've added this to our guide's update list so the next player gets a direct answer."], recorded: { itemId: 'keep-x', count: 2 },
    community: { label: 'Ask in the COZMC Discord', href: 'https://discord.gg/VBeBE7MSSq' },
  }) }));
  await page.goto(T + '/');
  await page.getByRole('button', { name: /ASK "COZMC"/ }).click();
  await page.getByLabel('Your question').fill('Can I keep the Fixture Comet after the mission?');
  await page.keyboard.press('Enter');
  const a = page.locator('.ask-from').last();
  await expect(a).toContainText('From our guide');
  await expect(a).toContainText('What outside sources report');
  await expect(a).toContainText('Sources disagree: TEST: Site A says keep');
  await expect(a.getByRole('link', { name: 'Fixture walkthrough (TEST)' })).toHaveAttribute('href', 'https://example.com/b');
  await expect(a).toContainText('by Example Creator');
  await expect(a).not.toContainText('TEST-SPOILER');
  await a.getByRole('button', { name: /story detail. Reveal it/ }).click();
  await expect(a).toContainText('TEST-SPOILER mission name');
  await expect(a.getByRole('link', { name: /Ask in the COZMC Discord/ })).toHaveAttribute('href', 'https://discord.gg/VBeBE7MSSq');
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
