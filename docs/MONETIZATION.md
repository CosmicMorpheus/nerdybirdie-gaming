# Monetization architecture and platform billing

27 November 2026. Covers §6 of the founder's ecosystem brief. **Nothing here is switched on.** No payments, paywall or live sign-in exist.

## 1. Where things stand

| Item | State |
|---|---|
| Founder decision A (27 Nov 2026, `docs/PRO_UNLOCK.md`) | Website and every guide free; optional one-time **Pro** unlock in the Android app (cloud sync, offline, future premium tools) |
| Ecosystem brief (27 Nov 2026) | Proposes ~$1.99 one-time purchase **per premium game guide**, independent per-guide access, free download and free preview. Described as "a working business decision" |
| Conflict | The two models differ on whether guide content is ever paid. **Founder decision needed** (ROADMAP open decision 1). Until then Option A stands and CLAUDE.md's "free public guide" rule applies |

## 2. The architecture supports either model

| Need | How | Status |
|---|---|---|
| Per-guide access configuration | `content/games/<id>/game.json` → `access: { tier: 'free' \| 'premium', grant?: 'guide:<id>' }` | Field added; **`premium` fails the build** until approved (`src/lib/content/validate.ts`) |
| Game-specific entitlements | `Grant = 'pro' \| 'guide:<id>'` in `src/lib/entitlements/model.ts`; ledger rules unit tested | Core done, off |
| User accounts | Supabase Auth magic link, row-level security (`docs/ACCOUNTS.md`) | Built, off |
| Saved progress across devices | Per-item merge, guest→account merge, `progress` table | Built, off |
| Secure purchase verification | Server verifies the store token → `recordPurchase` (one token = one account; pending/canceled never unlock; refunds revoke) | Core done; store API calls need the Android milestone |
| Purchase restoration | Ownership belongs to the account, so signing in on a new device restores it | Unit tested at ledger level |
| Premium content delivery (only if per-guide paywall is chosen) | Premium sections kept out of the public build and app package; a function returns them after checking the account's entitlement, `Cache-Control: private, no-store` | Planned (`docs/COMMERCIAL_PLATFORM_AUDIT.md` §8) |

**Never used as access control:** a shared site password (the current Netlify visitor password is a temporary pre-launch gate only),
client flags, localStorage, URL parameters, the app saying "I paid", Discord roles or wallets.

## 3. Platform billing requirements

Checked by web search on 27 Nov 2026. These rules changed repeatedly in 2025–2026 and differ by country. **Confirm on the official pages
before choosing or building anything**, and get the legal review already on the founder's list.

### Website (browser)

- Our own rules apply. A web checkout would need a payment processor (new vendor, founder approval), Terms, a refund policy and tax handling.
- A website purchase **does not** automatically satisfy store rules for buying the same thing inside an app (see below).

### Google Play (Android) — first target

- **United States:** after the Epic v. Google ruling, Google says it does not require Google Play Billing for apps on Play in the US and
  allows other in-app payment methods and telling users about outside pricing. Developers using alternative billing or external links must
  enrol in Google's programs, report transactions and pay service fees (programs launched 9 Dec 2025; reporting notice 22 Jul 2026).
  A revised settlement with Epic was pending court approval. Source: [Play Console Help, US programs](https://support.google.com/googleplay/android-developer/answer/15582165).
- **UK / EEA / US fee change (from 30 Jun 2026):** service fee separated from billing fee; service fee starts at 10% on the first $1M a year
  whichever billing is used; alternative billing or external links avoid the Play billing fee. Source:
  [Android Developers Blog, June 2026](https://android-developers.googleblog.com/2026/06/play-expanded-billing.html).
- **Other markets:** Google Play Billing is still the default requirement for digital goods; check the Payments policy for each country.
- **Practical recommendation:** use **Google Play Billing** for the first Android release in every market. It's the one route that is
  allowed everywhere, gives restore/refund handling, and avoids running separate reporting programs. Revisit alternative billing only if fees
  matter at scale.

### Apple App Store (iOS) — possible later

- **Digital content unlocked inside an iOS app generally requires Apple In-App Purchase** (App Review Guideline 3.1.1).
- **United States storefront:** since a 30 Apr 2025 court order, apps may include buttons and links to outside purchase pages without an
  entitlement. Apple revised the guidelines again in 2026; reports differ on details and App Review has applied them unevenly (e.g. tips).
  Sources: [MacRumors (May 2025)](https://www.macrumors.com/2025/05/01/apple-updates-u-s-app-review-guidelines-epic/),
  [Apple developer forum report](https://developer.apple.com/forums/thread/844046). Outside the US, link-outs need Apple's entitlements and fees where available.
- **Practical recommendation:** if iOS happens, plan for In-App Purchase, with the same server-side entitlement ledger (`store: 'app_store'` added).

### Cross-platform access

- "Buy once, use everywhere" is possible because ownership sits on our account server, not the device. Stores generally permit honouring a
  purchase made elsewhere, but each store has rules on what you may **sell or advertise** inside its app. Confirm before launch.

## 4. Pricing

~$1.99 (brief) / proposed $1.99 Pro (decision A). Store prices are set in the store console; we never store prices in code.
At Google's 15% (10% service + 5% billing on Play Billing), a $1.99 sale nets about $1.69 before tax (`docs/COMMERCIAL_PLATFORM_AUDIT.md` §9).

## 5. Before any money changes hands

Founder: monetization choice, legal review (name, terms, refunds), Supabase account, contact email, Play Console (organization, D-U-N-S).
Build: separate staging project, server functions (`/api/me/entitlements`, purchase verify, account delete), Terms/refund/account-deletion pages,
Google internal and closed testing. Order: `docs/PRO_UNLOCK.md` → Next steps.
