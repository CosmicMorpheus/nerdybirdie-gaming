# Ecosystem architecture

Last updated: 27 November 2026 (Gaming Guides repo).

## How the properties connect

```
                 Nerdy Birdie LLC  ── https://nerdy-birdie.com
                 (corporate portfolio, directory of ventures)
                          │  links to each venture
                          ▼
   Nerdy Birdie Gaming Guides ── https://gameguides-nerdy-birdie.live
   (the gaming product: game library → one guide per game)
          │  footer + About: "A NerdyBirdie LLC site" → nerdy-birdie.com
          │
          │  optional community links (header pill, menu, panels, footer)
          ▼
   COZMC community ── https://cozmc.us/  ·  COZMC Discord (invite in src/config.ts)
   (gaming & builder community: questions, discoveries, Arcade, Cozmlings, optional Web3 learning)
```

| Link | Where it appears | Rule |
|---|---|---|
| Gaming Guides → Nerdy Birdie LLC | Footer ("A NerdyBirdie LLC site", "NerdyBirdie LLC home"), About page, phone menu | Professional attribution only. The corporate site is never copied into the product |
| Nerdy Birdie LLC → Gaming Guides | Corporate site's ventures directory | Managed by the corporate site project |
| Gaming Guides → COZMC | Header pill (desktop), phone menu, home panel, inline panels on guides, footer | Always optional; two separate links (Discord and cozmc.us); COZMC keeps its own branding (as on cozmc.us) |
| COZMC → Gaming Guides | Not tracked in this repo | — |

## Separation of concerns (Gaming Guides)

| Layer | Where | Notes |
|---|---|---|
| Presentation | `src/pages`, `src/components`, `src/islands` (Astro + Preact) | Static pages; interactive islands only where needed |
| Game content | `content/games/<game-id>/` (JSON, Zod-validated at build) | One folder per game. Adding a game doesn't touch page code |
| User progress | Browser storage (`nbg:progress`, versioned) with backup file and transfer link | Account sync built on Supabase, switched off (`docs/ACCOUNTS.md`) |
| Authentication | Supabase Auth (magic link) — built, switched off | No wallet, no Discord login |
| Purchase entitlements | `src/lib/entitlements/` (store-agnostic core), `supabase/migrations/…_entitlements.sql` | Built and unit tested, switched off. Server-side checks only |
| Server functions | `netlify/functions/` | Daily creator feed (built, needs keys); ASK server, guide-update queue, source checks (off) |

Each layer can change without the others: the same content and progress model can back the website and a future Android app.

## Hosting

- Gaming Guides: Netlify project `nerdybirdiegameguides`, custom domain gameguides-nerdy-birdie.live. Separate from cozmc.us and its repo.
- No changes to the live COZMC site or repo from this project.
