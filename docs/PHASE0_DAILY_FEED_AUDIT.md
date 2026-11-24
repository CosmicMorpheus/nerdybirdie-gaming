# Phase 0 audit · Daily guide updates handoff (v3.0 "Living Knowledge Engine")

**Date:** 24 Nov 2026 · **Repo:** `nerdybirdie-gaming`, branch `cycle-02`, revision `4c26427` (clean before this audit) · **Status:** Phase 0 done, waiting for founder approval. No integration code added, nothing deployed, no paid service turned on.

The handoff kit (`UPLOAD-TO-CLAUDE.txt`) was extracted outside the repo into a scratch folder. Its code was read before anything was run. The kit's own review said the gaming repo "was unavailable" to its author. It is available here, so this report replaces the kit's guesses with what the repo actually contains.

## What was run

| Command | Result |
|---|---|
| `node tools/audit.mjs /home/user/nerdybirdie-gaming` (kit, read-only) | 7 manifests, 305 findings, 1 large file skipped. It skips hidden folders, so these were checked by hand: `.netlify/` only links the project, `.astro/` is generated, and there is **no CI** (no `.github/`) |
| `node --test tests/*.test.mjs` (kit) | **16/16 pass** on Node 22.23.5. The kit asks for Node 24, but nothing in it needed 24 |
| `node tools/demo.mjs` (kit) | 1 added → "already checked" → quiet next day (1 duplicate, 0 added). Matches the kit's expected outcome |
| `npm test` (ours) | 81/81 before this audit; **84/84** with the new fixture test |
| `npm run check` | 0 errors, 0 warnings |
| `npm run build` | 26 pages built |
| `curl https://www.googleapis.com/youtube/v3/channels` | Reachable from the build container. Google answered "permission denied" because no key was sent, so live calls need a key |
| Netlify API (read-only) | Team "DOOR" is on the **Pro** plan; the kit assumed "Personal". The only gaming project is `nerdybirdie-gaming-preview` (password on all deploys), current deploy `6b05d1d9…`, which is its **published** deploy |

**Not run:**
- Playwright e2e. 71/71 passed at `4c26427`; it was not re-run because no site code changed.
- Lighthouse.
- Any hosted or live call: no YouTube key, no channel IDs, staging environment variables not set.
- PostgreSQL locking: no database exists.
- Environment variable values on the preview project were deliberately not read, to avoid handling secrets.

## Phase 0 table

