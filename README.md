# Nerdy Birdie Gaming Guides

Free, spoiler-safe game guides and trackers — walkthroughs, maps, checklists and achievement trackers — starting with Grand Theft Auto VI.
A product of **Nerdy Birdie LLC**. Displayed on the site today as "NerdyBirdie LLC Gaming Guides" (see Remaining decisions).

**Status (27 Nov 2026):** built as the public version at https://gameguides-nerdy-birdie.live, **password-protected**, not indexed.
This branch adds the ecosystem-alignment changes (`docs/ARCHITECTURE_AUDIT_2026-11-27.md`); not deployed.

## Mission

Give gamers the tools, knowledge and community resources they need to get more out of the games they love. We aren't just building
guides for gamers; we're building them **with** gamers. Priorities, in order: **1. Gaming first. 2. Community second. 3. Monetization third.**

## Parent company and ecosystem

| Property | URL | Role |
|---|---|---|
| Nerdy Birdie LLC | https://nerdy-birdie.com | Corporate portfolio and directory of ventures. Linked from our footer, phone menu and About page; never duplicated here |
| **Nerdy Birdie Gaming Guides** (this repo) | https://gameguides-nerdy-birdie.live | The gaming product |
| COZMC community | https://cozmc.us/ + COZMC Discord | Optional connected community, with its own branding |

Company-wide facts live in **`docs/shared/`** (vision, ecosystem architecture, brand guidelines, product registry, decision log, product spec,
roadmap), maintained in every Nerdy Birdie project.

## Product architecture

| Layer | Where | State |
|---|---|---|
| Presentation | Astro 7 static pages + Preact islands (`src/pages`, `src/components`, `src/islands`) | Live |
| Game content | `content/games/<game-id>/` JSON, validated with Zod at build | Live |
| User progress | Browser storage (versioned), backup file, transfer link (`src/lib/progress/`) | Live |
| Authentication | Supabase magic link (`src/lib/account/`, `docs/ACCOUNTS.md`) | Built, off |
| Purchase entitlements | Store-agnostic ledger (`src/lib/entitlements/`, `docs/PRO_UNLOCK.md`) | Built and unit tested, off |
| Server functions | Netlify Functions (`netlify/functions/`) | Creator feed built (needs keys); ASK server, queues off |

Each layer is independent, so the same content, progress and entitlement code can serve the website and a future Android app.

## Game guide library

The landing page (`/`) introduces the product; **Explore Game Guides** opens the library (`/games/`); each game has its own landing page
(`/games/<id>/`) with its guides, map, trackers, quest board and update history. One folder per game, configured in its `game.json`:
`guideStatus`, `featured` (home page), `access` (free today), platforms with sources, guide sections, optional `platformNote`. Add
`entries.json`, `objectives.json`, optional `map/`, `videos.json`, `updates.json`. Pages, navigation, library cards, search, ASK and progress
pick a new game up without code changes. How-to: `docs/CONTENT_GUIDE.md` → Adding another game.

## Monetization strategy

Founder decision A (27 Nov 2026): the website and every guide stay **free**; revenue from an optional one-time **Pro** unlock in the Android
app (cloud sync, offline, future premium tools). The ecosystem brief's ~$1.99-per-guide model is an **open decision**; the architecture
supports per-guide entitlements, but a paid `access` tier fails the build until the founder approves it and server-side checks exist.
No shared password as access control; store billing rules (Google Play, App Store) documented in `docs/MONETIZATION.md`.

## Community integration

COZMC links (Discord and cozmc.us, always two separate links) in the desktop header, phone menu, home panel, guide panels and footer.
Always optional; never a gate. ASK "COZMC" is the in-guide assistant (browser-only search today; `docs/ASK_COZMC.md`).
COZMC Arcade, Cozmlings and Web3-learning links are waiting for verified URLs.

## Content verification workflow

Sources first, our own words, every entry cited with check dates and labelled Confirmed / Unconfirmed / Rumor. Unverified discoveries (creator
feed, ASK questions, reports) go to private queues, never straight into the guide. The brief's five statuses (newly discovered → needs
community review → community verified → editorially verified → outdated/disputed) and what community review still needs: `docs/CONTENT_WORKFLOW.md`.

## Mobile application roadmap

Google Play first (Capacitor wrapper, Play Billing), App Store possibly later. Responsive, touch-friendly and accessible today; gaps (Terms,
account deletion, offline, performance baseline, billing) in `docs/MOBILE_READINESS.md`.

