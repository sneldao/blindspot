// CLI — run the Witness without a browser UI.
//
//   pnpm --filter witness cli https://example.com/pricing

import { runWitness } from "../lib/orchestrator.js"
import { diffObservations } from "../lib/diff.js"
import type { LocationObservation } from "../lib/types.js"

const url = process.argv[2]
if (!url) {
  console.error("Usage: pnpm --filter witness cli <url>")
  process.exit(1)
}

const apiKey = process.env.SOLARI_API_KEY
if (!apiKey) {
  console.error("SOLARI_API_KEY is not set. Copy .env.example to .env and add your key.")
  process.exit(1)
}

const observations: LocationObservation[] = []

await runWitness(apiKey, url, (event) => {
  switch (event.type) {
    case "started":
      console.log(`\nWitnessing ${url} from ${event.locations.length} locations...\n`)
      break
    case "location:started":
      console.log(`  [${event.code}] launching stealth browser...`)
      break
    case "location:egress":
      console.log(`  [${event.code}] egress IP: ${event.egressIp}`)
      break
    case "location:done":
      observations.push(event.observation)
      if (event.observation.ok) {
        console.log(
          `  [${event.observation.code}] "${event.observation.title}" (${event.observation.bodyLength} chars)`,
        )
      } else {
        console.log(`  [${event.observation.code}] failed: ${event.observation.error}`)
      }
      break
    case "error":
      console.error(`\nError: ${event.message}`)
      process.exit(1)
  }
})

const diff = diffObservations(observations)
console.log(`\n${diff.identical ? "One web — this time." : "Not one web."}`)
for (const line of diff.differences) {
  console.log(`  - [${line.kind}] ${line.detail}`)
}
