# Company decision log

Last updated: 27 November 2026 (Gaming Guides repo). Newest first. Only decisions that affect the company or more than one product.
Gaming Guides' detailed log: `docs/DECISIONS.md`. "Proposed" = waiting for the founder.

| Date | Decision | Status | Why |
|---|---|---|---|
| 2026-11-27 | Shared source-of-truth documents (these seven) maintained in every Nerdy Birdie project | Approved (founder) | One consistent architecture across websites and future apps |
| 2026-11-27 | Product priorities: gaming first, community second, monetization third | Approved (founder) | From the ecosystem brief; guides every feature decision |
| 2026-11-27 | nerdy-birdie.com is the corporate portfolio; Gaming Guides is the product. The product links back with attribution and never duplicates the corporate site | Approved (founder) | Clear roles for each property |
| 2026-11-27 | Gaming Guides monetization: website and every guide free; optional one-time Pro unlock in the Android app (cloud sync, offline, future premium tools) | Approved (founder, "Option A") | Keeps search/community discovery free; avoids paywalling content that is mostly sourced facts; lower trademark/store risk |
| 2026-11-27 | Ecosystem brief proposes ~$1.99 per premium game guide with per-guide entitlements | **Proposed** — conflicts with Option A above | Architecture now supports either (per-game `access` config, `guide:<id>` grants) but paid tiers are blocked at build until the founder chooses. See `docs/MONETIZATION.md` |
| 2026-11-27 | No shared password as production access control; no web payment rules assumed for Google Play / App Store | Approved (founder) | Platform billing rules differ; documented in `docs/MONETIZATION.md` |
| 2026-11-25 | Gaming Guides official address: https://gameguides-nerdy-birdie.live; links back to https://nerdy-birdie.com/ | Approved (founder) | Founder bought the domain |
| 2026-11-24 | COZMC Discord invite `https://discord.gg/VBeBE7MSSq` (never expires) | Approved (founder) | Previous invite expired |
| 2026-11-23 | Gaming Guides is a separate repo and site, independent of the COZMC repo and cozmc.us | Approved (founder) | No risk to the live COZMC site |
| 2026-11-23 | No blockchain, payments, live authentication or token incentives in the Gaming Guides MVP; no wallet or Discord gate ever for ordinary use | Approved (founder) | Gaming first; Web3 stays optional |
