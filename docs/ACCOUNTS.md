# Account-based progress: what's needed

**Status (24 Nov 2026): not available.** The project has no login, user accounts or database, so progress is saved in each
visitor's browser only. The site says so on My Progress and in the "Saved on this device" status shown after each change.
Nothing claims progress is saved to an account.

The cozmc.us site's only sign-in is an Algorand wallet. Guide progress must not depend on wallets, Discord, tokens or purchases,
so that can't be reused. There's no existing login to build on.

## What account saving needs

1. **A sign-in provider.** It needs to verify who a user is, for example email magic links or Google/Apple/Discord sign-in, with Discord optional and never required.
2. **A database table** holding one progress document per user:
   `progress(user_id uuid primary key, data jsonb, schema_version int, updated_at timestamptz)`.
3. **Access rules enforced by the server**, so one user can never read or change another's row (for example Postgres row-level
   security: `using (auth.uid() = user_id) with check (auth.uid() = user_id)`). This is what makes progress private.
   Hiding things in the browser is not enough.
4. **A privacy page update** saying what's stored (an email address, plus the progress document) and how to delete the account.

A hosted service such as Supabase provides 1–3 together, with a free tier, and works with a static Netlify site. Firebase or Clerk
plus a database are alternatives. Choosing one is a founder decision: it involves a new vendor account, possible costs and storing personal data.

## What's already built for it

- Progress is one versioned JSON document (`src/lib/progress/model.ts`), so it can go into a database as one row.
- `src/lib/progress/merge.ts` holds the tested guest-to-account merge rule. It never unticks anything, keeps the earliest
  completion time, combines saved items, and lets the account's notes and settings win on conflicts.
- Save feedback ("Saved on this device" / "Couldn't save") is in place and would gain "Synced to your account".

## Acceptance criteria once accounts exist

- A signed-in user checks an item, signs out, signs back in on another device, and the item is still checked.
- One user cannot see or change another user's progress (tested against the server rules, not just the UI).
- Guest progress on a device is offered as a merge after sign-in, using the rule above. Nothing is overwritten silently.
