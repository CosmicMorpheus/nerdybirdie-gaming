// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

// SITE_URL is unset until the founder confirms a domain. Without it there are no canonical URLs or sitemap.
const site = process.env.SITE_URL || undefined;
// NBG_FIXTURES=1 builds a test-only copy of the site from content/fixtures into dist-test/. Never deploy it.
const fixtures = process.env.NBG_FIXTURES === '1';

export default defineConfig({
  site,
  outDir: fixtures ? './dist-test' : './dist',
  trailingSlash: 'always',
  integrations: [preact(), ...(site ? [sitemap({ filter: (p) => !/\/(data|search|review|account|admin|404)\b/.test(p) })] : [])],
  vite: { define: { __NBG_FIXTURES__: JSON.stringify(fixtures) } },
});
