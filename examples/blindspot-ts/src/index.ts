// Blindspot — Privacy-Preserving Onchain Investigation Agent
//
// Investigate any onchain actor by ENS name, with all three metadata layers
// protected:
//   - WHO is investigating  → stealth browser + residential proxy
//   - THAT it happened      → ephemeral sandbox, killed after, no state
//   - WHAT was queried      → Mobula calls run inside the sandbox, not your IP
//
// Usage:
//   npm start -- vitalik.eth
//   npm start -- parith.eth --output ./my-reports
//
// Requires: SOLARI_API_KEY, MOBULA_API_KEY environment variables.
// Get them at https://console.getsolari.com and https://admin.mobula.io

import { investigate } from "./orchestrator.js"

const args = process.argv.slice(2)
let ensName: string | null = null
let outputDir = "reports"

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--output" && args[i + 1]) {
    outputDir = args[i + 1]
    i++
  } else if (!args[i].startsWith("-")) {
    ensName = args[i]
  }
}

if (!ensName) {
  console.error("Usage: npm start -- <ens-name> [--output <dir>]")
  console.error("Example: npm start -- vitalik.eth")
  process.exit(1)
}

if (!process.env.SOLARI_API_KEY) {
  console.error("Error: SOLARI_API_KEY not set. Get one at https://console.getsolari.com")
  process.exit(1)
}

if (!process.env.MOBULA_API_KEY) {
  console.error("Error: MOBULA_API_KEY not set. Get one at https://admin.mobula.io")
  process.exit(1)
}

investigate(ensName, outputDir)
  .then((path) => {
    console.log(`Open the report: file://${path}`)
    // Open in default browser on macOS
    import("node:child_process").then(({ exec }) => exec(`open "${path}"`))
  })
  .catch((err) => {
    console.error("Investigation failed:", err)
    process.exit(1)
  })
