---
version: 1
name: The Builder
description: Prompt. Boot. Build. Vanish. Software born and buried on stage.
product_thesis: "An agent that can build software should also be able to disappear with it."
engine: none — editorial 2D, DOM-first
animation: staged build beats; the teardown is the finale
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

# The Builder — Design Notes

## Concept

The visitor describes a small app and watches the full life of a machine:
prompt → plan → bytes → sandbox boot → live public URL → destruction. The
preview URL is the hero beat. The tombstone beat — "the URL now leads
nowhere, try it" — is the thesis made physical.

## The 60-second stage

The orchestrator holds the app live for 60 seconds before teardown so the
visitor can click through it. This is a deliberate theatrical choice; the
limits make the ephemerality legible. Adjust in `orchestrator.ts` only with
intent.

## The LLM seam

`blueprint.plan(prompt)` is deterministic today (vocabulary matching over
four archetypes). To upgrade to an LLM planner: keep the signature, call the
model, validate the output into a `Blueprint`. The orchestrator, renderer,
and tests do not change.

## Do

- Keep `render.ts` and `blueprint.ts` pure and unit-tested.
- Escape every visitor-supplied string in generated HTML.
- Kill the sandbox on every failure path — never leave a VM behind.
- Emit events, render beats: SSE is the choreography.

## Don't

- Persist the generated app, the blueprint, or the sandbox between runs.
- Skip the public-reachability check before showing the preview URL.
- Add a second accent color or a dark mode (Scudra design system).
