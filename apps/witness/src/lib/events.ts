// Geo-diff event types — emitted by the orchestrator, consumed by the SSE
// server and the live UI.
//
// Each event maps to a UI beat:
//   started          → header locks in, location cards materialize
//   location:started → card shows "connecting via {label}"
//   location:egress  → card shows the egress IP (proof it is not ours)
//   location:done    → card fills with the observation
//   diffing          → diff strip appears
//   complete         → verdict beat: one web or many?
//   error            → card (or page) shows the failure and a way back

import type { DiffLine, EgressLocation, LocationObservation } from "./types.js"

export type WitnessEvent =
  | { type: "started"; url: string; locations: EgressLocation[] }
  | { type: "location:started"; code: string }
  | { type: "location:egress"; code: string; egressIp: string }
  | { type: "location:done"; observation: LocationObservation }
  | { type: "diffing" }
  | { type: "complete"; differences: DiffLine[]; identical: boolean }
  | { type: "error"; message: string }

export type EventCallback = (event: WitnessEvent) => void
