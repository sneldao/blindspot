// The orchestrator — runs every egress location concurrently, emits SSE
// events as each observation lands, then diffs.
//
// Concurrency note: locations are independent sessions with independent
// proxies. They run in parallel on purpose — a geo-diff must sample the
// world at roughly the same moment, or the comparison lies.

import { LOCATIONS } from "./locations.js"
import { observeFrom } from "./observer.js"
import { diffObservations } from "./diff.js"
import { isPublicHttpUrl } from "./url-guard.js"
import type { EventCallback } from "./events.js"

export async function runWitness(apiKey: string, url: string, onEvent: EventCallback): Promise<void> {
  if (!isPublicHttpUrl(url)) {
    onEvent({ type: "error", message: "That URL is not a public web page." })
    return
  }

  onEvent({ type: "started", url, locations: LOCATIONS })

  const runs = LOCATIONS.map(async (loc) => {
    onEvent({ type: "location:started", code: loc.code })
    const observation = await observeFrom(apiKey, url, loc.code, loc.label)
    if (observation.ok && observation.egressIp) {
      onEvent({ type: "location:egress", code: loc.code, egressIp: observation.egressIp })
    }
    onEvent({ type: "location:done", observation })
    return observation
  })

  const observations = await Promise.all(runs)

  onEvent({ type: "diffing" })
  const diff = diffObservations(observations)
  onEvent({ type: "complete", differences: diff.differences, identical: diff.identical })
}