## Branding

Supplied Nerdy Birdie logo used modestly (masters never edited); parent company as attribution; each game guide may carry its game's
atmosphere (original art only, no publisher logos); COZMC keeps its purple/coral identity. `docs/shared/BRAND_GUIDELINES.md`.

## Remaining decisions and next priorities

Open founder decisions (monetization model, site display name, logo link target, vendor accounts and legal review, COZMC Arcade/Cozmlings URLs,
second game) and the prioritised roadmap: `docs/shared/ROADMAP.md`.

## What's here

| Page | What it does |
|---|---|
| `/` | Product landing page: Explore Game Guides, featured guides, recently updated, your progress, COZMC community panel |
| `/games/` | Game guide library (one card per game in `content/games/`) |
| `/games/gta-vi/` | Game landing page: release and platforms (sourced), tools, quest board, how to 100% |
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
- `content/games/gta-vi/objectives.json`: achievements and trophies (54 Xbox, 55 PS5).
- `content/games/gta-vi/updates.json`: update history shown on Updates and the home page (newest first).

An objective only shows on the public site when `publicationStatus` is `approved` and `verificationStatus` is `official_confirmed` or `independently_verified`.
Spoiler text goes in `protected`, never in `safeTitle`/`safeSummary`. The build rejects a safe title that contains the protected title.
IDs are permanent (`gta-vi:xbox:...`); never rename one, or players lose that tick.

`content/fixtures/` holds **fake** test data. It's only used by `npm run build:test` and never reaches the real site; a test checks this.

## Brand kit (logos)

All logo paths are in `src/config.ts` under `BRAND`. Masters are kept unedited in `assets/brand/supplied-<date>/`; the current Nerdy Birdie logo
is `assets/brand/supplied-2026-11-25/nerdy-birdie-logo.webp` (1254×1254). Web copies are made from it:

| File | Where it shows | Made from |
|---|---|---|
| `public/brand/nerdy-birdie-mark-96.webp`, `-192.webp` | Header mark (40px) | The bird, cropped above the wordmark so it stays legible small |
| `public/brand/nerdy-birdie-logo-192.webp`, `-384.webp` | Footer (96px) | Full logo |
| `public/brand/nerdy-birdie-logo-512.webp`, `-1024.webp` | About page (200px) | Full logo |
| `public/favicon-32.png` | Browser tab | The bird's head |
| `public/apple-touch-icon.png`, `public/icon-192.png`, `public/icon-512.png` | Phone home screen, installed app | Full logo |
| `public/brand/brick-by-brick.mp4`, `public/brand/brick-by-brick.webp` | Footer banner | Looping video made from the founder's animated GIF (master in assets/brand/supplied-2026-11-25/); the still image is used with reduced motion |
| `public/brand/cozmc/…` | COZMC panel and mascots | COZMC brand files |

To swap one, replace the file at the same path (same size), or point `BRAND` at a new file. Don't recolour or redesign supplied art.

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

Live at **https://gameguides-nerdy-birdie.live** (custom domain; DNS records as shown in Netlify → Domain management) and https://nerdybirdiegameguides.netlify.app (Netlify project `nerdybirdiegameguides`), built as the public version but **password-protected** (founder, 24 Nov 2026; the password is shared outside the repo). `netlify.toml` sets `SITE_URL`, `PUBLIC_INDEXABLE=true` and `PUBLIC_DISCOVERY_FEED=true` for Netlify builds. Local builds (`npm run build`) stay in preview mode (noindex, "Preview" banner, unreviewed videos shown) so tests and reviews keep working. Every deploy needs the founder's go-ahead.

## Docs

`docs/shared/` (company source of truth; `PRODUCT_SPEC.md` there is the current spec), `docs/02`–`05` (original specs), `docs/DECISIONS.md` (product decision log),
`docs/ARCHITECTURE_AUDIT_2026-11-27.md`, `docs/MONETIZATION.md`, `docs/MOBILE_READINESS.md`, `docs/CONTENT_WORKFLOW.md`, `docs/CONTENT_GUIDE.md`,
`docs/PRO_UNLOCK.md`, `docs/COMMERCIAL_PLATFORM_AUDIT.md`, `docs/MILESTONE_PHASE1.md`, screenshots in `docs/qa/`.
