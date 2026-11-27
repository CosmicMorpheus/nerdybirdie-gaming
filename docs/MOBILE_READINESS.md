# Mobile application readiness review

27 November 2026. Covers §10 of the founder's ecosystem brief. Target: Google Play first, possibly the App Store later.

| Area | Current state | Gap / blocker | Recommendation |
|---|---|---|---|
| Responsive design | Phone-first layouts; e2e tests check no sideways scroll at phone and 320px widths | None known | Keep the phone tests on every new page |
| App navigation | Sticky header + "Menu" sheet on phones; breadcrumbs on game pages | A native-feeling bottom tab bar may suit an app | Decide during the app milestone; the header already derives game links from config |
| Touch targets | 44px+ on buttons, checkboxes and quick links (tracker test checks this) | None known | — |
| Performance | Static pages, islands only where needed, self-hosted fonts | **Never measured** (no Lighthouse run recorded) | Run Lighthouse on a mobile profile before the app milestone |
| Authentication | Supabase magic link built, off | Magic links in a WebView need deep-link handling; Google sign-in likely wanted on Android | Plan Android App Links + optional Google sign-in |
| Data persistence | Versioned localStorage, backup file, transfer link | WebView storage can be cleared by the OS | Cloud sync (account) for app users; keep local-first |
| Offline | **No service worker**; manifest has `display: browser` | App "offline access" (Pro feature) not built | Bundle content in the app package, or add a service worker; decide with the app wrapper |
| Payment architecture | Store-agnostic entitlement core, off | Play Billing integration not built | See `docs/MONETIZATION.md` |
| Privacy policy | `/privacy/` exists (browser-only data today) | Must be updated before accounts/payments | Update with the account milestone |
| Terms of service | **None** | Required for store listing with purchases | Draft for founder + lawyer review |
| Account and data deletion | Not built (no live accounts) | Google Play requires in-app **and** web-reachable deletion for apps with accounts | Build `account-delete` function and a public deletion page with the account milestone |
| Accessibility | axe scans on every page (WCAG 2.2 AA tags) in e2e; keyboard focus tests | Screen-reader pass on real devices not done | Manual TalkBack check before release |
| App packaging | Web manifest + icons exist | No Capacitor project; package id approved as recommendation only | Capacitor wrapper in `app/` or a separate repo (decide later) |
| Secure backend | Netlify functions; server features off by default | No admin auth, no staging project, no error monitoring | Separate staging project, Supabase roles, alerts before turning anything on |

## Architectural separation (what keeps us out of browser-only lock-in)

- **Presentation** (Astro pages + Preact islands) is separate from **content** (`content/games/*` JSON), **progress** (`src/lib/progress/`,
  pure TypeScript), **auth** (`src/lib/account/`) and **entitlements** (`src/lib/entitlements/`). The libraries have no DOM dependency except the
  storage adapter, so they can run in a WebView, a native shell or a server.
- Content is served as static JSON (`/data/<game>/…`), usable by an app as-is.
- No feature depends on a browser-only API without a fallback (storage failures show a recoverable notice).

## Not checked in this review

Real-device testing, Lighthouse scores, store policy review by a lawyer, Capacitor plugin compatibility.
