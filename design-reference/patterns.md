# Pattern catalog

One row per design idea taken from another app. Keep the newest at the top of each section.

**Status:** Idea → Planned → Shipped (date) · or Dropped (with a reason)

**Palette (16 Nov):** "Warm Daylight" — white page, warm off-white cards, one burnt-orange accent (`#bd552f`) for primary actions, workout progress and the logo only. No large colour fades. New patterns should be mapped to this palette; see the Theme section of `CLAUDE.md`.

## Sources

| Source app | Platform | Captured on | Notes |
|------------|----------|-------------|-------|
| Ladder (via Mobbin) | iOS | 2026-11-16 | Fitness app profile. Only the cover photo + centred profile photo layout is wanted. |
| Copilot (via Mobbin) | iOS | 2026-11-16 | Money app. Only the background colour is of interest — the screen's content is ignored. |
| How We Feel (via Mobbin) | iOS | 2026-11-16 | Mood-tracking app. Opening screens: calm, near-empty, one moving element. |

## Patterns

| # | Pattern | Source + capture | Plate Log screen | How it maps to Daylight | Status |
|---|---------|------------------|------------------|--------------------------|--------|
| 4 | Profile header: a cover photo across the top, the profile photo half over it, name below | Ladder · `captures/ladder_profile_cover-photo-centred-avatar.webp` | Profile | Default cover is the Home orange fade (`--home-fade`); photos fade into `--bg` at the bottom; profile photo centred (not left like the source) with a `--bg` ring; camera badge in `--select` ink; curated cities + nature backgrounds | Built 16 Nov (not yet deployed): 240px cover (Reid picked medium), profile photo, 36-photo background library |
| 3 | Background colour that is strong at the top and fades lighter down the screen, behind the content | Copilot · `captures/copilot_dashboard_top-gradient-background.webp` | Main tabs (Home first; maybe all four) | Fade from `--accent` (our cobalt, already very close to theirs) at the top into `--bg`; white cards sit on top as now | Built 16 Nov (not yet deployed) — Home only, 50% burnt orange, black date, white Start button. Had been dropped for the palette brief, then brought back at Reid's request |
| 2 | Logo-only splash: the app mark centred on a plain background, nothing else | How We Feel · `captures/how-we-feel_splash_logo-mark.webp` | Welcome screen (first moment on open) | Our plate icon centred on `--bg`; no text | Built 16 Nov (not yet deployed) |
| 1 | One quiet animation, one short headline, one button | How We Feel · `captures/how-we-feel_welcome_dot-sphere-headline.webp` | Welcome screen | Dots in `--plate` (now burnt orange) on `--bg`; headline in `--font-welcome` (IBM Plex Sans); full-width `--accent` button (was green until the 16 Nov palette change) | Built 16 Nov (not yet deployed) |

## Why pattern 3 was picked (Reid, 16 Nov)

- The colour behind the screen: strong at the top, gradually lighter further down
- **Ignore the rest of that screen** — its layout, cards, charts, emoji and labels are not wanted

## Why patterns 1–2 were picked (Reid, 16 Nov)

- Very little text
- The animation is small and clean, not showy
- No emoji
- Plain background, so the one moving thing stands out

## Screen-by-screen notes

### Welcome screen

**Pattern 1 — dot animation + headline.** Description, since the screenshot isn't in git:
- Black background filling the whole screen; nothing in the top half except the status bar.
- In the middle, a sphere made of small pink dots arranged in curved rows. Dots on the left are large and bright; they shrink and fade towards the right, which makes it look like a ball lit from one side. It turns slowly.
- Below it, a two-line serif headline, centred, large and bold ("Get strategies in the moment").
- A small page indicator (two dots and a line) under the headline.
- A full-width white pill button ("Get started") near the bottom, with a short line of grey small print under it.

**Pattern 2 — logo splash.** Description:
- Black background, the app's logo mark centred and large (about two-thirds of the screen width), no words at all.
- Shown briefly while the app opens, before the first real screen.

**How this could work in Plate Log**
- Replace today's welcome screen with: the plate logo alone for a moment (pattern 2), then a slow-turning disc of dots shaped like a weight plate (pattern 1), the headline "Welcome in, {name}", and a single green "Let's get moving" button that goes to Home.
- No workout suggestion on this screen (Reid, 16 Nov) — that stays on Home.
- Keep our own look: Daylight's light `--bg` by default; the dark version could come with the dark-mode roadmap item. Dots in `--accent` or the plate red, fading by size and opacity like the source.
- Respect "reduce motion": show the dots still.
- The screen waits for the button; no auto-dismiss timer.
- Headline font: **IBM Plex Sans, bold** (chosen by Reid, 16 Nov). Tried serifs like the source's first (Newsreader, Fraunces, Source Serif 4), then compared Manrope, Inter, IBM Plex Sans and Sora. It's a new font token used only on the welcome headline; the rest of the app stays Bricolage + Manrope.
- Button text: **"Let's get moving"** (was "Let's get started").

