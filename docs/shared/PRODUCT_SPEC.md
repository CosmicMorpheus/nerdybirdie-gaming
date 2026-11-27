# Product spec — Nerdy Birdie Gaming Guides

Last updated: 27 November 2026. This is the **current** spec for this repo's product. It supersedes `docs/02_PRODUCT_SPEC.md` and
`reference/Original_Master_Prompt.md` where they conflict; those stay for history and detail.

## What it is

An independent, consumer-facing gaming product under Nerdy Birdie LLC: a library of game guides, starting with GTA VI. A gamer should be able
to discover the product, find their game, get useful information, save their progress and, optionally, join a larger community.

## Customer journey

Discover Gaming Guides → select a game → preview the guide → unlock applicable content (today: everything is free) → play and track progress
→ optionally connect with the COZMC community.

## Landing page (`/`)

Communicates the product immediately and gets players to their game with little scrolling.

| Requirement | Implementation |
|---|---|
| Gaming-focused introduction | Hero: "Get more out of the games you love" + one-line promise |
| Primary call to action **Explore Game Guides** | Hero primary button → `/games/` |
| Available / featured games | "Featured guides" (games with `featured: true`) with status, access, counts and quick links |
| Recently updated content | Latest entries from every game's `updates.json` |
| Access to saved progress | "My progress" button, "Continue: …" resume button, progress HUD |
| Path to discover more guides | "All game guides →", "More guides on the way" tile, Suggest a game (Discord) |
| Community (optional) | COZMC panel, clearly separate |

Game-specific tools (quest board, how-to-100%, platform notes) live on the game's own page, not the landing page.

## Game guide library

Each game is one folder, `content/games/<id>/`, validated at build time:

| Per-game capability | File / field | Status for GTA VI |
|---|---|---|
| Product identity | `game.json` (title, shortTitle, summary), `GameArt.astro` | Done |
| Landing page | `/games/<id>/` (generated) | Done |
| Walkthroughs, tips, collectibles, money, vehicles… | `entries.json` (sections from `guideCategories`) | Done |
| Interactive map | `map/pins.json`, `map/geometry.json` (optional) | Done |
| Achievement / trophy trackers | `objectives.json` (per platform) | Done |
| Progress tracking | Per game and per platform contexts in `nbg:progress` | Done |
| Community discoveries | Daily creator feed (built; runs once the YouTube key and channel ids are set, `docs/DAILY_FEED.md`); community submissions need accounts + moderation | Partial |
| Content sources | Per-entry `sources[]` with check dates; `game.json` `sources` | Done |
| Access permissions | `game.json` `access` (`free` today; `premium` blocked until approved) | Done (free) |
| Update history | `updates.json` | Done |
| Featured on home | `game.json` `featured` | Done |
| Guide status in library | `game.json` `guideStatus` | Done |

Adding a game: copy the folder structure, fill `game.json`, add entries; pages, navigation, library card, search and progress pick it up.
See `docs/CONTENT_GUIDE.md`.

## Content statuses and verification

See `docs/CONTENT_WORKFLOW.md` for the full workflow. Unverified discoveries never become authoritative guide content automatically.

## ASK "COZMC"

Game-focused assistant on every page. Today: browser-only search of the published guide, spoiler-aware, no data sent anywhere. Server
features (missing-info queue, sourced research, approved overrides) are built and off (`docs/ASK_COZMC.md`). Missing information goes to a
private review queue, never straight into the guide.

## Monetization

Founder decision A (27 Nov 2026): the website and every guide stay free; optional one-time Pro unlock in the Android app. The ecosystem brief's
$1.99-per-guide model is an open decision. Architecture supports both. Details and platform billing rules: `docs/MONETIZATION.md`.

## Hard rules (unchanged)

Free public guide and tracker; no wallet, account or Discord gate for ordinary use. Spoiler-safe by default. No invented game facts, platforms,
URLs or sources. No blockchain, live payments or token incentives without separate approval. No production deploy without founder approval.
