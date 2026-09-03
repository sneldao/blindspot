// Geo... no — build event types. Emitted by the orchestrator, consumed by
// the SSE server and the live UI.
//
// Each event maps to a UI beat:
//   started  → prompt locks, build timeline materializes
//   planning → "reading the prompt" beat
//   writing  → generated HTML streams (byte counter)
//   booting  → sandbox beat: "a VM is being born"
//   preview  → THE BEAT: the preview URL appears, visitor can click it
//   teardown → "the machine that hosted it is being destroyed"
//   complete → tombstone beat: the URL now 404s; nothing remains
//   error    → human sentence and a way back

import type { Blueprint } from "./types.js"

export type BuilderEvent =
  | { type: "started"; prompt: string }
  | { type: "planning"; blueprint: Blueprint }
  | { type: "writing"; bytes: number }
  | { type: "booting" }
  | { type: "preview"; sandboxId: string; previewUrl: string }
  | { type: "teardown" }
  | { type: "complete" }
  | { type: "error"; message: string }

export type EventCallback = (event: BuilderEvent) => void
