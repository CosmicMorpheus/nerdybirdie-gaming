# Daily guide updates (What's New from creators)

Staging milestone of the v3.0 handoff, approved 24 Nov 2026. Plan and audit: `docs/PHASE0_DAILY_FEED_AUDIT.md`.

Once a day the server reads the newest public uploads from the **creators we follow** (`content/games/gta-vi/creators/youtube.json`). Before using a channel it checks that the channel id still belongs to the expected @handle. A video's title must name GTA VI. It is sorted into a guide section by words in its title, and saved as a **source awaiting community review**. Players see it on **Updates** (What's New) and in the matching guide section.

Titles, links and the video player stay hidden until the player chooses to see spoilers. Videos the creator allows to be embedded play on the page, from youtube-nocookie and only after pressing play. Every video credits and links the creator. Discoveries never count toward progress, never add map pins and never prove a gameplay fact on their own.

**Creators followed (founder, 24 Nov 2026):**
- GTA Series Videos `@GTASeriesVideos`
- MKIceAndFire `@MKIceAndFire`
- TGG `@TGG_`

**Adding a creator:** add one entry to the creators file with:
- `channelId` (`UC…`)
- `handle`
- `name`
- `focus`
- `status: "approved"`
- `addedAt`

Then deploy. The limit is 10 creators. Set `"paused"` to stop following one and hide their videos. A wrong id/handle pair is refused on the next run and logged as `Handle mismatch` in the run summary.

## Where things are

| Part | Path |
|---|---|
| Daily check (scheduled 10:17 UTC) | `netlify/functions/nb-daily.mjs` |
| Read API (`GET /.netlify/functions/nb-feed?category=&reveal=1`) | `netlify/functions/nb-feed.mjs` |
| Engine (handoff code; only the category ids were changed) | `netlify/lib/feed/{source,daily,hosting,netlify-store}.mjs` |
| Creators we follow | `content/games/gta-vi/creators/youtube.json` (server: `netlify/lib/feed/creators.mjs`; build: `src/lib/content/load.ts::creatorsFor`) |
| Panel (Preact) | `src/islands/Discoveries.tsx`, `discoveries.css`; mounted in `src/pages/updates.astro` (with the creators list) and `src/pages/games/[game]/guides/[category].astro` (only when that section has new videos) |
| ASK "COZMC" | Creator entries in `/data/gta-vi/ask-index.json` (`src/lib/ask/docs.ts::creatorDoc`): who covers what, links to the channel and to What's New |
| Page switch | `src/config.ts` → `DISCOVERY_FEED` (on for the preview, off for a public build unless `PUBLIC_DISCOVERY_FEED=true`), `DISCOVERY_SECTIONS` (every section the feed sorts into; a test keeps the two lists equal) |
| Rollback tool (operator only) | `scripts/feed-recover.mjs` (`npm run feed:recover`) |
| Tests | `tests/feed/*.test.mjs` (`npm run test:feed`, part of `npm test`), `tests/e2e/feed.spec.ts`, progress baseline `tests/unit/phase0-fixture.test.ts` |

**Section mapping** (title words → section; the first match wins):

| Title words | Section |
|---|---|
| side mission, side activity, side hustle, side job | side-missions |
| robbery, heist, bank job, stick-up, smash 'n' grab, illegal operation | robberies |
| mission, walkthrough | walkthrough |
| achievement, trophy | general |
| WAiNK, Kenton, treasure, shipwreck, scuba, diving, meditation, flamingo, magazine, playlist | exploration |
| collectible | collectibles |
| vehicle, car, boat, plane, motorcycle | vehicles |
| weapon | weapons |
| location, map | general |
| money, strategy | money |
| secret, easter egg, hidden | secrets |
| settings, graphics, controls | settings |
| tips, tricks, beginner | tips |
| update, patch, trailer, announcement | general |
| anything else | general |

## Turning it on (founder, in Netlify → nerdybirdie-gaming-preview → Environment variables, scope: Functions)

Never put these in chat, the repo or a build variable.

| Variable | Value |
|---|---|
| `NB_STAGING_SITE_ID` | The preview project's id (Project configuration → General → Project ID) |
| `NB_YOUTUBE_CHANNEL_IDS` | **Optional.** Overrides the creators file, e.g. one `UC…` id for a test. Leave unset normally |
| `NB_YOUTUBE_KEY` | Google Cloud API key restricted to **YouTube Data API v3** |
| `NB_UPLOAD_LIMIT` | Optional, 1–20 (default 12): how many recent uploads per channel are checked |
| `NB_DISCOVERY_ENABLED` | `false` first, then `true` for the test |

Then trigger a deploy, so functions pick up the variables. Run **nb-daily** once from Netlify → Logs & metrics → Functions → nb-daily, and check:
- the log line `Nerdy Birdie discovery {...}`;
- Updates and Rare vehicles both show the source;
- your guide totals didn't change.

Without `NB_STAGING_SITE_ID`, the feed answers 404 and the page says "Daily source checks haven't started yet". Guide sections show nothing extra until they have new videos.

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
- Community review (confirm, dispute, evidence → "Verified by the Community") is **not** built yet. It needs real accounts and a database first: see "Next milestone" below.
- Guide entries are not written automatically. The check reads titles only, with no descriptions or transcripts. Writing guide text from a title would be guessing. Entries are written in our own words from what a source actually shows, citing the video.
- Cost: no AI calls. About 3 YouTube quota units per creator per run: about 9 a day for three creators, out of 10,000 free. Netlify usage on the Pro plan should be checked on the team usage page after a week.

## Next milestone: community confirmation (not built)

The goal is to stop the founder having to review every discovery: players confirm or dispute a claim, and it is promoted when enough independent players agree. Built safely, that needs:

1. **Accounts** with real sign-in. Supabase is already built into the site but switched off (`docs/ACCOUNTS.md`). The founder creates the free Supabase project and adds its keys in Netlify.
2. **Claims:** a short statement written in our words from a video, e.g. "The Elegy can be claimed from Chapter 3 by GTA+ members". Each claim has a platform and game version, and links to the discovery it came from. Only claims are confirmed; a video by itself never is.
3. **Review tables and rules** from the handoff (`review/schema.sql`, `review/service.mjs`):
   - one vote per account per claim version;
   - authors can't confirm their own claim;
   - promotion only with 5 confirmations and 2 independent pieces of evidence (both adjustable);
   - a dispute with material evidence holds the claim for a moderator;
   - every change is logged.

   These run inside a database transaction (a Postgres function on Supabase).
4. **Abuse limits:** account age, rate limits, and a server-side check that two pieces of evidence aren't the same recording.
5. **Forms:** "I tested this", "My result differed" and "Suggest a correction", plus a small moderator view.