| Area | File · symbol | Evidence | Disposition |
|---|---|---|---|
| **Frontend, routes, build** | `package.json`, `astro.config.mjs`, `src/pages/**`, `netlify.toml` | Astro 7 static site with Preact islands, TypeScript strict, zod. npm with `package-lock.json`. Publishes `dist/`. Functions live in `netlify/functions` (esbuild). **Not an SPA:** no `_redirects` and no SPA fallback, so the kit's "keep the SPA fallback" doesn't apply. Node 22 on Netlify. | Reuse as-is. The kit's two functions sit beside the existing four. Keep Node 22, since the kit tests pass on it. |
| **Content and APIs** | `content/games/gta-vi/{game,entries,objectives,videos}.json` · `src/lib/content/load.ts::publicEntries` (l.95), `validate.ts::validateGameBundle` | Content is JSON checked by zod at build time. Permanent ids look like `gta-vi:entry:<slug>` and `gta-vi:map:<src>`. There are 6 published entries (Rockstar sources), 0 objectives and 4 videos held "in review". Guide categories: `tips, walkthrough, money, vehicles, weapons, collectibles, side-missions, secrets, settings, videos`. There are **no missions yet**. | The ids are already permanent, so no legacy-id map is needed. The kit's categories (`missions, achievements, locations, strategies, updates, general`…) **don't match ours**, so a mapping is needed (below). |
| **Accounts and progress** | `src/lib/progress/model.ts` (`STORAGE_KEY='nbg:progress'`, schema v2, `contextKey`), `store.ts`, `totals.ts::tally`, `merge.ts`, `transfer.ts`; `src/lib/account/client.ts` (Supabase) | Guest progress lives in `localStorage`. Each context (`gta-vi\|guides`, `gta-vi\|map`, `gta-vi\|ps5`…) holds completed items, untick records, bookmarks and notes. Moving to another browser works with a transfer link. **No live auth:** Supabase magic-link code is built but off, and accounts are still "Proposed" in DECISIONS.md. Editor functions check a single `GUIDE_ADMIN_TOKEN`. No roles, no server sessions, no rate limits. | Keep progress on this path. The feed never writes to it. Fixture recorded (below). **The community-review milestone is blocked** until there are real accounts with server sessions, eligibility and rate limits. |
| **Search, map, spoilers, ASK** | `src/pages/data/search.json.ts` (spoiler-safe fields only), `MapView.tsx` (Leaflet, `CRS.Simple`), `content/.../map/source.json` (Open GTA 6 Map, CC BY 4.0, pinned revision), `src/lib/spoilers.ts` (`DEFAULT_SPOILER_MODE='safe'`), `load.ts::protectedText`, `AskCozmc.tsx` | Spoiler text is only served from `/data/<game>/protected.json` after a reveal. Map pins come from one community source and are labelled "Unconfirmed". Chance spawns are withheld. ASK is browser-only (option A). Server AI is off (`ASK_SERVER`, `ASK_SERVER_ENABLED`). No query logging. | The feed reuses the visitor's spoiler choice. Discovered videos never add pins or coordinates. ASK can index feed items later (milestone 8). |
| **Delivery, tests, security** | `netlify.toml` (CSP `connect-src 'self'`, HSTS, COOP), `netlify/functions/{ask,guide-updates,guide-overrides,source-check}.mts`, `netlify/lib/shared.mts::isEditor`, `src/lib/ask/blobs.ts::blobStore` | All functions return 404 or do nothing unless switched on. **A scheduled function already exists** (`source-check`, daily at 06:17 UTC, off unless `SOURCE_CHECKS=on`). A Blobs store `ask-cozmc` exists but has **no conditional writes**. Backups: git (GitHub, tags `checkpoint-before-*`), Netlify deploy history, and player-side export/transfer. No database to back up. Tests: `npm test`, `npm run check`, `npm run build`, `npm run e2e`, `npm run verify`. | Use the kit's own Blobs adapter (`onlyIfMatch`/`onlyIfNew`). The installed `@netlify/blobs` **11.1.9 already has these**, so the kit's 11.1.10 isn't needed. Prove it with a two-writer test on staging. |
| **UX, a11y, SEO, perf** | `src/config.ts::INDEXABLE` (false on preview), `robots.txt.ts`, `Base.astro`, `tests/e2e/*.spec.ts` (axe) | The preview has noindex everywhere. Axe checks run in e2e. `/data/*` is sent with `X-Robots-Tag: noindex`. | The kit's feed response is `private, no-store, noindex`, which fits. Public caching only comes at launch. |

## One real item, traced end to end

There are no missions yet, so this uses the nearest real item: the guide entry **`gta-vi:entry:gta-plus-elegy`** in the vehicles section. That's also the kit's own example ("vehicle source on What's New and the vehicle guide while the saved vehicle total stays the same").

1. **Source:** `content/games/gta-vi/entries.json`. Status `published`, verification `confirmed`, Rockstar source.
2. **Build:** `load.ts::publicEntries` → `src/pages/games/[game]/guides/[category].astro` l.15 filters by `category === 'vehicles'` → `EntryBrowser` island (`client:load`).
3. **Render and complete:** `EntryBrowser.tsx` l.173 checkbox `e-gta-plus-elegy`, anchor `entry-gta-plus-elegy`. l.180 `setCompleted(p, 'gta-vi|guides', id, checked)` → `useProgress` → `store.ts::saveProgress` → `localStorage['nbg:progress']`.
4. **Search:** `data/search.json.ts` l.12 indexes the title and summary only, never spoiler text.
5. **Map:** this entry has no `mapPinIds`. Map finds are saved separately under `gta-vi|map` (`MapView.tsx` l.307).
6. **Percentages:** `Hud.tsx` l.25–26 runs `tally(guideEntryIds, completed)`. With this fixture the guide total is 1 of 6 = **16%**, and achievements show "Coming soon", never 100%. Ids that aren't published entries are ignored by design (`totals.ts`).

