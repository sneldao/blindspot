---
version: 1
name: Blindspot
description: Privacy-preserving onchain investigation agent. Dark, cinematic, ephemeral.
product_thesis: "See without being seen. Investigate without leaving a trace."
colors:
  void: oklch(0.08 0.02 270)
  surface: oklch(0.12 0.02 270)
  surface-raised: oklch(0.16 0.02 270)
  border: oklch(0.22 0.02 270)
  text: oklch(0.92 0.01 270)
  text-muted: oklch(0.55 0.02 270)
  text-dim: oklch(0.38 0.02 270)
  accent: oklch(0.72 0.18 270)
  accent-glow: oklch(0.72 0.18 270 / 0.15)
  risk-low: oklch(0.68 0.15 145)
  risk-moderate: oklch(0.75 0.15 75)
  risk-high: oklch(0.65 0.22 25)
  shatter: oklch(0.72 0.18 270 / 0.0)
typography:
  display:
    fontFamily: Inter
    fontWeight: 600
    letterSpacing: -0.03em
  body:
    fontFamily: Inter
    fontWeight: 400
    letterSpacing: -0.01em
  mono:
    fontFamily: JetBrains Mono
    fontWeight: 400
motion:
  ease-out: cubic-bezier(0.22, 1, 0.36, 1)
  ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)
  ease-shatter: cubic-bezier(0.4, 0, 0.2, 1)
  duration-fast: 160ms
  duration-standard: 240ms
  duration-deliberate: 400ms
  duration-cinematic: 800ms
  stagger: 60ms
---

## Overview

Blindspot is a privacy-preserving onchain investigation agent. The product
thesis — **see without being seen** — governs every design decision. The
interface should feel like looking through a one-way mirror: you see the target
clearly, but the target cannot see you. When the investigation ends, the mirror
shatters and nothing remains.

The visual language is dark, cinematic, and ephemeral. Not a hacker movie —
that's cliché. Closer to a surveillance console designed by someone with taste:
restrained, precise, and confident. Every element that appears must eventually
dissolve. Nothing in the UI persists because nothing in the system persists.

## Design Principles

### 1. Ephemeral by default

The UI is a live performance, not a document. Elements materialize when needed
and dissolve when done. The investigation has a beginning (the orb appears),
a middle (phases cycle through the orb), and an end (the orb shatters). There
is no persistent state, no saved sessions, no history. This mirrors the
underlying architecture: ephemeral sandboxes, killed after use.

### 2. One screen, no scroll

The live UI fits in a single viewport. The investigation unfolds as motion
within that viewport, not as content added to a page. Detailed data lives in
the downloadable report — the live UI shows distilled signals only. If a
judge has to scroll, the demo has failed.

### 3. Motion carries the narrative

Each phase of the investigation is a beat in a kinetic sequence. The motion
IS the information. Text inside the orb cycles through phases — "resolving
vitalik.eth" → "0xd8dA...96045" → fades → next phase. No cards, no tables,
no drawers. The report is where data lives; the UI is where the story lives.

### 4. The orb is the thesis

The glossy orb at the center of the screen represents the investigator's
protected identity. It is the only persistent element during the investigation.
It materializes at start, pulses with each phase, and shatters at the end.
The shatter is the privacy guarantee made visible: you were here, and now
you're not.

### 5. Restrained palette, purposeful accent

Dark surfaces, muted text, one accent color (violet). The accent appears only
on interactive elements and the orb. Risk colors (green/amber/red) appear only
at the finale. No gradients, no glow on static elements, no decorative color.
The accent glow is reserved exclusively for the orb's active state.

## Colors

- **Void** is the page background — near-black with a hint of violet.
- **Surface** and **surface-raised** are for the search bar and result elements.
- **Border** is barely visible — it defines edges without drawing attention.
- **Text** is the primary copy. **Text-muted** is for secondary labels.
  **Text-dim** is for the phase text inside the orb (low contrast = ephemeral).
- **Accent** (violet) is the only color used for interactive focus and the orb.
  It appears sparingly. If everything is accented, nothing is.
- **Risk colors** appear only in the finale — the risk score and its label.
  They do not appear during the investigation phases.

### Do not
- Use accent color on static text or borders.
- Use risk colors during investigation phases (they prejudice the reading).
- Use gradients. The orb's glow is a radial gradient — that is the only exception.
- Use pure black (`#000`). The void has a violet undertone for warmth.

## Typography

- **Display**: Inter 600, tight tracking. Used for the wordmark "BLINDSPOT"
  and the final risk score.
- **Body**: Inter 400, slightly tight. Used for the search bar, status line,
  and privacy verdict.
- **Mono**: JetBrains Mono. Used for addresses, sandbox IDs, egress IPs —
  anything that is a technical identifier. Never used for prose.

### Scale

| Use | Size | Weight | Tracking |
|-----|------|--------|----------|
| Wordmark | 1.25rem | 600 | 0.08em (wide, for identity) |
| Risk score | 4rem | 600 | -0.04em (tight, for impact) |
| Search input | 1rem | 400 | -0.01em |
| Phase text (in orb) | 0.875rem | 400 | 0 (dim, ephemeral) |
| Status line | 0.75rem | 400 | 0.02em (slightly wide, for labels) |
| Mono identifiers | 0.75rem | 400 | 0 |

