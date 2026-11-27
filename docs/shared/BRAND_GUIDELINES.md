# Brand guidelines

Last updated: 27 November 2026 (Gaming Guides repo). Detailed visual tokens for Gaming Guides: `docs/03_DESIGN_SYSTEM.md` and `src/styles/global.css`.

## Three identities, kept apart

| Identity | Role | Where it shows | Look |
|---|---|---|---|
| **Nerdy Birdie LLC** | Parent company | Footer and About attribution, link to nerdy-birdie.com | Supplied Nerdy Birdie logo, used modestly. Never dominates a product |
| **Nerdy Birdie Gaming Guides** | The gaming product | Header, page titles, library, app listing | Nerdy Birdie logo mark + product name; deep-space navy, neon-green accent, holographic wordmark (`--vc-*` tokens) |
| **Each game guide** | One game inside the product | That game's pages | May reflect the game's atmosphere (e.g. GTA VI: Vice City-style card art) while keeping the product's navigation and interaction patterns |
| **COZMC** | Connected community | Community panels, header Discord button, phone menu block, in-guide strip, footer column, ASK "COZMC" | COZMC v3 "arcade after dark", matching cozmc.us: black panels with a phosphor-green corner bracket, phosphor green `#8dff6a`, Discord blurple `#5865f2` for Discord, COZMC cyan arrows, square buttons with hard shadows, Silkscreen labels and Saira condensed headings (`--cz-*` tokens, values copied from cozmc.us's stylesheet on 27 Nov 2026). COZMC wordmark and mascots. Never recoloured to match the product |

## Logo rules

- Masters live unedited in `assets/brand/supplied-<date>/`. Only web-sized copies are made; never recolour, redesign or distort.
- Small sizes use the founder-approved crop of the bird (no wordmark); the full logo appears where there's room (footer, About).
- All logo paths are in `src/config.ts` → `BRAND`.

## Names

- Product name, on the website and the Android app: **Nerdy Birdie Gaming Guides** (founder, 27 Nov 2026; replaces
  "NerdyBirdie LLC Gaming Guides" from 25 Nov). The company appears as attribution only: "A NerdyBirdie LLC site" in the footer, About page.
- Short name (phone home screen): "Nerdy Birdie Guides".
- Tagline "Play Smarter. Discover More." is proposed, not final. Motto: "Brick by Brick, WE Build."

## Trademarks

- Game names are used only to say which game a guide covers. No publisher logos, key art or look-alike UI.
- No game trademark in app names, icons, product ids or store screenshots (Google Play IP policy; see `docs/COMMERCIAL_PLATFORM_AUDIT.md`).
- Every page carries the unofficial-guide disclaimer.
