---
version: 1
name: The Witness
description: The same URL, seen from three countries at once. A live geo-diff.
product_thesis: "The web is not one web. Collect evidence without leaving fingerprints."
engine: none — editorial 2D, DOM-first
animation: staged reveals; the teardown beat is the finale
framework: astro (page + layout) with a single react island; lib modules are pure vanilla TS
fonts: self-hosted via @fontsource (fraunces, inter, jetbrains-mono)
colors:
  paper: "#faf8f3"
  paper-warm: "#f4f1e8"
  ink: "#26262e"
  ink-muted: "#6d6d78"
  accent: "#c26b3f"
  line: "#e3ddd0"
---

# The Witness — Design Notes

## Concept

One URL, three egress locations, one verdict. The visitor submits a URL and
watches three location cards fill in as each stealth browser lands: egress IP
first (the alibi), then the page surface the location saw — title, prices,
currency, content volume. The verdict beat answers one question: is this one
web, or many?

## Scope rules (per content/roadmap.md)

- A compelling 90-second interaction beats a 5-minute dossier. This
  experience is deliberately leaner than Blindspot: no 3D, no scroll engine —
  DOM-first, staged reveals.
- The teardown beat is the finale: after the verdict, state that every session
  was closed and nothing was kept. *"You were never there."*

## Do

- Keep lib/ modules pure and unit-tested (diff.ts, url-guard.ts are the core).
- Show the egress IP per location — it is the proof, not a detail.
- Emit events, render beats: the SSE stream is the choreography.

## Don't

- Persist any observation, session, or replay between runs.
- Fetch visitor-supplied URLs without the SSRF guard.
- Add a second accent color or a dark mode (Scudra design system).
