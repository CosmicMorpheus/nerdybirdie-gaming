# NerdyBirdie LLC Gaming Guides

Free, spoiler-safe game guides and trackers, starting with Grand Theft Auto VI. Part of the COZMC community.
Separate from the cozmc.us site and repo.

**Status:** Phase 1 preview. Not deployed. See `docs/MILESTONE_PHASE1.md`.

## What's here

| Page | What it does |
|---|---|
| `/` | Home: featured game, your progress, quick links, COZMC community panel |
| `/games/gta-vi/` | Game overview: release date and platforms, with the official source |
| `/games/gta-vi/achievements/` | Tracker: separate Xbox and PS5 lists, ranks, checkpoints, "Next up", spoiler modes, search, filters, saved items, notes, reset |
| `/games/gta-vi/guides/` | Quest board (progress per section) plus every entry, searchable and filterable by section, spoiler level and verification |
| `/games/gta-vi/guides/<section>/` | One section: check entries off, "More details", spoiler reveals, sources and last-checked dates |
| `/games/gta-vi/map/` | Leonida map: search, filters, mark found, shareable pin links, creator videos at the right moment |
| `/progress/` | Your progress by section; continue in another browser (transfer link); backup file download and restore |
| `/account/` | Optional sign-in to sync progress (switched off until set up; see docs/ACCOUNTS.md) |
| `/review/` | Editor review queue (preview builds only) |
| `/admin/guide-updates/` | Private Guide Updates queue for ASK "COZMC" (editor token) |
| ASK "COZMC" | Guide assistant on every page; see docs/ASK_COZMC.md |
| What's New from creators | Daily check of approved YouTube creators, shown on Updates and Rare vehicles, spoiler-safe; idle until set up. See docs/DAILY_FEED.md |
| `/search/` | Spoiler-safe site search |
| `/about/`, `/privacy/`, `/corrections/`, `/updates/` | Required pages, including the unofficial disclaimer |

## Run it

Needs Node 22.23.4 or newer.

```bash
npm install
npm run dev          # http://localhost:4321
```

```bash
npm run verify       # type check + unit tests + both builds + browser tests
```

Other commands: `npm test` (unit tests), `npm run build` (real site into `dist/`), `npm run build:test` (test build into `dist-test/`), `npm run e2e` (browser tests).

## Editing content

All game data lives in `content/` as JSON and is checked at build time: a bad ID, a missing source or a draft entry fails the build or stays hidden.

- `content/platforms.json`: platforms the site knows about.
- `content/games/gta-vi/game.json`: title, release, platforms (each with a source), categories and the source list.
- `content/games/gta-vi/objectives.json`: achievements and trophies. **Empty until verified.**

An objective only shows on the public site when `publicationStatus` is `approved` and `verificationStatus` is `official_confirmed` or `independently_verified`.
Spoiler text goes in `protected`, never in `safeTitle`/`safeSummary`. The build rejects a safe title that contains the protected title.
IDs are permanent (`gta-vi:xbox:...`); never rename one, or players lose that tick.

`content/fixtures/` holds **fake** test data. It's only used by `npm run build:test` and never reaches the real site; a test checks this.

## Swapping in the final logos

All logo paths are in `src/config.ts` under `BRAND`. The easiest way is to replace the files in place, keeping the same names:

| File | Where it shows | Size to supply |
|---|---|---|
| `public/brand/nerdy-birdie-128.webp` | Header mark (shown at 40px) | at least 128×128, square |
| `public/brand/nerdy-birdie-256.webp` | Footer (96px) | at least 256×256 |
| `public/brand/nerdy-birdie-512.webp` | About page (200px) | at least 512×512 |
| `public/brand/cozmc/cozmc-logo-272.png` | COZMC panel (28px tall) | about 272×72, transparent background |
| `public/favicon-32.png`, `public/apple-touch-icon.png` | Browser tab, phone home screen | 32×32 and 180×180 |

PNG or WebP both work; if you change the file type, update the path in `BRAND`. Keep the original master in `assets/brand/`.

## Adding guide entries

Tips, walkthrough missions, money methods, vehicles, weapons, collectibles and videos all go in `content/games/gta-vi/entries.json`.
See **`docs/CONTENT_GUIDE.md`** for the rules, a copy-paste template and examples.

## Map data

`npm run import:map -- --dry-run`, then `npm run import:map`. Pinned source and license in `content/games/gta-vi/map/source.json`; see docs/CONTENT_GUIDE.md.

## Saved progress

Saved in the browser; move it to another browser with a transfer link or a backup file (no account). ASK "COZMC" runs browser-only by default (`ASK_SERVER` in `src/config.ts`). Account sync is built but switched off; see `docs/ACCOUNTS.md`.

## Links and settings

`src/config.ts`: COZMC Discord invite and cozmc.us, the future Nerdy Birdie parent site (hidden while empty), contact email, tagline.

## Deploying

Live at **https://nerdybirdiegameguides.netlify.app** (Netlify project `nerdybirdiegameguides`), built as the public version but **password-protected** (founder, 24 Nov 2026; the password is shared outside the repo). `netlify.toml` sets `SITE_URL`, `PUBLIC_INDEXABLE=true` and `PUBLIC_DISCOVERY_FEED=true` for Netlify builds. Local builds (`npm run build`) stay in preview mode (noindex, "Preview" banner, unreviewed videos shown) so tests and reviews keep working. Every deploy needs the founder's go-ahead.

## Docs

`docs/02`–`05` (specs), `docs/06_PHASE0_PLAN.md`, `docs/DECISIONS.md`, `docs/MILESTONE_PHASE1.md`, screenshots in `docs/qa/phase1/`.