**Fixture:** `tests/fixtures/progress-phase0-elegy.json` (one guide tick with a bookmark and note, one map find, spoiler `safe`, platform `ps5`). Its regression test is `tests/unit/phase0-fixture.test.ts`. It checks that the ids still exist, that a migration leaves the save unchanged, and that the total stays at 1 of 6 even if an unknown "source" id is ticked. It must stay green through every later milestone.

## Smallest integration (proposal, not built)

**Storage:** use the kit's Blobs adapter in a new store `nb-staging-source-feed-v1`. We have no relational database, and Supabase is still unapproved. The feed only needs one document plus a compare-and-write, which Blobs does. Community review needs real transactions, so it goes to Postgres later. Supabase is Postgres, but `supabase-js` can't hold a transaction open: `submitReview` would have to become a database function (RPC) or use a direct `pg` connection. That's a design decision for the community milestone.

**Category mapping** (needs approval). Kit title words → our sections:

| Kit | Ours |
|---|---|
| missions | walkthrough |
| strategies (money) | money |
| vehicles | vehicles |
| weapons | weapons |
| collectibles | collectibles |
| secrets | secrets |
| achievements | general *(hidden until our list is verified)* |
| locations | general *(no coordinates from videos)* |
| updates | general |

**Files (staging diff plan):**

| Change | Path · symbol |
|---|---|
| Add (kit code, same logic, category ids swapped) | `netlify/lib/feed/source.mjs`, `daily.mjs`, `hosting.mjs`, `netlify-store.mjs` |
| Add (imports changed to `../lib/feed/…`) | `netlify/functions/nb-daily.mjs`, `nb-feed.mjs` |
| Add: native Preact version of `ui/discoveries.mjs`. It sends `reveal=1` only after the visitor's own choice (the reveal button, or a saved "show spoilers" setting). Same source id everywhere. | `src/islands/Discoveries.tsx` |
| Mount behind a new `DISCOVERY_FEED` flag (off by default) | `src/pages/updates.astro` (What's New), `src/pages/games/[game]/guides/[category].astro` (vehicles only for the pilot), `src/config.ts` |
| YouTube API Services notice, needed before turning it on | `src/pages/privacy.astro` |
| Tests | Kit tests run under `node --test` or vitest; e2e for empty, failed and revealed feed states; the fixture test above |
| No change | `package.json` (no new dependency), `netlify.toml`, progress code |

**Staging project:** `nerdybirdie-gaming-preview` is already separate from cozmc.us, password-protected, and its deploy is the published one. Netlify only fires schedules on the published deploy, so the daily timer can run there. It becomes "staging" by agreement. A future public site should be its own Netlify project.

**Settings the founder enters in Netlify** (never in chat or the repo):
- `NB_STAGING_SITE_ID`: the preview project's id.
- `NB_YOUTUBE_CHANNEL_IDS`: 1 channel to start.
- `NB_YOUTUBE_KEY`: a key restricted to YouTube Data API v3.
- `NB_DISCOVERY_ENABLED=false` at first.

**Cost:**
- AI: $0, because the feed makes no model calls.
- YouTube API: about 3 quota units per channel per run. That's well inside Google's free daily quota, but check the quota page in your Google Cloud project.
- Netlify: about 30 scheduled runs a month plus feed reads on the Pro plan. Expected to be small, but **not verified**: check the team usage page before turning on the timer and again after a week.

## What's left and what's blocked

- **Founder decisions:**
  1. Approve the staging milestone (phases 1–3) on the preview project.
  2. Pick **one** approved creator and their permanent `UC…` channel id, and confirm permission. Our four supplied creators are still unverified.
  3. Create the restricted YouTube API key.
  4. Approve the category mapping.
- **Blocked:** the community-review milestone needs real accounts (server sessions, eligibility, rate limits, an evidence resolver). That needs the accounts decision first.
- **Needs a hosted check:**
  - whether password protection also covers function URLs;
  - two-writer conditional writes on real Blobs;
  - one timer-triggered run;
  - the rollback CLI (`tools/recover.mjs`, needs `NETLIFY_AUTH_TOKEN` in a private operator session).
- **Kit limits to know:**
  - Videos are categorised from their title only, in English.
  - Each channel's 20 most recent uploads are checked at most, so a busy channel can push items out of the window.
  - Items expire after 7 days without a refresh.
  - A discovered video never counts toward completion and never proves a gameplay fact by itself.
