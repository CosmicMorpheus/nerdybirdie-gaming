# ASK "COZMC": handoff

A free game-guide assistant on every page (button bottom-right). No account, wallet, Discord or purchase needed.
It opens with "What are you trying to find in GTA?" and answers in a few lines with a direct action: **Show on map**,
**Open checklist** or **Watch walkthrough**, offered only when a real destination exists.

## How it answers

1. **Our guide first.** It searches the published guide: entries, map pins, achievements and approved videos, plus any
   change you've approved since the last build (`src/lib/ask/retrieve.ts`, index at `/data/gta-vi/ask-index.json`).
2. **Outside sources only for what's missing.** If our guide answers only part of the question, the missing detail goes to
   Claude with web search, limited to trusted domains (`content/ask/config.json`) (`src/lib/ask/anthropic.ts`).
   - Every source shown must be a URL the search actually returned. Anything else is dropped, and a claim left without a source is marked "Not confirmed".
   - Answers say clearly what **our guide** confirms, what **outside sources report** (with creator credit), and what's **still uncertain**.
   - Disagreements are spelled out, naming who says what.
3. **Spoilers follow the player's setting.** Story details from our guide or outside sources are hidden behind
   "This has a story detail. Reveal it?". Link titles are spoiler-free titles we write; no thumbnails are loaded.
4. **No answer?** It says so plainly and offers the COZMC Discord as an optional next step. Set `COZMC.gtaHelpChannel` in
   `src/config.ts`, or `GTA_HELP_CHANNEL_URL` on the server, once the GTA help channel exists. Until then it uses the server invite.
5. **Server down or live search off?** It still answers from our guide. If the server can't be reached at all, it says
   the question wasn't saved.

## Guide Updates queue (private)

Whenever ASK needs outside information or can't find a reliable answer, it adds an item to the queue. Review it at **`/admin/guide-updates/`**
(editor token required). Each item shows:

- what players asked, every phrasing, and how many times;
- what our guide is missing, linked to the affected entry or map pin;
- the proposed change, with sources, check date, and platform/patch/spoiler details;
- what still needs verification (for example disagreeing sources, a single source, or no reliable answer).

**Grouping:** questions about the same gap share an item. "Where does this car spawn?" and "Where can I find this car?" go
together; "Can I keep this car after the mission?" is separate (`src/lib/ask/intent.ts`).
**Priority:** most-asked first. Popularity only changes the order; it never marks anything as verified.

**Your controls:** see the current entry beside the proposed one, inspect the evidence, edit the draft (JSON), then
**Approve & publish**, **Needs more verification** or **Dismiss**.
- **Approving** validates the draft against the same rules as the guide. The new entry immediately shows on the guide pages and is
  what ASK answers from. To make it permanent in the code, run `npm run pull:approved -- --write`, rebuild and commit.
- **Undo:** "Change history" lists every published change, and **Undo** restores the previous version and reopens the item.
- **Progress is safe:** corrections keep the entry id, so players' saved ticks stay attached.

## Scheduled source checks

`netlify/functions/source-check.mts` runs daily at 06:17 UTC (edit `schedule` in that file) when `SOURCE_CHECKS=on`.
- It checks the sources in `content/ask/config.json` → `sourceChecks` (Rockstar Newswire, Rockstar Support patch notes, the Open GTA 6 Map data).
- When a page changes, it drafts the specific addition or correction into the same queue. Repeated coverage of one discovery updates the existing item.
- Nothing is published automatically.

## Cost controls (`content/ask/config.json` → `limits`)

| Setting | Default | What it does |
|---|---|---|
| `questionsPerVisitorPerDay` | 40 | Live searches per visitor per day (visitors are counted by a daily salted hash, never by stored IPs) |
| `webSearchesPerDay` | 300 | Site-wide daily budget of web searches |
| `maxWebSearchesPerQuestion` | 3 | Cap per question (`max_uses` on the web search tool) |
| `answerCacheHours` | 72 | A recent outside answer is reused for the same question group instead of searching again |

Over a limit, ASK still answers from our guide and still records the question. Questions our guide answers fully never call the AI.
The model is `claude-opus-5-5` at low effort, with automatic fallback if a request is declined. Change it with `ASK_COZMC_MODEL`.

## What's been verified

`npm run demo:ask` runs the full rare-car flow on **clearly labelled test data** and writes `docs/ASK_COZMC_DEMO.md`:

1. Our guide already has the answer: answered directly, no outside search, nothing queued.
2. Two outside sources disagree: both credited, the disagreement explained, the spoiler hidden, an item queued with "Sources disagree".
3. Three players ask about the same missing detail: one item, count 3, the outside answer reused (one search, not three).
4. **You approve one correction, and the next player gets the corrected answer straight from our guide** (no outside search).
5. Undo restores the previous entry and reopens the item.

Plus grouping, no-live-search and usage-limit tests (`tests/demo/ask-demo.test.ts`), and browser tests (`tests/e2e/ask.spec.ts`):
the exact name `ASK "COZMC"`, the greeting, the real server-down fallback with a working **Show on map**, disagreement and
spoiler display (mocked server, test data), the review page's approve and undo, and the button staying clear of the phone map controls.

**Not verified:** real Claude web-search calls, Netlify Blobs and the deployed functions. This environment has no API key and
can't run Netlify's runtime. The functions do bundle with esbuild, and the engine they call is fully tested with an in-memory store.

## To go live

1. **Netlify environment variables:**
   - `ANTHROPIC_API_KEY`: turns on live search.
   - `GUIDE_ADMIN_TOKEN`: a long random string, at least 24 characters.
   - `ASK_SALT`: a random string.
   - Optional: `GTA_HELP_CHANNEL_URL`, `ASK_COZMC_MODEL`, and `SOURCE_CHECKS=on`.
2. **Netlify Blobs** is built in; nothing to set up. Functions deploy with the site (`netlify.toml` → `[functions]`).
3. Deploy, open `/admin/guide-updates/`, sign in with the token, and ask ASK a question to see the flow end to end.

## What could publish automatically later (not switched on)

| Update type | Evidence to require before auto-publishing |
|---|---|
| Official patch-note facts (fixes, added content) | The source is a Rockstar domain; the change matches an existing entry's id; no disagreement; one-click undo kept |
| New fixed collectible pins | Two independent sources agree within a small distance, **or** an editor's gameplay screenshot; the category is a fixed pickup, not a chance spawn |
| Video moments for existing entries | The video is available, the creator is credited, an editor has confirmed the timestamp once for that creator/series |
| Typos or wording in our own entries | No change to facts, locations, unlock conditions or spoiler level |

Never auto-publish: anything with a disagreement, a single source, a missable item, an exact spawn, an unlock condition,
or a story spoiler. Popularity is never evidence.
