# Commercial platform: Milestone 1 audit and plan

27 November 2026. Response to the "Master Development README — Commercial Platform Foundation" brief (from GPT, supplied by the founder).
This is the Milestone 1 report the brief asks for. Nothing commercial has been built: no accounts, payments, paywall or Android work.
Prices and policies below were checked by web search on this date; confirm them on the official pages before acting.

## 0. The decision that comes first

The brief turns the guide into a paid product ($1.99 per guide). Our standing rules (CLAUDE.md, the product spec and DECISIONS.md) say the opposite:
**free public guide, no account gate, no payments or live sign-in in the MVP.** Only the founder can change that. Two risks matter more than the code:

1. **Trademark and app-store risk.** Google Play's intellectual property policy says an "unofficial" label doesn't make it OK to use someone
   else's trademark. A name, icon or listing likely to cause confusion about the source can be rejected or removed. An app called
   "GTA Gaming Guide" with a price tag is a likely target, and Take-Two protects its brands actively. The store name, icon and screenshots
   should avoid the GTA name and art. Get a short review from a lawyer before paying for anything.
2. **Where our facts come from.** 220 of our 227 entries cite IGN. The text is ours and facts aren't copyrightable, but a paid product
   built mostly from one competitor's guide is a weak position, both legally and commercially (people can read IGN free). A paid guide needs
   more of our own first-hand checking: the founder or testers confirming in the game, and our own screenshots.

**Recommendation:** keep the website free (it's what brings people in through search, Discord and creators, and it's the current rule). If the founder
wants revenue, sell an optional **Android "Pro" unlock for $1.99** that adds things that cost us money or add real convenience: cloud sync across
devices, offline access in the app, and later premium tools (100% route planner, ASK with AI). The free guide stays free. This avoids putting a
paywall on content that is mostly checked facts, and it keeps COZMC and creator links working. The paywall option is fully planned below if the founder prefers it.

## 1. Current architecture

| Part | What it is today |
|---|---|
| Site | Astro 7 static site, TypeScript, Preact islands. 28 pages built at deploy time. |
| Content | JSON in `content/games/<game>/` (game, entries, objectives, videos, map), validated with Zod at build. Stable ids (`gta-vi:entry:<slug>`), per-entry sources with check dates, Confirmed/Unconfirmed/Rumor, spoiler text split into `protected.json`. |
| Hosting | One Netlify project (`nerdybirdiegameguides`, id 60c45b02…), custom domain gameguides-nerdy-birdie.live. Deploys are uploads from this repo (branch `cycle-02`). |
| Server code | Netlify Functions: daily YouTube creator check and feed (`nb-daily`, `nb-feed`, Netlify Blobs); ASK server, guide-updates queue and source checks (built, switched off). |
| Progress | Browser only (localStorage, schema v2), with backup file and transfer link. Account sync on Supabase is built and tested but off (`docs/ACCOUNTS.md`, `supabase/migrations/`). |
| Access control | Netlify site-wide visitor password (temporary). |
| Tests | Zod content checks, `astro check`, Vitest (93), feed tests (18), Playwright e2e with axe (91), including phone layouts. |

## 2. What can be reused

- **Content model** already matches most of the brief's entities: guide (game), sections (guide categories), items (entries, objectives, map pins),
  sources, verification status, spoiler levels, stable ids. Corrections keep ids, so ticks survive updates (tested).
- **Progress**: per-item merge (newest action wins), guest-to-account merge, transfer link. All reusable for cloud progress.
- **Supabase integration**: magic-link sign-in, row-level security on a `progress` table, sync status UI. A switched-off, tested starting point.
- **Public/protected split**: the build already keeps some text out of pages and serves it separately. A paywall would extend this pattern, served by a function that checks ownership instead of from a static file.
- **Review queue and daily feed**: a base for the "What's New" discovery feed and, later, community submissions (nothing auto-publishes today).
- **Report helper and Credits page** (added today): content reporting and attribution, both of which the brief asks for.

## 3. Security findings

No customer data is stored on our servers today, so nothing can leak. As a paid product, though, these would be gaps:

| Finding | Why it matters | Fix |
|---|---|---|
| Site password is shared and site-wide | Anyone with it can pass it on. It isn't per-person access | Replace with sign-in plus server-checked ownership before charging (brief §9) |
| All guide content is in public static files | Any "premium" content would be readable without paying | Keep premium content out of the build. A function returns it only after checking the account's entitlement |
| Staging and production are the same Netlify project | The creator feed "staging" runs on the live site; tests and real customers would share it | Create a separate staging project before accounts or payments |
| No error monitoring or backups for Netlify Blobs | Fine for a free feed. Not fine for purchase records | Purchases and entitlements live in Postgres (Supabase) with backups. Add error alerts |
| Off-by-default server features (ASK server, guide updates, admin) | Safe while off. Each needs real admin auth before it's switched on | Supabase roles, server-side checks, audit log |

