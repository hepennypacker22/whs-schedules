# WHS Schedules

Sidearm-style (UVM Athletics look) schedule pages for Windsor High School teams,
fed live by the AD's Google Sheets season grids and embedded on
[whs.wsesu.net](https://whs.wsesu.net) (SchoolBlocks) via iframes.

**Live site:** https://hepennypacker22.github.io/whs-schedules/
(the landing page lists every team and gives copy-paste embed code)

## How it works

- **Schedule** — every page load fetches the season grid's CSV straight from
  Google (`.../gviz/tq?tqx=out:csv`). An edit the AD makes in the grid is
  visible to visitors within seconds-to-minutes (Google's edge cache). Nothing
  to rebuild, nothing to run. The sheet must be shared **"Anyone with the link:
  Viewer"** — the site only ever reads it.
- **Scores** — a GitHub Action ([.github/workflows/scores.yml](.github/workflows/scores.yml))
  runs every 3 hours, reads each varsity team's MaxPreps schedule page, and
  commits `data/scores.json`. The page merges results by game date, so as the
  AD posts scores to MaxPreps (as they already do), W/L results and the record
  strip appear here automatically. If MaxPreps ever changes their page layout,
  the Action fails visibly and scores go stale — the schedule itself keeps working.
- Teams MaxPreps doesn't carry (JV/JH, golf, XC): a result typed into the grid
  cell works as a manual fallback, e.g. `Woodstock 4:30 W 21-14`.

## Rules for the grid (for the AD)

The page reads **cell text only** — strikethrough and cell colors do NOT come
through. To postpone/cancel a game, type it into the cell:

| In the cell | Shows on the page |
|---|---|
| `Woodstock 4:30PM` | home game vs Woodstock, 4:30PM |
| `@ Woodstock 4:30PM` | away game |
| `PPD - Woodstock 4:30PM` | red **POSTPONED** badge |
| `Cancelled - Woodstock 4:30PM` | red **CANCELLED** badge, opponent struck through |
| `Woodstock 4:30 W 21-14` | result (only needed where MaxPreps has no score) |
| `Sr. Night Woodstock 7:00PM` | game with a "Sr. Night" tag |
| anything else (`1st Practice`, `OPEN`, …) | an italic note row — never an error |

Recognized status words: `PPD`, `Postponed`, `Cancelled`, `Canceled`, `Delayed`, `Rescheduled`.

## Embedding in SchoolBlocks

On the team's page, add an **HTML Block** and paste that team's iframe snippet
from the [landing page](https://hepennypacker22.github.io/whs-schedules/), e.g.:

```html
<iframe src="https://hepennypacker22.github.io/whs-schedules/?team=vfb"
        style="width:100%;height:900px;border:none;"
        title="Windsor Football Schedule" loading="lazy"></iframe>
```

Team slugs — fall: `gvsoc, fh, jhfh, vfb, jvfb, jhfb, golf, xc` ·
winter: `gvbb, gjvbb, bvbb, bjvbb, bres, jhbbb, jhgbb, bowl, intrk`

## Adding a new season

1. AD creates the new grid spreadsheet (same format: Day | Date | one column per team).
2. Share it "Anyone with the link: Viewer".
3. Add a season entry in [config.js](config.js) (sheet ID, `startYear`, team
   columns, MaxPreps season paths — bump e.g. `26-27` → `27-28`).
4. Commit. Existing embeds keep working; slugs stay stable season to season.

## Development

No build step. Any static server:

```bash
npx serve .
```

- `node scripts/test-parser.mjs` — parser check against the live grids
  (every non-empty cell must become a game or a note).
- `node scripts/fetch-scores.mjs` — score sync (what the Action runs).
