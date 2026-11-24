# Chief-of-staff review (cycle 02): what changed

Branch `cycle-02`, checkpoint tag `checkpoint-before-cycle-02`. Founder decisions this cycle: **ASK = option A**
(browser-only, no AI cost), **arrows keep flashing**.

| Review finding | Status | Where |
|---|---|---|
| Hero doesn't say free/unofficial; tracker CTA leads while it's empty | **Done.** "Free, unofficial GTA VI companion · No account required"; guides and map lead until a list is verified | `src/pages/index.astro` |
| HUD could show 100% from six guide ticks | **Done.** It's labelled "Your checklist on this site", shows "N of M checked off" with a note that it isn't the game's 100%; top rank renamed "List Cleared"; map counted separately | `Hud.tsx`, `ranks.ts` |
| Empty categories crowd navigation | **Done.** Achievements hidden from the menu while empty; empty guide sections collapsed into one "Coming soon" line (home and guides) | `Header.astro`, `GuideBoard.tsx` |
| GTA+ (paid) facts read like tips | **Done.** "Paid / optional" tag on GTA+ and edition entries | `entries.json`, `EntryBrowser.tsx` |
| Label meanings unclear; "Unconfirmed ≠ false" | **Done.** Legend on the guides pages | guides pages |
| About says unverifiable things aren't published (conflicts with the map) | **Done.** Rewritten; map data and credits section added | `about.astro` |
| Map counts (3,917 / 2,529 / withheld) unexplained | **Done.** "Why do the numbers differ?" on the map | `MapView.tsx` |
| ASK server could store questions; privacy page silent | **Done.** ASK is browser-only by default (no POST, no queue, no AI); server functions return 404 unless `ASK_SERVER_ENABLED=on`; privacy page rewritten | `AskCozmc.tsx`, `netlify/functions/*`, `privacy.astro` |
| ASK button covers the selected-pin card on phones | **Done.** Hidden while a pin card or the map sheet is open on phones | `ask.css` |
| ASK could be mistaken for token support or a Rockstar bot | **Done.** Subtitle "GTA VI guide helper"; footer note "Unofficial fan guide"; exact name kept | `AskCozmc.tsx` |
| Spoiler-gated ASK answers showed map/checklist buttons (location leak) | **Done.** Buttons appear only after reveal | `AskCozmc.tsx` |
| ASK treats broad matches as answered | **Done.** Tests that unrelated questions get no answer and different questions get "partial" | `tests/unit/spoilers-search.test.ts` |
| My Progress very long on phones | **Done.** Backup and restore fold away on phones | `ProgressManager.tsx` |
| Continuous flashing arrows | **Kept by founder decision.** Static when the viewer prefers reduced motion | `CommunityLinks.astro` |
| **Founder request:** continue in another browser without an account | **Done.** My progress → "Continue in another browser": copy/share a transfer link (progress compressed into the `#` part, never sent to a server) or paste a code. It previews, then Combine (newest wins, nothing lost) or Replace. Tested across two separate browsers | `ProgressManager.tsx`, `src/lib/progress/transfer.ts`, `tests/e2e/transfer.spec.ts` |
| Release checklist; source register | **Done** | `docs/RELEASE_CHECKLIST.md`, `docs/SOURCE_REGISTER.md` |
| Thin content: 0 achievements, 6 reference entries | **Blocked.** Research sites are blocked here; needs the founder's in-game list or the sites allowed | — |
| Video checks | **Blocked.** Same reason; videos stay in review and are hidden on the public build | — |
| Map geometry rights (beyond the project's CC BY claim) | **Open.** Recommend legal review before monetization | `docs/RELEASE_CHECKLIST.md` |
| ASK server hardening (atomic budget, claim-linked answers, approval attestation, CAS on approve/undo) | **Deferred** because the server is off under option A. Required before it's ever turned on | `docs/ASK_COZMC.md` |
| Accounts, paid ASK, Content Studio | **Deferred** per the review | — |
| Domain, tagline, contact email | **Founder decisions** | `docs/RELEASE_CHECKLIST.md` |
