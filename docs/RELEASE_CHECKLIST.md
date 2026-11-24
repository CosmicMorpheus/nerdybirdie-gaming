# Release checklist (public launch)

Every box needs a name and a date. The founder signs off last. Until then the site stays a private, noindexed preview.

## Founder decisions
- [ ] Domain chosen, availability and trademark checked (proposed: nerdybirdie.gg or gaming.nerdybirdie.com; not checked)
- [ ] Tagline approved ("Play Smarter. Discover More." proposed)
- [ ] Launch scope approved (private beta now; public when the content bar below is met)
- [ ] Contact email for corrections supplied → `CONTACT_EMAIL` in `src/config.ts`
- [ ] GTA help channel invite (optional) → `COZMC.gtaHelpChannel`

## Content bar
- [ ] Verified achievement and trophy lists per platform, **or** the tracker kept out of navigation (current: kept out)
- [ ] 10–15 actionable, sourced or founder-tested guide entries (current: 6 official reference entries)
- [ ] Paid items marked "Paid / optional", with free alternatives where verified
- [ ] Videos: only approved ones show on the public build (review videos hidden automatically once indexable)
- [ ] Map attribution visible (map footer and About); rights for the traced geometry reviewed (legal review recommended)

## Configuration for the public build
- [ ] `SITE_URL` set (canonical URLs and sitemap) and `PUBLIC_INDEXABLE=true`, only at launch
- [ ] `PUBLIC_ASK_SERVER` **unset** (ASK stays browser-only) and `ASK_SERVER_ENABLED` unset on Netlify
- [ ] No `ANTHROPIC_API_KEY`, Supabase or other paid credentials unless separately approved
- [ ] Build is not the fixture build (`NBG_FIXTURES` unset); the "TEST BUILD" banner is absent
- [ ] `/review/` redirects away; `/admin/` and `/data/` are noindexed and excluded from the sitemap

## Checks (record command, result, date)
- [ ] `npm ci` then `npm run verify` (type check, unit tests, both builds, browser tests)
- [ ] `npm audit --omit=dev`: 0 vulnerabilities
- [ ] Real staging smoke test on a phone and a desktop: tick a guide entry, find and mark a map pin, ASK a question, reload, restore a backup
- [ ] Discord and cozmc.us links open correctly on phone and desktop
- [ ] Lighthouse (mobile) run on staging and the score recorded (no target invented before a baseline)
- [ ] Three testers complete a task without help; feedback logged

## Sign-off
- [ ] Chief of staff reviewed the evidence
- [ ] Founder approves release: __________________ date ________
