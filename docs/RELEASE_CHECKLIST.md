# Release checklist (public launch)

Every box needs a name and a date. The founder signs off last. Until then the site stays a private, noindexed preview.

## Founder decisions
- [x] Address: https://gameguides-nerdy-birdie.live (founder, 2026-11-25; custom domain live, password on). Trademark check: later
- [ ] Tagline approved ("Play Smarter. Discover More." proposed)
- [x] Launch scope approved: public and indexable (founder, 2026-11-24)
- [ ] Contact email for corrections supplied → `CONTACT_EMAIL` in `src/config.ts`
- [ ] GTA help channel invite (optional) → `COZMC.gtaHelpChannel`

## Content bar
- [x] Verified achievement and trophy lists per platform (2026-11-25: 54 Xbox, 55 PS5; GamesRadar, IGN cross-check)
- [x] 10–15 actionable, sourced guide entries (2026-11-24: 97 entries incl. 68 story missions)
- [x] Paid items marked "Paid / optional" (2026-11-27: 3 entries flagged — editions, GTA+ perks, GTA+ Elegy; keyword scan of all 227 entries found no unflagged purchase items). Free alternatives: none verified yet
- [x] Videos: only approved ones show on the public build (checked in a local public build, 2026-11-24: none shown)
- [x] Map attribution visible: under the map, on About and on Credits (checked 2026-11-27)
- [ ] Rights for the traced map geometry reviewed (legal review recommended; founder)

## Configuration for the public build
- [x] `SITE_URL` set (canonical URLs and sitemap) and `PUBLIC_INDEXABLE=true` (netlify.toml, 2026-11-24)
- [x] `PUBLIC_ASK_SERVER` not set in `netlify.toml` (2026-11-27)
- [ ] `ASK_SERVER_ENABLED` / `PUBLIC_ASK_SERVER` unset in Netlify's dashboard env vars (not visible from the build environment; founder to confirm)
- [ ] No `ANTHROPIC_API_KEY`, Supabase or other paid credentials in Netlify's dashboard env vars (none in the repo or `netlify.toml`, checked 2026-11-27; dashboard: founder to confirm)
- [x] Build is not the fixture build: Netlify runs `npm run build`, `NBG_FIXTURES` not set; public-config build has no "TEST BUILD" banner and robots `index, follow` (2026-11-27)
- [x] `/review/` redirects away; `/admin/` and `/data/` are noindexed and excluded from the sitemap (local public build, 2026-11-24)

## Checks (record command, result, date)
- [x] `npm ci` then `npm run verify` (type check, unit tests, both builds, browser tests): all pass (2026-11-27; counts in docs/DECISIONS.md)
- [x] `npm audit --omit=dev`: 0 vulnerabilities (2026-11-24, again 2026-11-27)
- [ ] Real staging smoke test on a phone and a desktop: tick a guide entry, find and mark a map pin, ASK a question, reload, restore a backup
- [ ] Discord and cozmc.us links open correctly on phone and desktop
- [x] Lighthouse 12.8.2 (mobile, simulated slow 4G + 4× CPU) on a local public-config build served with gzip, 2026-11-27. Not yet run against the live site (unreachable from the build environment; password-protected). Performance / Accessibility / Best practices / SEO:
  home 89/100/100/100 · games 96/100/100/100 · GTA VI 93/100/100/100 · guides 97/100/100/100 · walkthrough 95/100/96/100 · achievements 93/100/100/100 · map 81/100/100/100.
  Fixed on the way: map redraw loop (blocking time 56 s → 0.07–0.2 s, layout shift 0.50 → 0.003), map loading placeholder, COZMC fonts 96 → 32 KB, footer banner 112 → 48 KB
- [ ] Three testers complete a task without help; feedback logged

## Sign-off
- [ ] Chief of staff reviewed the evidence
- [x] Founder approves release: "Push live", 2026-11-24 (in chat)