## Layout

```
┌─────────────────────────────────────────────────────┐
│                                                     │   ← 1 viewport
│  BLINDSPOT                                          |      no scroll
│                                                     |
│  [ search bar ]                              →      |
│                                                     |
│                                                     |
│                     ● (orb)                         |   ← centered
│                                                     |      vertically
│                                                     |
│  status line                                        |
│                                                     |
└─────────────────────────────────────────────────────┘
```

- Single column, centered. No grid, no sidebar, no header bar.
- The orb is vertically centered in the viewport. The search bar is above it.
  The status line is below it.
- On submit, the search bar contracts to a compact label showing the target
  name. The orb materializes. The status line begins cycling.
- At the finale, the orb shatters. The risk score appears where the orb was.
  The status line becomes the privacy verdict.
- Padding: 2rem horizontal, 1.5rem vertical. The viewport is the canvas.

## Motion

### Easing

All motion uses custom curves. Built-in CSS easings are prohibited — they
lack the punch that makes motion feel intentional.

| Token | Curve | Use |
|-------|-------|-----|
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Entrances, materialization |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | On-screen morphs, orb pulses |
| `--ease-shatter` | `cubic-bezier(0.4, 0, 0.2, 1)` | The orb shatter — deliberate, final |

### Duration

| Token | Value | Use |
|-------|-------|-----|
| `--duration-fast` | 160ms | Button press, search bar focus |
| `--duration-standard` | 240ms | Phase text fade in/out, status updates |
| `--duration-deliberate` | 400ms | Orb materialize, orb dissolve |
| `--duration-cinematic` | 800ms | Orb shatter — the finale, worth the wait |

### Rules

1. **Only animate `transform` and `opacity`.** These run on the GPU. Never
   animate `width`, `height`, `padding`, `margin`, or `top`/`left`.

2. **Never animate from `scale(0)`.** The orb materializes from `scale(0.92)`
   with `opacity: 0`. Nothing in the real world appears from nothing.

3. **Entrances use `--ease-out`.** Exits use `--ease-out` too, but faster.
   The orb shatter uses `--ease-shatter` — it's the one exception: a
   deliberate, slightly slow exit that says "this is final."

4. **Phase text is a crossfade, not a slide.** Each phase's text fades out
   (`opacity: 1 → 0`, 240ms), then the next fades in (`opacity: 0 → 1`,
   240ms). No `translateY`. The text stays in place inside the orb. Movement
   would distract from the orb's pulse.

5. **The orb pulse is a scale oscillation.** On each phase event, the orb
   scales from `1` to `1.04` and back, 400ms `--ease-in-out`. This is the
   heartbeat of the investigation. It should feel organic, not mechanical.

6. **The shatter is particle-based.** On `sandbox:killed`, the orb breaks
   into 20-30 particles that disperse outward with random trajectories,
   fading to `opacity: 0` over 800ms. Use Canvas for this — CSS can't
   handle per-particle physics. The particles use `--ease-shatter`.

