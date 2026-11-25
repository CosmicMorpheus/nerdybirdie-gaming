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
  "mapPinIds": [],
  "objectiveIds": [],
  "status": "published"
}
```

**Sections** (`category`): `tips`, `walkthrough`, `robberies`, `money`, `vehicles`, `weapons`, `collectibles`, `side-missions`, `secrets`,
`settings`, `videos`. They're set in `game.json` → `guideCategories`.

- **A walkthrough mission:** `"category": "walkthrough"` and `"chapter": 1`. Mission outcomes go in `details` with `spoilerLevel` `major`.
- **A weapon or vehicle:** use `facts` for things like type, location or cost, but only facts a source supports.
- **A map location:** put the pin id in `mapPinIds` (e.g. `"gta-vi:map:collectible-card-086"`). That turns on "Show on map".
  Pin ids come from the map snapshot (`content/games/gta-vi/map/pins.json`, field `id`).

## Adding a video (YouTube, Twitch or TikTok)

Add one record to `content/games/gta-vi/videos.json`, then one **moment** per thing it shows:

```json
{
  "id": "creator-short-name-videoid",
  "url": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
  "title": "Spoiler-safe title you write",
  "creator": "Channel name",
  "channelUrl": "https://www.youtube.com/@Channel",
  "spoilerLevel": "none",
  "status": "review",
  "availability": "unknown",
  "checkedAt": null,
  "notes": "Where you found it, what still needs checking",
  "moments": [
    { "target": "gta-vi:map:collectible-card-086", "start": 49, "label": "Silver Pricilla Pace card", "verified": false }
  ]
}
```

- `url` must be one video: a YouTube watch link, a Twitch VOD (`twitch.tv/videos/…`) or clip, or a TikTok post. Channels and live streams are refused.
- `target` is a guide entry id or a map pin id. `start` is seconds into the video (49 = 0:49).
- **Approve it only after watching:** set each moment's `verified` to true, `availability` to `"available"`, `checkedAt` to today and `status` to `"approved"`.
  Until then it shows on the preview with a "Not yet checked" label and stays hidden on the live site.
- Prefer a short, focused clip over a long playthrough. Videos support the written guide; don't treat one as proof on its own.
- Videos that spoil the story get `spoilerLevel` `"minor"` or `"major"`: title and player stay hidden until the viewer chooses to see them.

## Updating the map data

```bash
npm run import:map -- --dry-run
```

```bash
npm run import:map
```

The source and pinned revision are in `content/games/gta-vi/map/source.json`. To update, change `revision` to a newer commit,
run the dry run, read the summary (added / changed / removed / duplicates / invalid), then run it for real. IDs are kept, so
players' progress survives; records removed upstream are kept as `retired`. If anything fails validation, nothing is written.
Chance spawns and pickups (`variableKinds` in source.json) are imported but not pinned until confirmed; see `/review/` on the preview.
- **An achievement or trophy:** these go in `objectives.json` and appear in the tracker, not the guide. See README → "Editing content".

## Check before publishing

```bash
npm run build
```

```bash
npm run verify
```
