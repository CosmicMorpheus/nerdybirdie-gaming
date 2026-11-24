# Milestone report: Phase 1 vertical slice

- **Phase / milestone:** Phase 1, first end-to-end slice (tracker + site shell + COZMC links)
- **Date:** 2026-11-24
- **Approved scope:** docs/06_PHASE0_PLAN.md §6 slices 1–7, decisions A–J, approved by the founder 2026-11-24
- **Status:** done locally, on branch `phase-1`. **Not deployed.**

## What works

| Area | Result |
|---|---|
| Site shell | Header (desktop nav, mobile menu), footer with disclaimer, Home, Games, GTA VI overview, Guides (honest empty state), My Progress, Search, About, Privacy, Corrections, Updates, 404 |
| COZMC | Discord + cozmc.us as separate links in: header pill, mobile menu, home panel (COZMC purple/coral with its own logo), tracker/guide inline panel, footer. Discord invite checked live (see Sources). |
| Content system | JSON + Zod schemas; the build fails on bad IDs, unknown platforms/sources/categories, missing spoiler text, or a safe title containing the protected title. Only `approved` + verified entries are public. |
| Tracker | Separate Xbox / PS5 lists, overall and per-category totals with real denominators, empty = "Not verified yet" (never 100%), search, All/To do/Done, Saved items, notes, reset with confirmation, platform choice remembered |
| Spoilers | Spoiler-free by default; minor/all modes; per-item reveal; changing mode hides reveals again. Spoiler text isn't in any page, page metadata or the search index, and isn't downloaded until needed. |
| Saving | Browser storage with schema version and migration that keeps good entries and drops bad ones; unreadable data is copied aside first; data from a newer version is never overwritten; blocked storage and full storage show plain-language messages |
| Backup | Download JSON backup; restore shows a preview ("1 new, 2 would be unticked") before writing; invalid files are rejected and nothing changes |
| Preview safety | "Preview · not yet launched" banner, `noindex`, `robots.txt` disallows everything until launch settings are set |

## Content

- **Verified:** GTA VI released **19 November 2026** for **PlayStation 5 and Xbox Series X|S**. Source: Rockstar Games, "Grand Theft Auto VI Now Available", https://www.rockstargames.com/newswire/article/39akk424a9oo53, read 2026-11-24 ("now available worldwide for PlayStation 5 and XBOX Series X|S"). PC is not listed because it isn't announced.
- **Not verified, so not published:** the achievement and trophy lists. TrueAchievements, XboxAchievements, PSNProfiles and PlayStationTrophies all block automated access with bot checks, and I didn't try to get around them. The tracker shows an honest empty state for both platforms.
- **Test data:** `content/fixtures/` holds 14 fake objectives, used only by the test build (red "TEST BUILD" banner). A test confirms the real build has none.

## Test commands and actual results

Run from a clean `npm ci`:

| Command | Result |
|---|---|
| `npm run check` (astro check, TypeScript strict) | 0 errors, 0 warnings, 0 hints (49 files) |
| `npm test` (Vitest) | 3 files, **33 passed** |
| `npm run build` / `npm run build:test` | 12 pages each, built OK |
| `npx playwright test` (desktop 1440 + Pixel 7) | **30 passed** |
| `npm audit` | 0 vulnerabilities |

Browser tests cover: exact COZMC links and `rel=noopener`; noindex; honest empty tracker; no fixture data in the public build; official platform source; **axe scan (WCAG 2.0/2.1/2.2 A+AA, serious/critical) on all 11 pages**; no sideways scroll at 320 and 390px on all pages; mobile menu links; spoiler leak check across every built file; check/uncheck/reload; Xbox/PS5 separation; reveal and mode switching; safe search; filters; bookmarks; notes; reset cancel/confirm; keyboard-only ticking; blocked storage; export → bad import rejected → good import restored; phone tap targets ≥ 44px.

Size: whole site 2.3 MB (mostly fonts and logo variants); all JavaScript 72 KB uncompressed; tracker script ~3 KB gzipped.

## Visual checks

Screenshots of real rendered pages are in `docs/qa/phase1/`: home at 320/390/1440 px, tracker (test build, one item ticked, one revealed) at 320/390/768/1024/1440 px, empty real tracker at 390 px, game overview, progress page, and 200% zoom (640 px CSS viewport) for home and tracker with no sideways scroll.

Fixed after looking at them: the phone tracker's status filter wrapped onto two lines, and the row buttons took a whole extra line. On phones they now sit on the right of each row; below 360 px they drop under the text.

## Not run or not verified

- **Lighthouse:** not run; it was blocked in this session. Not scored.
- **Real devices:** not tested on a physical phone or console browser.
- **Screen readers:** not tested with VoiceOver/NVDA. Automated axe checks only, plus keyboard ticking.
- **Colour contrast:** checked by axe on the rendered pages; not checked by hand pair by pair.
- **Safari/Firefox:** tests ran in Chromium only.

## Known issues and limitations

- The header logo is the full logo at 40 px, so its lettering isn't readable at that size (option (a) from the plan). Typed name beside it carries the brand.
- Hero uses an abstract sunset gradient; no game imagery until the founder's screenshots arrive.
- Progress is per browser; there's no sync (by design for the MVP).
- The repo is still **public** (GitHub reported it so); this session can't change repo settings.

## Next scoped milestone (needs approval)

1. **Achievement list:** the founder (playing on Xbox) shares the in-game achievement list, as screenshots or text, and I enter it as `founder-verified`, cross-checked wherever a source is reachable. Or approve a different source.
2. **Staging deploy:** a new Netlify site, password-protected, from this branch.
3. **Phase 2:** PS5 trophies, first guides (with your screenshots), click-to-load YouTube, sitemap at launch.

## Founder approvals or inputs required

- Merge `phase-1` into `main` after review.
- How to source the achievement/trophy lists (see above).
- Approval to create the staging Netlify site.
- Make the GitHub repo private (Settings → General → Danger Zone).
- Separately: the **live cozmc.us site still links the expired invite** `discord.gg/UUyC6aw9W`. That's a change to the cozmc repo, outside this project; it needs your go-ahead.
