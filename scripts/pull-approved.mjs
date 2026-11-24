#!/usr/bin/env node
/**
 * Copy changes approved in the Guide Updates queue into content/games/gta-vi/entries.json, so they're part of the next build.
 *   SITE_URL=https://your-site npm run pull:approved            # shows what would change
 *   SITE_URL=https://your-site npm run pull:approved -- --write # writes the file (then review the diff and commit)
 * Corrections keep their entry id (players' ticks stay attached); new entries are appended. Spoiler details come from
 * the protected endpoint. Run `npm run build` afterwards: the content rules are checked there.
 */
import { readFileSync, writeFileSync } from 'node:fs';
const site = process.env.SITE_URL;
if (!site) { console.error('Set SITE_URL to the deployed site.'); process.exit(1); }
const FILE = 'content/games/gta-vi/entries.json';
const [list, prot] = await Promise.all([
  fetch(`${site}/api/guide-overrides`).then((r) => r.json()),
  fetch(`${site}/api/guide-overrides?protected=1`).then((r) => r.json()),
]);
const entries = JSON.parse(readFileSync(FILE, 'utf8'));
let changed = 0, added = 0;
for (const { hasDetails, approvedAt: _a, version: _v, ...e } of list) {
  const full = { ...e, details: hasDetails && prot[e.id] ? { summary: prot[e.id].summary, steps: prot[e.id].steps ?? [] } : null };
  const i = entries.findIndex((x) => x.id === e.id);
  if (i >= 0) { if (JSON.stringify(entries[i]) !== JSON.stringify(full)) { entries[i] = full; changed++; console.log(`changed  ${e.id}`); } }
  else { entries.push(full); added++; console.log(`added    ${e.id}`); }
}
console.log(`${changed} changed, ${added} added.`);
if (process.argv.includes('--write')) { writeFileSync(FILE, JSON.stringify(entries, null, 2) + '\n'); console.log(`Wrote ${FILE}. Run npm run build, review the diff, commit.`); }
else console.log('Dry run. Add --write to save.');
