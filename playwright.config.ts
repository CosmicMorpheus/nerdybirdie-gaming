import { defineConfig, devices } from '@playwright/test';

// Two builds: the real site (dist/) and the fixture test build (dist-test/). `npm run e2e` builds both first.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: { trace: 'off' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, grepInvert: /@phone/ },
    { name: 'phone', use: { ...devices['Pixel 7'] }, grep: /@phone/ },
  ],
  webServer: [
    { command: 'node scripts/serve.mjs dist 4321', port: 4321, reuseExistingServer: false },
    { command: 'node scripts/serve.mjs dist-test 4322', port: 4322, reuseExistingServer: false },
  ],
});
