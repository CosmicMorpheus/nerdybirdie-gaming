# Optional Pro unlock (Android)

**Founder decision A (27 Nov 2026):** the website and every guide stay free for everyone. Money comes from an optional, one-time **Pro** purchase
in the Android app. Pro belongs to the account, so it also works in the browser and on a new phone after signing in. No subscriptions, no ads,
no crypto, nothing Discord-gated.

## Free vs Pro

| Free, always (web and app) | Pro (one-time, price set in Google Play, proposed $1.99) |
|---|---|
| Every guide, the map, checklists, achievements and trophies | Cloud sync of progress across devices and the browser (needs an account) |
| Progress on the device, backup file, transfer link | Offline access to the whole guide in the app |
| Spoiler controls, search, ASK "COZMC" (browser search) | Future premium tools as they ship, e.g. a 100% route planner. ASK with AI only with fair-use limits and its own cost plan |
| Creator videos and the daily What's New feed | |

Nothing that's free today becomes Pro. The creator feed (YouTube API data) stays free and outside Pro.

## Names and ids (founder-approved recommendations; confirm right before registering, they can't be changed after)

- App name: **Nerdy Birdie Gaming Guides**. No "GTA" in the app name, icon, product ids or store screenshots. The game is named only in the description, as the game a guide covers.
- Android package: `com.nerdybirdie.gamingguides`.
- Google Play product: `pro_unlock` (one-time, non-consumable). Our internal id `nb-pro` grants `pro`.
- Developer account: organization (NerdyBirdie LLC).

## What's built (27 Nov 2026): nothing switched on

| Part | Where | State |
|---|---|---|
| Products, purchase states, entitlement rule | `src/lib/entitlements/model.ts`, `ledger.ts` | Done, unit tested |
| Google Play state mapping; staging-only test store | `src/lib/entitlements/stores.ts` | Done, unit tested. The Play API call needs the service account (Android milestone) |
| In-memory ledger for tests | `src/lib/entitlements/memory.ts` | Done |
| Database tables and access rules | `supabase/migrations/20261127000000_entitlements.sql` | Written, not applied anywhere |
| Account sign-in and cloud progress | `src/lib/account/`, `docs/ACCOUNTS.md` | Built earlier, off until Supabase exists |

How it works: the app sends the store's purchase token to our server → the server checks it with Google → `recordPurchase` stores it
(one token = one account, duplicates are no-ops) → Pro features ask `hasAccess(user, 'pro')` on the server. Pending and canceled purchases never unlock;
refunds and revocations (from Google's notifications or the daily reconciliation) remove access and can't be undone by a replayed client report.
Manual grants (support, Google's reviewers) need an admin and a reason and are logged separately from purchases. Audit entries never store full tokens.

## The brief's §23 checks

| Check | Status |
|---|---|
| Verified purchase unlocks only the right thing | Unit tested |
| Duplicate transaction can't create conflicting ownership | Unit tested |
| Pending or canceled purchase doesn't unlock | Unit tested |
| Refund or revocation updates the entitlement | Unit tested |
| Restore on another device keeps ownership | Unit tested (ledger); needs a real device test later |
| Test store can't run in production | Unit tested |
| Guest can browse; content updates keep progress; mobile works; network errors handled | Already covered by the site's e2e tests |
| Sign-in, cross-device progress, account deletion, customers can't read others' records, admin-only functions, backups restore | Need the Supabase staging project |
| Real Google Play purchases | Need the Play Console account and the app (Google's test tracks; simulated tests don't count) |

## Next steps, in order

1. **Founder:** create a free Supabase account (project: staging), and send a public contact email. Arrange a short legal check of the app name, terms and refund wording.
2. Create a separate **staging** Netlify project (free) and point it at the Supabase staging project. Apply both migrations there.
3. Server functions: `GET /api/me/entitlements`, `POST /api/purchases/verify` (test store on staging only), account deletion. Then the `/library/` and account pages.
4. Terms of Service, purchase/refund and account-deletion pages, for the founder and a lawyer to review.
5. **Founder:** Google Play developer account as NerdyBirdie LLC (Google asks organizations for a D-U-N-S number).
6. Android app with Capacitor, Play Billing, Google's internal and closed testing.
