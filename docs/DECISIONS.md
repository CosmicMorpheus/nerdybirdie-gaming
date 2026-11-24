# Decision log

Newest first. "Proposed" means waiting for the founder; only "Approved" decisions are acted on.

| Date | Decision | Status | Notes |
|---|---|---|---|
| 2026-11-24 | Guide content is one entry list (`entries.json`) with per-entry sources, check dates and Confirmed/Unconfirmed/Rumor; replaces the guide-with-steps model, which only ever held test data | Done | Founder spec for content types and fields |
| 2026-11-24 | First content pass uses Rockstar's official pages only (6 entries) | Done | IGN pages couldn't be reached from this environment by any route (network proxy and fetch tool both refuse ign.com); nothing was written from memory or search snippets |
| 2026-11-24 | Progress stays browser-only; account saving documented, not faked | Proposed | No login or database exists to reuse; needs a founder decision on a provider (docs/ACCOUNTS.md). Merge rule built and tested. |
| 2026-11-24 | Research from IGN, YouTube and guide sites is allowed if every fact links to the original page and guides are written in our own words | Approved | Founder request. Search snippets alone are not enough (they disagree, e.g. on the platinum trophy's name); only full pages from established outlets are used. Blocked until those hosts are allowed in the environment's network settings. |
| 2026-11-24 | Retro arcade direction: Pixelify Sans for large headings, Press Start 2P for HUD labels, synthwave hero, chunky pixel shadows; body text stays Inter | Approved | Founder request ("retro gamer feel"). Pixel fonts only at large sizes, with ligatures off; small headings use Space Grotesk so c/o stay distinct. |
| 2026-11-24 | Completion motivation: ranks (New Arrival → 100% Club), checkpoints at 25/50/75/100%, Next up (missable first), Cleared stamps, guides as checklists | Approved | Founder request. Cosmetic only; never tied to rewards. |
| 2026-11-24 | Guide sections from the original brief: roadmap, money, vehicles, weapons, collectibles, story/side missions, secrets, tips, settings | Approved | From reference/Original_Master_Prompt.md §3 |
| 2026-11-24 | Logo paths centralised in src/config.ts (BRAND) | Done | Founder will supply final Nerdy Birdie and COZMC logos |
| 2026-11-24 | Private preview on a new Netlify site `nerdybirdie-gaming-preview` (team DOOR), password-protected, deployed from `phase-1` by upload | Approved | Founder asked for a private Netlify link. Separate from cozmc.us. Password shared with the founder in chat only, not stored in the repo. |
| 2026-11-24 | Achievement/trophy lists left unpublished; tracker ships with honest empty state | Done | All third-party achievement sites block automated access; not circumvented. Next source needs founder input. |
| 2026-11-24 | GTA VI platforms = PS5 + Xbox Series X\|S, released 2026-11-19 | Verified | Rockstar launch post, read 2026-11-24 |
| 2026-11-24 | Discord invite `https://discord.gg/VBeBE7MSSq` | Approved | Supplied by founder; Discord API: server "C0ZMC", never expires. Old `UUyC6aw9W` is expired. |
| 2026-11-24 | Tests use a small Node static server, not `astro preview` | Done | Astro 7's preview runs as one background daemon, so it can't serve both builds at once |
| 2026-11-24 | Phase 0 decisions A–J as recommended | Approved | Astro 7 + TS + Preact; Phase 1 slices 1–7; COZMC logo reuse; header logo option (a); drafts reviewed by founder; tagline on preview only; no analytics; repo private (founder action); domain later |
| 2026-11-23 | Separate repo and site, not inside cozmc | Approved | Founder created `CosmicMorpheus/nerdybirdie-gaming` |
| 2026-11-23 | Name, independent site, Vice City Premium theme, supplied logo, free basics, prominent COZMC links | Approved | From `docs/02_PRODUCT_SPEC.md` |
