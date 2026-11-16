# Pattern catalog

One row per design idea taken from another app. Keep the newest at the top of each section.

**Status:** Idea → Planned → Shipped (date) · or Dropped (with a reason)

## Sources

| Source app | Platform | Captured on | Notes |
|------------|----------|-------------|-------|
| How We Feel (via Mobbin) | iOS | 2026-11-16 | Mood-tracking app. Opening screens: calm, near-empty, one moving element. |

## Patterns

| # | Pattern | Source + capture | Plate Log screen | How it maps to Daylight | Status |
|---|---------|------------------|------------------|--------------------------|--------|
| 2 | Logo-only splash: the app mark centred on a plain background, nothing else | How We Feel · `captures/how-we-feel_splash_logo-mark.webp` | Welcome screen (first moment on open) | Our plate icon centred on `--bg`; no text | Built 16 Nov (not yet deployed) |
| 1 | One quiet animation, one short headline, one button | How We Feel · `captures/how-we-feel_welcome_dot-sphere-headline.webp` | Welcome screen | Dots in `--plate` red on `--bg`; headline in `--font-welcome` (IBM Plex Sans); full-width `--success` button | Built 16 Nov (not yet deployed) |

## Why these were picked (Reid, 16 Nov)

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

### My Plans

### Workout

### Progress

### Profile
