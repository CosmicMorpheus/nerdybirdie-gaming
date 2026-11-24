# Adding guide content

All guide entries live in **`content/games/gta-vi/entries.json`**, one object per entry. The site rebuilds from it; no layout
changes are needed. `npm run build` refuses bad data (missing source, unknown section, spoiler text in the wrong field, and so on)
and tells you what's wrong.

## Rules

1. **Write it yourself.** Use sources for facts, not wording. Don't copy sentences or lists from IGN or anyone else.
2. **Cite it.** Every entry needs at least one source with `publisher`, `title`, `url` and `checkedAt` (the day you opened the page).
3. **Be honest about certainty.** `verification`: `confirmed` (checked against a reliable source), `unconfirmed` (reported, not
   checked), or `rumor` (leaks or speculation). The build refuses a rumor whose text calls itself confirmed.
4. **Keep spoilers out of the open fields.** `title`, `summary`, `steps` and `facts` must be spoiler-free. Story details go in
   `details`, with `spoilerLevel` set to `minor` (shown as "Mild") or `major`. Players see them only after pressing Reveal.
5. **Never rename an `id`.** It's what saves a player's tick. Fix the text, not the id.
6. Use `"status": "draft"` to keep an entry off the site while you work on it.

## Template

```json
{
  "id": "gta-vi:entry:my-new-tip",
  "gameId": "gta-vi",
  "slug": "my-new-tip",
  "category": "tips",
  "title": "Short, spoiler-free title",
  "summary": "One or two sentences in your own words.",
  "steps": ["First do this.", "Then this."],
  "facts": [{ "label": "Available from", "value": "Chapter 2" }],
  "chapter": null,
  "mode": "story",
  "spoilerLevel": "none",
  "details": null,
  "verification": "confirmed",
  "sources": [
    { "publisher": "IGN", "title": "Page title", "url": "https://www.ign.com/...", "checkedAt": "2026-11-25", "supports": "Which part this backs up" }
  ],
  "platformNote": null,
  "gameVersion": null,
  "videoIds": [],
  "objectiveIds": [],
  "status": "published"
}
```

**Sections** (`category`): `tips`, `walkthrough`, `money`, `vehicles`, `weapons`, `collectibles`, `side-missions`, `secrets`,
`settings`, `videos`. They're set in `game.json` → `guideCategories`.

- **A walkthrough mission:** `"category": "walkthrough"` and `"chapter": 1`. Mission outcomes go in `details` with `spoilerLevel` `major`.
- **A weapon or vehicle:** use `facts` for things like type, location or cost, but only facts a source supports.
- **A video:** add it to `videos.json` (11-character YouTube id, creator, channel link, `checkedAt`), then list its id in the entry's `videoIds`.
  Videos never load until the viewer presses play.
- **An achievement or trophy:** these go in `objectives.json` and appear in the tracker, not the guide. See README → "Editing content".

## Check before publishing

```bash
npm run build
```

```bash
npm run verify
```
