# Sandbox Preview — The Builder

Prompt. Boot. Build. Vanish.

## What it does

An agent receives a prompt, plans an application, writes the code, and boots it inside a Solari sandbox — exposing a live preview URL so the visitor can click around the app the agent just built. When the session ends, the sandbox and everything it hosted are destroyed.

**The experience (planned): software born and buried on stage.** The visitor submits a small prompt, watches the build stream in (plan → code → boot), then interacts with the running app through the sandbox preview. The final beat is the teardown: the preview dies, the URL 404s, the machine that hosted it no longer exists.

## Primitives

- Sandbox

## Why it matters

The most visceral proof that an agent's body can be infrastructure. The essay thesis: *an agent that can build software should also be able to disappear with it* — no cold starts, no residue, no custody.

## Solari foundation

- `examples/sandbox-port-preview-ts`
- `examples/sandbox-quickstart-ts`

## Status

Planned. See [`content/roadmap.md`](../roadmap.md).
