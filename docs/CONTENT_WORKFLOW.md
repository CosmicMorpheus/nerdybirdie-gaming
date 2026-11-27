# Community-driven content workflow

27 November 2026. Covers §8–9 of the founder's ecosystem brief. Mechanics for editors: `docs/CONTENT_GUIDE.md`.

## Content statuses

The brief asks for five lifecycle statuses. Today the site has two separate fields that already cover the editorial half; the community half
needs accounts and moderation first.

| Brief status | Meaning | Today's equivalent | Public? |
|---|---|---|---|
| **Newly discovered** | Someone reported it (player, ASK question, creator video) | Item in the creator feed, ASK Guide Updates queue or `/review/` queue; or entry `status: draft` | No (feed items are shown labelled as unreviewed sources, never as guide facts) |
| **Needs community review** | Waiting for other players to confirm | Not built (needs accounts) | No |
| **Community verified** | Independent players confirmed it | Not built. Closest: entry `verification: unconfirmed` with sources | Shown labelled "Unconfirmed" |
| **Editorially verified** | An editor checked sources (and ideally gameplay) | Entry `status: published` + `verification: confirmed`; objective `independently_verified` / `official_confirmed` | Yes |
| **Outdated or disputed** | Patched, contradicted or under correction | Entry `verification: rumor` (disputed); objective `outdated_or_patched`; `publicationStatus: retired` | Labelled, or hidden when retired |

**Proposed next step (needs approval, after accounts exist):** add a `reviewStatus` field with exactly the five brief statuses, keep
`verification` for "how sure", and migrate: `draft` → newly discovered, `unconfirmed` → needs community review, `confirmed` → editorially verified,
`rumor` → outdated or disputed. Ids never change, so player ticks survive.

## Rules that already hold

- Unverified discoveries never become authoritative automatically. ASK and the creator feed only add items to private queues.
- Every entry lists its sources and the date each was checked; corrections keep ids and add a revision note in Updates.
- Our own words only. No copied guides, proprietary maps, images or videos; creator videos are click-to-load embeds with credit.
- "Report a problem" on every entry builds a report for the COZMC Discord (nothing is sent from the page).

## What community review needs (not built)

| Need | Why |
|---|---|
| Accounts (Supabase, built and off) | Attribute submissions, rate-limit, ban abusers |
| Submission form + moderation queue with roles | Founder shouldn't review every daily submission; trusted reviewers can |
| Confirmation threshold (e.g. N independent confirmations, or one trusted reviewer + source) | Moves "needs review" → "community verified" without the founder |
| Revision history per entry | Who changed what, rollback |
| Abuse controls | Rate limits, reporting, reputation, profanity/link filtering, no raw HTML |
| Privacy page update | Submissions store account data |

Editorial verification (founder or appointed editors) stays the only route to "Editorially verified".
