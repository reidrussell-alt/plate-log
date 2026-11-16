# Design reference

Designs pulled from other apps that we want to bring into Plate Log. This folder is a reference library only — nothing here is loaded by the app.

## What's in here

| Path | What it holds |
|------|---------------|
| `captures/` | Raw screenshots and screen recordings from the source app(s) |
| `mockups/` | Our own standalone HTML mock-ups of patterns, rebuilt in Plate Log's style (committed) |
| `patterns.md` | The extract: each design idea, where it would go in Plate Log, and how it maps to our Daylight theme |

## Adding a capture

1. Drop the screenshot in `captures/`.
2. Name it `<source-app>_<screen>_<what-it-shows>.png`, all lowercase with hyphens inside each part — for example `strong_workout_rest-timer-sheet.png`.
3. Add a row to `patterns.md` that links to it.

## Turning a pattern into a change

When a pattern is picked up for real:

- Rebuild it in Plate Log's own style — use the Daylight tokens in `css/main.css` (`--accent`, `--surface`, `--border`, the font tokens). Don't copy another app's colours, icons, logos or wording.
- Follow the house rules in `CLAUDE.md`: sentence-case labels, flat cards with a hairline border, no emoji or tinted pills.
- Set the pattern's status in `patterns.md` to **Planned**, then **Shipped** with the date once it's live, and add the change to `ARCHITECTURE.md` as usual.

## Note on privacy

This repository is published by GitHub Pages, so anything committed here is publicly reachable at `…/plate-log/design-reference/`. For that reason `captures/` is in `.gitignore`: screenshots stay on this Mac and only the README and `patterns.md` go into git. Describe each pattern well enough in `patterns.md` that it still makes sense without the image.
