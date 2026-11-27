# Brand guidelines

Last updated: 27 November 2026 (Gaming Guides repo). Detailed visual tokens for Gaming Guides: `docs/03_DESIGN_SYSTEM.md` and `src/styles/global.css`.

## Three identities, kept apart

| Identity | Role | Where it shows | Look |
|---|---|---|---|
| **Nerdy Birdie LLC** | Parent company | Footer and About attribution, link to nerdy-birdie.com | Supplied Nerdy Birdie logo, used modestly. Never dominates a product |
| **Nerdy Birdie Gaming Guides** | The gaming product | Header, page titles, library, app listing | Nerdy Birdie logo mark + product name; deep-space navy, neon-green accent, holographic wordmark (`--vc-*` tokens) |
| **Each game guide** | One game inside the product | That game's pages | May reflect the game's atmosphere (e.g. GTA VI: Vice City-style card art) while keeping the product's navigation and interaction patterns |
| **COZMC** | Connected community | Community panels, header pill, footer column | Its own deep-space purple and Living Coral (`--cz-*` tokens), COZMC wordmark and mascots. Never recoloured to match the product |

## Logo rules

- Masters live unedited in `assets/brand/supplied-<date>/`. Only web-sized copies are made; never recolour, redesign or distort.
- Small sizes use the founder-approved crop of the bird (no wordmark); the full logo appears where there's room (footer, About).
- All logo paths are in `src/config.ts` → `BRAND`.

## Names

- Product name in the brief and the approved Android app name: **Nerdy Birdie Gaming Guides**.
- The website currently displays **NerdyBirdie LLC Gaming Guides** (founder rename, 25 Nov 2026). Whether to switch the site to the
  shorter product name, with "A NerdyBirdie LLC product" as attribution, is an open founder decision (see `ROADMAP.md`).
- Tagline "Play Smarter. Discover More." is proposed, not final. Motto: "Brick by Brick, WE Build."

## Trademarks

- Game names are used only to say which game a guide covers. No publisher logos, key art or look-alike UI.
- No game trademark in app names, icons, product ids or store screenshots (Google Play IP policy; see `docs/COMMERCIAL_PLATFORM_AUDIT.md`).
- Every page carries the unofficial-guide disclaimer.
