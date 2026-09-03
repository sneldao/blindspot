# Session Recording — The Archivist

A flight recorder for agents.

## What it does

Runs a cloud-browser agent through a real task while Solari's session recording captures everything. The visitor scrubs a replay of the run — every page seen, every click, every decision point — like flight data after a mission.

**The experience (planned): the replay theater.** A completed investigation or scrape is presented as a scrubbable timeline: the agent's actions on top, its observed evidence below. Debugging an agent becomes the same pleasure as reviewing game film. Trust through observability — then the session itself is destroyed.

## Primitives

- Browser

## Why it matters

Agents are opaque; recordings make them legible. The essay thesis: *you cannot trust what you cannot replay.* The recording is a safety feature for the operator, while the ephemeral session underneath remains a privacy feature.

## Solari foundation

- `examples/browser-session-recording-py`

## Status

Planned. See [`content/roadmap.md`](../roadmap.md).
