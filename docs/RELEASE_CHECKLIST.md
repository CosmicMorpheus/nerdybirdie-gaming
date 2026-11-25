# Release checklist (public launch)

Every box needs a name and a date. The founder signs off last. Until then the site stays a private, noindexed preview.

## Founder decisions
- [x] Address: nerdybirdiegameguides.netlify.app (founder, 2026-11-24). Custom domain and trademark check: later
- [ ] Tagline approved ("Play Smarter. Discover More." proposed)
- [x] Launch scope approved: public and indexable (founder, 2026-11-24)
- [ ] Contact email for corrections supplied → `CONTACT_EMAIL` in `src/config.ts`
- [ ] GTA help channel invite (optional) → `COZMC.gtaHelpChannel`

## Content bar
- [x] Verified achievement and trophy lists per platform (2026-11-25: 54 Xbox, 55 PS5; GamesRadar, IGN cross-check)
- [x] 10–15 actionable, sourced guide entries (2026-11-24: 97 entries incl. 68 story missions)
- [ ] Paid items marked "Paid / optional", with free alternatives where verified
- [x] Videos: only approved ones show on the public build (checked in a local public build, 2026-11-24: none shown)
- [ ] Map attribution visible (map footer and About); rights for the traced geometry reviewed (legal review recommended)

## Configuration for the public build
- [x] `SITE_URL` set (canonical URLs and sitemap) and `PUBLIC_INDEXABLE=true` (netlify.toml, 2026-11-24)
- [ ] `PUBLIC_ASK_SERVER` **unset** (ASK stays browser-only) and `ASK_SERVER_ENABLED` unset on Netlify
- [ ] No `ANTHROPIC_API_KEY`, Supabase or other paid credentials unless separately approved
- [ ] Build is not the fixture build (`NBG_FIXTURES` unset); the "TEST BUILD" banner is absent
- [x] `/review/` redirects away; `/admin/` and `/data/` are noindexed and excluded from the sitemap (local public build, 2026-11-24)

## Checks (record command, result, date)
- [ ] `npm ci` then `npm run verify` (type check, unit tests, both builds, browser tests)
- [x] `npm audit --omit=dev`: 0 vulnerabilities (2026-11-24)
- [ ] Real staging smoke test on a phone and a desktop: tick a guide entry, find and mark a map pin, ASK a question, reload, restore a backup
- [ ] Discord and cozmc.us links open correctly on phone and desktop
- [ ] Lighthouse (mobile) run on staging and the score recorded (no target invented before a baseline)
- [ ] Three testers complete a task without help; feedback logged

## Sign-off
- [ ] Chief of staff reviewed the evidence
- [x] Founder approves release: "Push live", 2026-11-24 (in chat)
