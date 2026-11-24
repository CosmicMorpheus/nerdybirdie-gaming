# Implementation roadmap and QA

## Phase 0 — inspection and approval
Read all project instructions. Determine repository status; do not reset or overwrite. Propose a new independent repo with a static-first stack (Astro + TypeScript is one candidate for SEO pages and client islands, or modular HTML/CSS/JS if simpler). Explain tradeoffs, check current documentation, pin appropriate dependencies/lockfile, use only approved tools. Propose sitemap and visual wireframes, content schemas and folder structure. Confirm domain/hosting, Discord URL and COZMC assets, and first milestone. Do not code before the plan approval. Suggested layout, adaptable to chosen stack: `src/components/`, `src/layouts/`, `src/pages/`, `src/games/`, `src/lib/`, `src/styles/`, `content/{games,guides,objectives,sources,media}/`, `public/media/`, `tests/`, `docs/`. Keep source notes/fixtures private and exclude originals where appropriate. Preserve root CLAUDE.md.

## Phase 1 — vertical slice
Build global shell, navigation, responsive logo, game overview, platform selector and separate COZMC community component. Use source-controlled structured content, validation and draft exclusion. Implement one end-to-end tracker slice with verified objectives if available, otherwise empty states and test-only fixtures. Local progress store, stable IDs, category counts, default spoiler-safe display/search, filters, accessible interactions. Add persistence, export/import and reset. Render at mobile and desktop; run tests and iterate. Record screenshots and findings if tooling permits. No backend/account/wallet. Founder reviews before expanding.

## Phase 2 — MVP launch candidate
Expand verified achievement and trophy content, money guides, vehicles/weapons, collectibles/settings where verified, source display, click-to-load YouTube, responsive replaceable media. Implement safe metadata, sitemap/canonicals, accessible search, privacy/about/corrections/updates and release checks. Unavailable sections clearly marked or omitted. Use original authorized visual assets. Test actual links and confirm permissions. Founder gameplay feedback becomes next iteration. Deployment is an explicit separate approval; no production modifications.

## Phase 3 — authority and content operations
Broader verified guides and completion roadmap, licensed map, moderation and correction process, founder content editor when approved. Map coordinates separate from rendering; avoid copying proprietary maps. Evaluate analytics with consent/privacy. Phase 4: memberships/cloud profiles/creator partnerships after customer validation, separate threat model, authorization and payments review. Phase 5: more games and optional Algorand/COZMC utility under a separate approval with TestNet, threat and abuse model. No token rewards for self-reported checkmarks.

## Acceptance criteria and reproducible tests
| Area | Required evidence |
|---|---|
| Clean build | Install from lockfile; run project lint, typecheck (if applicable), unit tests, integration/E2E, production build. List exact commands and pass/fail; no claimed results without execution. |
| Responsive visual | Review actual renders at 390/768/1024/1440px, 320px reflow and 200% zoom. No clipping, broken nav or layout shift. Verify crisp logo, imagery, spacing, hierarchy, COZMC separation, mobile tap targets. |
| Accessible UI | Keyboard-only traversal, focus visible, labeled controls, screen-reader names, reduced motion, contrast and WCAG 2.2 AA target. Automated scan plus manual checks; no blanket compliance claim. |
| Content integrity | Validate schemas, IDs unique, references resolve, supported platforms and source links verified, approvals/rights recorded, draft/unverified fixtures excluded. Wrong game/platform never shown. |
| Tracker | Check/uncheck updates denominator and percentages; 0 objectives empty; refresh retains state; game/platform separation; bookmarks/notes persist; filter matches; reset cancels/confirm; invalid import rejected without data loss; migrations preserve IDs. Simulate storage unavailable/quota errors; user gets recoverable message. |
| Spoilers | Default safe on first visit; safe search/autocomplete, thumbnails, alt text, labels, route/metadata, filtered lists; deliberate reveal; switching mode hides again; reload and deep links; protected media not fetched prematurely where feasible. No warning leaks. |
| Videos and images | No autoplay or unapproved embed; valid watch fallback; creator credit; responsive optimized assets, correct attribution/alt, safe placeholder for missing images. |
| External links | Exact https://cozmc.us/ and verified Discord invitation; no fake links, future parent hidden if unset; keyboard accessible; external tabs safe. |
| Security/privacy | No secrets or wallet keys in public bundle, no live transactions, no unnecessary data collection, safe import and external input handling, no insecure admin, review dependency issues. |
| SEO/performance | Unique safe titles, descriptions, canonical paths, semantic markup, sitemap only approved public pages; staging noindex; inspect performance on mobile, target Lighthouse 90+ where realistic, record conditions and scores rather than inventing them. |
| Release | Separate staging, clean reviewable diff, no unrelated changes, README/setup documented, open issues identified, founder approval required before deployment. |

## Claude's execution loop after approval
Plan smallest useful slice → inspect actual files → implement → validate data and test → inspect rendered UI if tools available → fix and retest → review diff for unintended changes → document. Use available subagents for independent research, QA or design critique only when helpful; primary agent owns reconciliation. Prefer deterministic tests for progress and spoilers and browser E2E for key flows. If a tool is unavailable, state what could not be tested and provide steps. Ask for decisions only when blocked or crossing an approval boundary. Don't stop at a plan once implementation is approved, and don't silently advance phases.

## Required maintained deliverables
Product requirements and decisions, source register, sitemap, design tokens/component rules, architecture and data schemas, functional app, progress and spoiler engines, verified starter content, QA results/screenshots where possible, setup/deployment README, changelog, future roadmap, known limitations. At each milestone provide a short handoff: completed changes, paths, commands/results, screenshots or limitations, open risks, remaining work, founder approvals needed. Keep separate from original COZMC infrastructure.
