# Account-based progress

**Status (24 Nov 2026): built, switched off.** The integration is in the code and tested against an in-memory stand-in for the
database. It turns on when two public settings are present at build time. Until then the site runs guest-only and says
progress is saved on this device only (My Progress, Account page, and the save status after each change).

## What you need to do to switch it on

1. Create a free project at supabase.com (a new vendor account, your decision). In **Authentication → URL configuration**, add
   the site URLs (`https://nerdybirdie-gaming-preview.netlify.app` now, the production domain later) as redirect URLs.
2. In the project's SQL editor, run `supabase/migrations/20261124000000_progress.sql`. It creates the `progress` table and the
   row-level security rules that make each player's progress private.
3. In Netlify → Site configuration → Environment variables, set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` (both
   public by design; see `.env.example`). Redeploy.
4. Update the Privacy page to say an email address and a progress document are stored, and how to delete an account.

Sign-in is by emailed magic link (no password, no Discord, no wallet). Supabase's built-in email sender has low rate limits;
for real traffic, set up custom SMTP in Supabase.

## How it works

- **Storage:** one JSON document per player (`progress.data`) with a `version` number.
- **Privacy:** row-level security (`auth.uid() = user_id`) on every operation. Signed-out visitors have no access. Isolation is enforced by the database, not the browser.
- **Saving:** every change is saved on the device at once, then synced to the account after 0.7 s. The status reads "Saving to your account…",
  then "✓ Saved to your account", or "Couldn't sync yet: saved on this device, retrying". Retries back off 2 s, 5 s, 15 s, 60 s, and run again when the browser comes back online.
- **Two devices at once:** each write checks the version it read. If another device wrote in between, it pulls again, merges and retries.
  The merge is per item, and the newest action wins, so unrelated changes on two devices are both kept, and an untick sticks (`src/lib/progress/merge.ts → syncMerge`).
- **Guest progress:** after signing in on a device that has guest progress, the Account page offers a one-time merge. Account data
  is preserved: guest ticks are added only for items the account has never ticked or unticked (`mergeGuestIntoAccount`).
- **Shared devices:** each account's copy is kept under its own key in the browser, separate from guest progress.
- **Resume:** the last guide section, tracker or map view (filters, zoom, selected pin) is part of the document, so "Continue where you left off" follows the player.

## What has and hasn't been verified

| Check | Status |
|---|---|
| Merge and sync rules: newest action wins, unticks stick, simultaneous devices, guest merge preserves the account | Unit tests (`tests/unit/merge.test.ts`, `sync.test.ts`) against an in-memory server with version checks |
| Guest-only mode and honest labelling | Browser tests |
| Real sign-in, a real second browser resuming, and RLS blocking another user | **Not verified.** Needs the Supabase project above. Once it exists: sign in as user A and tick an item; sign in as A in another browser and confirm the tick; sign in as B and confirm A's tick is absent; with B's session, try reading A's row through the API and confirm it's refused. |
