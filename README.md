# Nerdy Birdie Gaming

Free, spoiler-safe game guides and trackers, starting with Grand Theft Auto VI. Part of the COZMC community.
Separate from the cozmc.us site and repo.

**Status:** Phase 1 preview. Not deployed. See `docs/MILESTONE_PHASE1.md`.

## What's here

| Page | What it does |
|---|---|
| `/` | Home: featured game, your progress, quick links, COZMC community panel |
| `/games/gta-vi/` | Game overview: release date and platforms, with the official source |
| `/games/gta-vi/achievements/` | Tracker: separate Xbox and PS5 lists, ranks, checkpoints, "Next up", spoiler modes, search, filters, saved items, notes, reset |
| `/games/gta-vi/guides/` | Quest board: ten guide sections; each guide is a checklist with sources and click-to-play videos |
| `/progress/` | Your progress, backup download and restore |
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

## Adding a guide

Guides live in `content/games/gta-vi/guides.json`; videos in `videos.json`; sources in `game.json` → `sources`.
Every guide needs at least one source, and each step can cite its own. Write in your own words and link the original page.
A YouTube video needs its 11-character id (from `youtube.com/watch?v=XXXXXXXXXXX`), the creator's name and channel link.
Videos never load until the viewer presses play.

## Links and settings

`src/config.ts`: COZMC Discord invite and cozmc.us, the future Nerdy Birdie parent site (hidden while empty), contact email, tagline.

## Deploying (needs approval first)

`netlify.toml` is ready for a **new** Netlify site linked to this repo. The site shows a "Preview" banner and tells search engines not to index it until `PUBLIC_INDEXABLE=true` and `SITE_URL` are set at launch.

## Docs

`docs/02`–`05` (specs), `docs/06_PHASE0_PLAN.md`, `docs/DECISIONS.md`, `docs/MILESTONE_PHASE1.md`, screenshots in `docs/qa/phase1/`.