## 4. Missing infrastructure

Live sign-in; a database for purchases and entitlements; Google Play purchase verification and refund notifications; a function that serves premium content;
admin roles and audit log; Terms of Service, purchase/refund and account-deletion pages; a contact email; staging environment; error monitoring;
spending alerts; the Android app (Capacitor, later).

## 5. Recommended technology

- **Keep** Astro + Netlify (no rebuild). Static public pages, functions for anything private.
- **Supabase** for auth and Postgres. It's already integrated and tested, has row-level security, magic-link sign-in and account deletion.
  Firebase would mean redoing that work for no clear gain.
- **Netlify Functions** for purchase verification, the Real-time Developer Notifications endpoint and premium content.
- **Capacitor** for Android later, after checking that a maintained Google Play Billing plugin fits (or writing a small native billing module).

## 6. Proposed database (Supabase Postgres)

| Table | Key fields | Notes |
|---|---|---|
| `profiles` | user_id (auth), display_name, created_at | Minimal: email lives in Supabase Auth only |
| `guides` | id (`gta-vi`), title, status (coming-soon/preview/available/archived), content_revision, updated_at | Mirrors `game.json`; the site already shows `guideStatus` |
| `guide_products` | guide_id, store (`google_play`, `test`), product_id, active | Price is never stored: Google Play supplies the local price |
| `purchases` | id, user_id, store, product_id, purchase_token (unique), order_id, state, acknowledged_at, raw_status, created_at | One row per verified token; the unique token stops duplicates |
| `entitlements` | user_id, guide_id, source (purchase/grant/test), purchase_id, status (owned/pending/revoked), granted_by, updated_at | What the content function checks. Manual grants are marked as such |
| `progress` | user_id, data (json), version | Exists today (one document per player) |
| `content_revisions` | guide_id, revision, published_at, notes | Content stays in git; this records what was published when |
| `reports`, `submissions`, `reviews` | … | Later (Milestone 8). Not opened to the public until moderation exists |
| `audit_log` | actor, action, target, at | Every admin action and manual grant |

Row-level security on every table: customers read only their own rows. Writes to `purchases` and `entitlements` happen only from server functions (service role).

## 7. Authentication

Supabase Auth with email magic links (already built), optional Google sign-in for Android. No passwords to store, no Discord or wallet. Account deletion
via a server function (deletes auth user, profile and progress; keeps purchase records for the legal retention period, disclosed on the Privacy page).

## 8. Entitlement architecture

1. Public build: catalog, previews and the free guide (as today).
2. Premium content is kept out of the public build and app package (private storage). `GET /api/guide/<id>/content` (Netlify Function) checks the
   Supabase session token and an `owned` entitlement, then returns the content with `Cache-Control: private, no-store`.
3. Never trusted for access: client flags, localStorage, URL parameters, the app saying "I paid", passwords or Discord roles.
4. Rate limits per account and IP on content and verification endpoints; request validation with Zod (already used everywhere).

## 9. Google Play Billing strategy

Non-consumable one-time product (proposed id `gta_guide_unlock`, or a neutral `guide_unlock_<id>` given the trademark point). App starts the purchase,
sends the token to `POST /api/purchases/google` → the function checks package, product, state and the token's uniqueness with the Google Play Developer API
→ writes `purchases` and `entitlements` → acknowledges the purchase (required within Google's deadline or it's refunded) → returns ownership.
Pending purchases don't unlock. Refunds and revocations arrive through Real-time Developer Notifications (Pub/Sub push to a function) and a daily
reconciliation. Never consumed. A `test` store provider exists only in staging. Service-account keys only in Netlify environment variables.

Fees (checked today): from 30 June 2026 in the US, UK and EEA, Google's service fee is 10% on a developer's first $1M a year, plus a 5% billing fee
for Play Billing (15% total). Other markets still list 15% on the first $1M. A $1.99 sale nets about **$1.69** before tax.

## 10. Intellectual property and compliance

