# Daily guide updates (What's New from creators)

Staging milestone of the v3.0 handoff, approved 24 Nov 2026. Plan and audit: `docs/PHASE0_DAILY_FEED_AUDIT.md`.

Once a day the server reads the newest public uploads from 1–3 approved YouTube creators. A video's title must name GTA VI. It is sorted into a guide section by words in its title, and saved as a **source awaiting community review**. Players see it on **Updates** (What's New) and in the **Rare vehicles** guide (pilot section). Titles and links stay hidden until the player chooses to see spoilers. Discoveries never count toward progress, never add map pins and never prove a gameplay fact on their own.

## Where things are

| Part | Path |
|---|---|
| Daily check (scheduled 10:17 UTC) | `netlify/functions/nb-daily.mjs` |
| Read API (`GET /.netlify/functions/nb-feed?category=&reveal=1`) | `netlify/functions/nb-feed.mjs` |
| Engine (handoff code; only the category ids were changed) | `netlify/lib/feed/{source,daily,hosting,netlify-store}.mjs` |
| Panel (Preact) | `src/islands/Discoveries.tsx`, `discoveries.css`; mounted in `src/pages/updates.astro` and `src/pages/games/[game]/guides/[category].astro` |
| Page switch | `src/config.ts` → `DISCOVERY_FEED` (on for the preview, off for a public build unless `PUBLIC_DISCOVERY_FEED=true`), `DISCOVERY_SECTIONS` |
| Rollback tool (operator only) | `scripts/feed-recover.mjs` (`npm run feed:recover`) |
| Tests | `tests/feed/*.test.mjs` (`npm run test:feed`, part of `npm test`), `tests/e2e/feed.spec.ts`, progress baseline `tests/unit/phase0-fixture.test.ts` |

**Section mapping** (title words → section; the first match wins):

| Title words | Section |
|---|---|
| mission, walkthrough | walkthrough |
| achievement, trophy | general |
| collectible | collectibles |
| vehicle, car, boat, plane, motorcycle | vehicles |
| weapon | weapons |
| location, map | general |
| money, strategy | money |
| secret, easter egg | secrets |
| update, patch, trailer, announcement | general |
| anything else | general |

## Turning it on (founder, in Netlify → nerdybirdie-gaming-preview → Environment variables, scope: Functions)

Never put these in chat, the repo or a build variable.

| Variable | Value |
|---|---|
| `NB_STAGING_SITE_ID` | The preview project's id (Project configuration → General → Project ID) |
| `NB_YOUTUBE_CHANNEL_IDS` | One approved creator's channel id, starting with `UC` (one to three, comma-separated) |
| `NB_YOUTUBE_KEY` | Google Cloud API key restricted to **YouTube Data API v3** |
| `NB_UPLOAD_LIMIT` | Optional, 1–20 (default 12): how many recent uploads per channel are checked |
| `NB_DISCOVERY_ENABLED` | `false` first, then `true` for the test |

Then trigger a deploy, so functions pick up the variables. Run **nb-daily** once from Netlify → Logs & metrics → Functions → nb-daily, and check:
- the log line `Nerdy Birdie discovery {...}`;
- Updates and Rare vehicles both show the source;
- your guide totals didn't change.

Without the id or a channel, the feed answers 404 and the page says "Daily source checks haven't started yet". The vehicles guide shows nothing extra.

## Hosted checks still to do (from the handoff's STAGING.md)

- Password protection also covers `/.netlify/functions/nb-feed`.
- A wrong or missing `NB_STAGING_SITE_ID` writes nothing.
- Logs contain no key.
- Two-writer test of conditional writes on real Blobs.
- A second run on the same day does nothing. The next day, only "Last successful check" moves.
- One timer-triggered run with your computer closed, with the same deploy id.
- Source failure and recovery.

## Rolling back

```bash
NB_STAGING_SITE_ID=<preview project id> NETLIFY_AUTH_TOKEN=<operator token> npm run feed:recover -- inspect <preview project id>
```

Then `rollback <id> <revision>` withdraws the latest additions and pauses discovery, and `resume <id> <paused revision>` restarts it. Run this in a private terminal only. Turning it off entirely: set `NB_DISCOVERY_ENABLED=false`, which still runs cleanup of expired items. To hide the panels as well, build with `PUBLIC_DISCOVERY_FEED=false`.

## Limits

- Matching is on English titles only.
- At most the 20 newest uploads per channel are checked, so a busy channel can push items out of the window.
- Items expire after 7 days without a refresh.
- No descriptions, thumbnails or downloads are kept.
- Community review (confirm, dispute, evidence) is **not** built: it needs real accounts first (`review/` in the handoff, PostgreSQL).
- Cost: no AI calls. About 3 YouTube quota units per channel per run. Netlify usage on the Pro plan should be checked on the team usage page after a week.
