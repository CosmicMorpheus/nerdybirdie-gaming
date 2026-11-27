# Ecosystem alignment audit and changes — 27 November 2026

Response to the founder's "Product Architecture & Ecosystem Alignment" brief. Branch `claude/youthful-mendel-oohews`, based on `cycle-02`
(the branch the live site is deployed from, 41 commits). Nothing was deployed.

## 1. Existing functionality preserved (unchanged)

Every guide section and all 227 entries, 54 Xbox achievements and 55 PS5 trophies, the Leonida map, tracker, ranks and checkpoints, spoiler
modes and protected text, search, progress store (schema, ids, backup, transfer link), ASK "COZMC" (browser-only), creator feed, Report a
problem, Credits, account sync and entitlement core (both off), COZMC links, header logo → games list (founder request, 27 Nov), all brand assets.
The full Updates history was moved into data with **byte-identical rendered text** (compared before/after).

## 2. Conflicts with the updated company architecture

| Conflict | Handling |
|---|---|
| Brief: ~$1.99 per premium guide. Founder decision A (same day): every guide free + optional Android Pro unlock | **Not resolved by me.** Recorded as an open decision; architecture supports both; paid tiers blocked at build |
| Home page was the GTA VI page; brief wants a product landing page | **Changed** (see §6) |
| Site name "NerdyBirdie LLC Gaming Guides" puts the parent company in the product name; brief and approved app name use "Nerdy Birdie Gaming Guides" | **Not changed** — founder branding decision (ROADMAP open decision 2) |
| Brief lists `https://www.cozmc.us`; config uses the approved `https://cozmc.us/` | Kept the approved URL (tests assert it) |
| Unmerged branch `claude/amazing-shannon-1ex2ep` has one decision-log commit ($1.99 guides + Discord invite) | Superseded: the invite is already in `cycle-02`'s log and decision A replaced the pricing note. Not merged |

## 3. Missing infrastructure

Live accounts and staging Supabase project; separate staging Netlify project; server functions for entitlements, purchase verification and
account deletion; Terms of Service and refund pages; account-deletion page; community submission + moderation tools; revision history; admin
auth and audit log for server features; error monitoring; service worker / offline; Capacitor app; Lighthouse baseline. Details:
`docs/MONETIZATION.md`, `docs/MOBILE_READINESS.md`, `docs/CONTENT_WORKFLOW.md`.

## 4. Security concerns

- Site-wide Netlify visitor password is the only access control. Acceptable as a pre-launch gate; **must not** become paid-content protection.
- All guide content is in public static files, so any "premium" content would be readable without paying — hence the build-time block on `premium`.
- Staging and production share one Netlify project (creator feed "staging" runs on the live site).
- Off-by-default server features (ASK server, guide-updates queue, admin page) need real admin auth before being switched on.
- No secrets found in tracked files (pattern scan for Anthropic, Google, Supabase JWT/service-role, GitHub and private keys, 27 Nov). `src/config.ts` holds only public URLs; keys are documented as Netlify env vars.

## 5. Mobile application blockers

No Terms page, no account-deletion flow, no offline support, no Play Billing integration, no measured performance, no app wrapper.
None block the website. Full table: `docs/MOBILE_READINESS.md`.

## 6. Changes made (low-risk structural improvements)

| Change | Files |
|---|---|
| **Product landing page**: gaming intro, **Explore Game Guides** primary CTA, My progress + Continue, Featured guides, Recently updated, progress HUD, "more guides" path, COZMC panel. Phone page ~21% shorter (4836 → 3830px) | `src/pages/index.astro` |
| **Game landing page** now holds the GTA VI-specific quest board and How to 100% (generalised to the game's own platforms), plus a Map tool card | `src/pages/games/[game]/index.astro` |
| Reusable **GameCard** used by home and library; library sorted by status, heading "Game guides" | `src/components/GameCard.astro`, `src/pages/games/index.astro` |
| Game config: `featured`, `access` (free/premium, premium rejected by the validator), `platformNote` | `src/lib/content/schema.ts`, `validate.ts`, `content/games/gta-vi/game.json` |
| Per-game **update history** as validated data (newest-first enforced) | `content/games/gta-vi/updates.json`, `src/pages/updates.astro` |
| Shell no longer hard-codes GTA VI: header/footer links, ASK "COZMC" and Updates follow the current game (or the primary game) | `src/layouts/Base.astro`, `src/components/Header.astro`, `Footer.astro`, `src/islands/AskCozmc.tsx`, `src/lib/content/load.ts` |
| Fixed: card stats text wrapped at ~180px because of an unscoped `.facts` rule in `src/islands/tracker.css` | `GameCard.astro` (class renamed) |
| Docs: shared source of truth, monetization/billing, mobile readiness, content workflow, content guide, README | `docs/shared/*`, `docs/*.md`, `README.md` |

## 7. Areas that still need to become reusable for future games

Creator feed (`Discoveries`, daily check) and its copy assume one game; `src/lib/content/spots.ts` IGN cross-reference is GTA-only;
`src/lib/ask/queue.ts` (server, off) hard-codes `gta-vi`; `GameArt.astro` has GTA art with a generic fallback (by design); progress HUD on the
home page shows the primary game only (fine for one game; a per-game switcher or list is needed with two).

## 8. Decisions requiring founder approval

See `docs/shared/ROADMAP.md` → Open founder decisions (monetization model, site display name, header logo target, vendor accounts and legal
review, COZMC Arcade/Cozmlings URLs, second game).

## 9. Verification

Recorded in the milestone summary of the commit/hand-off: `astro check`, Vitest, feed tests, full Playwright e2e (both builds, axe on every
page, phone layouts), plus screenshots of home, game and library pages at 1440px and 390px.