| Item | Status | Commercial risk |
|---|---|---|
| Guide text | Our own words, sources cited | Low for text; medium as a paid product built mostly from IGN facts (see §0) |
| Game logos, art, screenshots | Not used (original card art) | Keep it that way; don't use them in the store listing either |
| "GTA" / "Grand Theft Auto" name | Used to say which game | High in an app name, icon or paid listing (Google Play IP policy) |
| Map data | Open GTA 6 Map, CC BY 4.0 | CC BY allows commercial use with credit (credited on Credits/About) |
| Creator videos | YouTube embeds, click to play | Embeds are fine; keep the YouTube-API feed free and outside any paywall, and check YouTube's developer policies before mixing it with paid features |
| Creator content | Titles and links only | Partnerships need written agreements |
| Brand assets | Supplied by the founder | Confirm NerdyBirdie LLC owns the logo artwork outright (commissioned or AI-generated terms) |

Pages still needed for a paid launch: Terms of Service, purchase and refund information, account deletion (reachable without the app), support contact.
These need the founder's real legal details and a lawyer's review; I won't draft them as if they were final.

## 11. Estimated running costs (per month, USD; estimates)

| Stage | Hosting (Netlify) | Database + auth (Supabase) | Other | Total |
|---|---|---|---|---|
| Development and testing | Free plan (300 credits) | Free (pauses after 1 week idle; 2 projects) | Google Play developer account (one-time fee) | ~$0 |
| 100 customers | Free or Personal $9 | Pro $25 (no pausing, daily backups) | Email sending ~$0–15 | ~$25–50 |
| 1,000 customers | Personal $9 or Pro $20 | Pro $25 (100k monthly users included) | Email ~$0–20, monitoring free tier | ~$35–65 |
| 10,000 customers | Pro $20+ (credits for traffic) | Pro $25 + possible compute upgrade | Email ~$20, monitoring ~$0–30 | ~$70–150 |

Break-even on running costs is roughly 20–40 sales a month. Not included: legal review, company/tax costs, and AI costs (ASK with AI would need its own limits and budget).
Watch for: Netlify projects pause when free credits run out; Supabase free projects pause when idle; email sender rate limits.

## 12. Priorities (if the founder approves a paid product)

1. Founder decisions in §14, and a short legal check on name and listing.
2. Separate staging project; contact email; error alerts.
3. Switch on Supabase (accounts and cloud progress) on staging. Already built.
4. Entitlements, test store provider, premium content function, My Library. Prove the brief's §23 tests on staging.
5. Terms, refund and account-deletion pages (lawyer-reviewed).
6. Android with Capacitor and Play Billing; Google's internal and closed testing.

## 13. Proposed repository changes (not made yet)

`supabase/migrations/` (new tables and policies); `netlify/functions/purchases-google.mts`, `play-rtdn.mts`, `guide-content.mts`, `account-delete.mts`;
`src/lib/entitlements/`; `src/pages/library.astro`; `content/` moves premium sections to a private store at build; `docs/PAYMENTS.md`;
tests for every item in the brief's §23. Android lives in a separate `app/` folder or repo (decide later).

## 14. Decisions for the founder

**27 Nov 2026: the founder chose A (free site + optional app unlock) and accepted the recommendations below.** B, E, F and H are accepted
(ids confirmed again before registering); C, D and G are actions for the founder. Progress is tracked in `docs/PRO_UNLOCK.md`.

| # | Decision | Recommendation |
|---|---|---|
| A | Paid product at all, and what's paid: (1) free site + optional $1.99 Android Pro unlock, (2) paywall the guide everywhere, (3) stay free for now | (1) |
| B | App and product name without the GTA trademark | e.g. "Nerdy Birdie Gaming Guides" with the game named only in the description |
| C | Budget for a short legal review (trademark, terms, refunds) | Yes, before registering anything |
| D | Create a Supabase account (new vendor) | Yes, free plan for staging |
| E | Google Play developer account type (personal or organization) | Organization (NerdyBirdie LLC). Google asks organizations for a D-U-N-S number; personal accounts have closed-testing rules. Check current requirements |
| F | Separate staging Netlify project | Yes |
| G | Public contact email for support and the store listing | Needed either way |
| H | Package id `com.nerdybirdie.gamingguides` and product id | Fine once B is settled |

## What was added to the live site today (allowed under the current free-site rules)

- **Report a problem** on every guide entry, opening a report helper on Corrections that names the entry and builds a report to paste into Discord
  (nothing is sent from the page). Includes copyright and credit concerns (brief §13, §17).
- **Credits** page: where guide facts come from (counted from each entry's sources), creator videos, map licence, fonts and software licences, trademark notice (brief §17).
- **Games page catalog card**: guide status (Available), Free, platforms, entry and achievement counts, last updated date; `guideStatus`
  (coming-soon/preview/available/archived) added to the game data so future guides can be listed honestly (brief §8).
- Already in place before today: What's New / Updates, section and overall progress, stable ids, spoiler protection, verification labels, mobile layouts.
