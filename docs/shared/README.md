# Shared source of truth (Nerdy Birdie LLC)

These seven files are maintained by **every** Nerdy Birdie project (this Gaming Guides repo and the Nerdy Birdie LLC website project).
Keep the same file names and section headings in each repo so changes can be copied across without merging by hand.

| Document | Responsibility | Owner of changes |
|---|---|---|
| [COMPANY_VISION.md](COMPANY_VISION.md) | Overall Nerdy Birdie mission and business direction | Founder |
| [ECOSYSTEM_ARCHITECTURE.md](ECOSYSTEM_ARCHITECTURE.md) | How products and websites connect | Founder; Claude proposes |
| [BRAND_GUIDELINES.md](BRAND_GUIDELINES.md) | Company and individual product branding | Founder |
| [PRODUCT_REGISTRY.md](PRODUCT_REGISTRY.md) | Products, URLs and development statuses | Any project, when a fact changes |
| [DECISION_LOG.md](DECISION_LOG.md) | Approved company-level decisions and the reasons behind them | Founder approves; Claude records |
| [PRODUCT_SPEC.md](PRODUCT_SPEC.md) | Requirements specific to each individual product (this repo: Gaming Guides) | Founder; Claude proposes |
| [ROADMAP.md](ROADMAP.md) | Development priorities and future plans | Founder; Claude proposes |

## Rules

1. **Company-wide facts live here, product detail lives in the product repo.** This repo's detailed, day-to-day log stays in
   `docs/DECISIONS.md`; only decisions that affect more than one product (or the company) go in `DECISION_LOG.md`.
2. **Nothing is "approved" unless the founder said so.** Proposals are marked *Proposed*.
3. **Never invent URLs, statuses or dates.** If a fact belongs to the other project and isn't known here, write *Not tracked in this repo*.
4. **Sync:** when one project changes a shared file, it notes the date at the top of the file. The other project copies the newer
   version and resolves conflicts by asking the founder.

`PRODUCT_SPEC.md` is the one file that differs per repo: each project keeps the spec for its own product.

Last updated: 27 November 2026 (Gaming Guides repo).