7. **Asymmetric timing for the search bar.** On submit, the search bar
   contracts to a label over 240ms (`--ease-out`). On "new investigation,"
   it expands back over 160ms (`--ease-out`, faster — the system responds
   instantly to the user's intent).

8. **Stagger the finale elements.** After the shatter: risk score appears
   (0ms delay), risk label appears (60ms delay), privacy verdict appears
   (120ms delay), buttons appear (180ms delay). Each fades in with
   `--duration-standard` and `--ease-out`. The stagger creates a cascade
   that feels like the dust settling.

9. **Never use `transition: all`.** Always specify exact properties.

10. **Respect `prefers-reduced-motion`.** If set: skip the orb shatter
    (fade the orb out instead), skip particle effects, keep phase text
    crossfades (they're gentle), show all finale elements simultaneously
    (no stagger).

## The Orb

The orb is the single most important element. It must feel alive, protected,
and precious — because it represents the investigator's identity.

### Visual

- 120px diameter, perfectly round.
- Radial gradient: accent at center, fading to transparent at edge.
- Subtle inner glow: `box-shadow: 0 0 60px var(--accent-glow)`.
- No border. The edge is defined by the gradient falloff.
- At rest: gentle breathing animation (scale 1 → 1.02 → 1, 3s, infinite,
  `--ease-in-out`). This is the only infinite animation in the UI.

### States

| State | Visual | Trigger |
|-------|--------|---------|
| `idle` | Not rendered. Search bar is focused. | Initial state. |
| `materializing` | Scales from 0.92 + opacity 0 → 1. 400ms. | User submits a name. |
| `active` | Breathing animation. Phase text cycles inside. | Investigation running. |
| `pulsing` | Scale 1 → 1.04 → 1. 400ms. One-shot. | Each phase event fires. |
| `shattering` | Particles disperse. Orb fades. 800ms. | `sandbox:killed` event. |
| `gone` | Not rendered. Risk score is shown. | After shatter completes. |

### Phase text

Text appears inside the orb, centered. It cycles through phases:

```
"resolving vitalik.eth..."
→ "0xd8dA...96045"           (result, 1s hold, then fade)
→ "spawning ephemeral sandbox..."
→ "sandbox booted"            (result, 800ms hold)
→ "connecting residential proxy..."
→ "72.41.xx.xx (US)"          (result, 800ms hold)
→ "fetching onchain data..."
→ "$2.1M · 14 assets"         (result, 1s hold)
→ "enriching off-chain context..."
→ "3 sources"                 (result, 800ms hold)
→ "analyzing risk..."
→ (shatter)
```

Each transition: fade out current text (240ms) → fade in next text (240ms).
The orb pulses on each "result" line. The text is `--text-dim` — low contrast,
ephemeral. You read it, but it doesn't demand attention. The orb does.

## The Finale

After the orb shatters, the space where it was becomes the result:

```
                    42
               MODERATE RISK

   sandbox destroyed · no trace · you were never here

         [ download report ]  [ new investigation ]
```

- **Risk score**: 4rem, display weight, risk color based on score.
  Fades in at 0ms after shatter.
- **Risk label**: 0.75rem, wide tracking, uppercase, same risk color.
  Fades in at 60ms.
- **Privacy verdict**: 0.875rem, `--text-muted`, centered.
  Fades in at 120ms.
- **Buttons**: ghost style, `--text` color, `scale(0.97)` on `:active`.
  Fade in at 180ms.

The cascade takes ~600ms total. It feels like dust settling after an
explosion. The investigation is over. The result is all that remains.

## Components

### Search bar

- Single text input, full width of the content column.
- Placeholder: "Enter an ENS name to investigate"
- On focus: border transitions to `--accent` (160ms, `--ease-out`).
- On submit: contracts to a compact label showing the target name,
  left-aligned. The input becomes a static element. 240ms, `--ease-out`.
- On "new investigation": expands back to an editable input. 160ms, faster.

### Buttons

- Ghost style: transparent background, `--text` color, `1px solid --border`.
- On hover (desktop only): background → `--surface-raised`. 160ms.
- On `:active`: `scale(0.97)`. 160ms, `--ease-out`.
- No fill color. No accent on buttons. The accent is reserved for the orb.

### Status line

- Below the orb, centered. 0.75rem, `--text-muted`, wide tracking.
- Shows the current phase label: "hidden · residential · ephemeral"
- On each phase event, the relevant word brightens briefly:
  "hidden" during ENS resolve, "residential" during browser launch,
  "ephemeral" during sandbox operations.
- The brighten is an opacity transition: `0.5 → 1 → 0.5`, 400ms.

## Illustration & Motif

### The orb is the only illustration

No icons. No illustrations. No decorative SVGs. The orb is the visual identity.
It IS the logo, the loading state, the privacy indicator, and the finale —
all in one.

### The shatter is the motif

The orb shattering into particles is the recurring motif. It appears:
1. At the end of each investigation (the finale).
2. As the logo animation on the GitHub README (a looping shatter).
3. As the favicon (a static frame of the orb, mid-shatter).

The shatter is to Blindspot what the Twitter bird is to Twitter — the single
visual that encodes the entire product thesis in one image.

## Accessibility

- **Focus states**: visible. The search bar border becomes `--accent` on focus.
  Buttons get a `2px` outline in `--accent` on keyboard focus.
- **Reduced motion**: skip shatter (fade instead), skip particles, skip
  stagger (show all finale elements at once), keep crossfades.
- **Touch devices**: no hover states. Gate hover animations behind
  `@media (hover: hover) and (pointer: fine)`.
- **Color contrast**: `--text` on `--void` is 11:1 (AAA). `--text-muted`
  on `--void` is 5.2:1 (AA for normal text, AAA for large).
  `--text-dim` is intentionally low contrast (2.8:1) — it's decorative
  phase text inside the orb, not essential content. The essential content
  (search bar, risk score, buttons, privacy verdict) all meet AA minimum.
- **Keyboard**: Enter submits the search. Tab moves between buttons.
  Escape resets to a new investigation.

## Do's and Don'ts

### Do
- Animate only `transform` and `opacity`.
- Use custom easing curves for all motion.
- Keep the orb as the single focal point.
- Let the phase text be dim — the orb is the hero, not the text.
- Make the shatter feel final and deliberate (800ms, not 200ms).
- Gate hover effects behind pointer media queries.
- Respect `prefers-reduced-motion`.

### Don't
- Use `transition: all`.
- Animate from `scale(0)`.
- Use `ease-in` for any entrance.
- Add cards, tables, or drawers to the live UI.
- Use accent color on anything except the orb and focus states.
- Use risk colors during investigation phases.
- Use pure black (`#000`).
- Add icons, illustrations, or decorative elements.
- Make the user scroll.
- Use a framework. This is vanilla HTML/CSS/JS + Canvas for the shatter.
