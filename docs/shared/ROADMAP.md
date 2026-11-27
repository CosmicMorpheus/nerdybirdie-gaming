# Roadmap

Last updated: 27 November 2026 (Gaming Guides repo). Order reflects the priorities: gaming first, community second, monetization third.

## Now — done in this cycle (27 Nov 2026)

- Product landing page with **Explore Game Guides**, featured guides, recently updated, progress; GTA VI tools moved to its own game page.
- Game configuration extended: `featured`, `access`, `platformNote`, per-game `updates.json`; shell (header, footer, ASK, Updates) no longer hard-codes GTA VI.
- Shared source-of-truth docs; monetization/billing, mobile readiness and content workflow documented.
- Decided: keep Option A (free guides + optional Android Pro); site renamed to **Nerdy Birdie Gaming Guides**; header logo keeps linking to the games list.

## Next — gaming first

1. Founder playtest of the new landing page on a phone; gather feedback.
2. More first-hand verification of GTA VI entries (founder/testers, own screenshots), reducing reliance on one outside source.
3. Lighthouse / performance pass on mobile (never measured yet).
4. Content template and checklist for a second game (no second game chosen yet — founder decision).

## Then — community

5. Community submissions: needs accounts (Supabase staging), moderation tools, revision history and the five content statuses in `docs/CONTENT_WORKFLOW.md`.
6. ASK "COZMC" server features on staging (missing-info queue, sourced research) with admin auth and a privacy update.
7. Optional COZMC Arcade / Cozmlings / Web3-learning links once their verified URLs are supplied.

## Later — monetization and apps

8. Legal check of the app name, terms and refund wording (monetization model settled: Option A, 27 Nov 2026).
9. Separate staging Netlify project; Supabase staging; Terms, refund and account-deletion pages (lawyer-reviewed).
10. Android app (Capacitor wrapper, Play Billing or permitted alternative), Google internal/closed testing. iOS later.

## Open founder decisions

| # | Decision | Recommendation |
|---|---|---|
| 1 | Supabase account, contact email, Play Console account, legal review | Needed before any account or payment work |
| 2 | Verified URLs for COZMC Arcade and Cozmlings | Needed before linking them |
| 3 | Second game for the library | Pick one with strong demand and an achievable verification plan |