**Mock-up (16 Nov, revised):** [`mockups/welcome.html`](mockups/welcome.html) — open it in a browser. Shows patterns 1 + 2 together in Daylight and a dark version: plate logo alone for 1.2s, then a slowly turning disc of dots shaped like a weight plate (lit from the left, fading to the right), "Welcome in, Reid" and a green (`--success`) "Let's get moving" button, headline in IBM Plex Sans. Has Replay and Reduce motion controls. First draft showed the next workout and a "Start Lower A" button; dropped at Reid's request.

### Home

**Pattern 3 — top-to-bottom colour fade.** Description, since the screenshot isn't in git:
- The page background is a solid, fairly saturated blue at the very top (behind the status bar, the app title and the row of tabs).
- Going down, it fades smoothly through lighter blues to an almost-white grey. It is fully pale about 40–45% of the way down, roughly where the first card ends; everything below sits on the plain pale background.
- The white cards sit on top of the colour; the first card overlaps the blue part, which makes it stand out.
- Text over the strong blue is white; below that it's normal dark text.

**How this could work in Plate Log**
- Our `--accent` cobalt (#2453ff) is almost the same blue, so the fade can run from `--accent` at the top to `--bg` about 40% down, built with tokens only (no new colours).
- Whatever sits on the strong part — the date and weekday on Home, the page titles on other tabs — would switch to `--on-accent` (white).
- The fade scrolls with the page rather than staying fixed, so long pages end on the normal background.
- iOS status bar: today it uses the default (dark) style; over a blue top it would need light text.
- Mock-up (16 Nov): [`mockups/home-gradient.html`](mockups/home-gradient.html) — today's Home next to a cobalt fade and a workout-colour fade (Lower A = legs green). Uses the app's real stylesheet, so open it through the local server (`http://localhost:8082/design-reference/mockups/home-gradient.html`). The fade runs from solid colour behind the status bar to plain `--bg` by about 420px; the Start button flips to white with coloured text so it doesn't disappear into the blue.
- **Decision (16 Nov):** after the Warm Daylight palette, options were remocked (`mockups/fade-options/`: A strong orange, B soft wash, C warm sand, then 35/50/65/75% with a black date). Reid picked **50%**: orange at half strength fading to white by ~420px, date and weekday black, Start button white with orange text. Home only.
- Open questions (earlier): Home only, or all four tabs? Should the colour change with the day's workout type (push orange, pull blue, legs green) or always be cobalt? Does the workout screen stay plain so it's easy to read mid-set?

### My Plans

### Workout

### Progress

### Profile

**Pattern 4 — cover photo + profile photo.** Description, since the screenshot isn't in git:
- A photo (a Brooklyn street with the Manhattan Bridge) fills the top quarter of the screen, behind the status bar, with round icon buttons on it.
- A large circular profile photo overlaps the bottom edge of the cover, on the left, with a small badge on it.
- Name in big bold type under it, then a line of small facts (gym, join date, city), a two-line bio, and a row of four stat rings.
- Black page; everything below the cover is on black.

**What Reid wants (16 Nov)**
- The same idea, with the profile photo **centred** at the same height.
- Profile photo: take one with the camera or choose one from the phone.
- Background: pick from a curated library only (no uploading your own): clean, iconic shots of major cities and landmarks around the world, and nature (forests, waterfalls, mountains, scenery).
- Default cover when nothing is picked: the soft orange fade from Home.
- Not in this update: the stat rings, a bio or a location line. The existing stats card stays.

**Mock-up (16 Nov):** [`mockups/profile-header.html`](mockups/profile-header.html), served through the local server; screenshots in `mockups/profile-header/`. Six screens: no background (orange fade), a photo cover at 200 / 240 / 280px, the profile-photo options sheet, and the background picker (Cities / Nature / None). The city photo is a stand-in cropped from the capture (kept in `captures/`, not in git); picker tiles are placeholders until the real photos are downloaded.

**Background library (16 Nov):** 36 photos from Wikimedia Commons featured / quality pictures — Unsplash's API doesn't allow keeping copies in an app, so Reid chose Commons. Licences are CC BY, CC BY-SA, CC0 or public domain; the credit shows in the picker and at the bottom of Profile. Dubai had no usable photo (swapped for Budapest) and "rainforest" only found animal close-ups (swapped for Plitvice Lakes). Contact sheet: `mockups/profile-header/backgrounds-contact-sheet.jpg`. Scripts: `scripts/backgrounds/`.
