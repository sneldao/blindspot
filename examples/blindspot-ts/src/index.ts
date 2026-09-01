// Blindspot — Privacy-Preserving Onchain Investigation Agent
//
// Investigate any onchain actor by ENS name, with all three metadata layers
// protected:
//   - WHO is investigating  → stealth browser + residential proxy
//   - THAT it happened      → ephemeral sandbox, killed after, no state
//   - WHAT was queried      → Mobula calls run inside the sandbox, not your IP
//
// Usage:
//   npm start                        → starts the web UI at localhost:4567
//   npm start -- vitalik.eth         → runs CLI mode directly
//   npm start -- --output ./reports  → custom output directory
//
// Requires: SOLARI_API_KEY, MOBULA_API_KEY environment variables.
// Get them at https://console.getsolari.com and https://admin.mobula.io

import { startServer } from "./server.js"
import { investigate } from "./orchestrator.js"

const args = process.argv.slice(2)

// Check for CLI mode: an ENS name passed as a positional argument
let ensName: string | null = null
let outputDir = "reports"
let cliMode = false

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--output" && args[i + 1]) {
    outputDir = args[i + 1]
    i++
  } else if (!args[i].startsWith("-")) {
    ensName = args[i]
    cliMode = true
  }
}

if (!process.env.SOLARI_API_KEY) {
  console.error("Error: SOLARI_API_KEY not set. Get one at https://console.getsolari.com")
  process.exit(1)
}

if (!process.env.MOBULA_API_KEY) {
  console.error("Error: MOBULA_API_KEY not set. Get one at https://admin.mobula.io")
  process.exit(1)
}

if (cliMode && ensName) {
  // CLI mode — run directly with console output
  console.log(`\n  Blindspot: investigating ${ensName}\n`)

  investigate(ensName, {
    outputDir,
    onEvent: (event) => {
      switch (event.type) {
        case "started":
          console.log(`  started: ${event.ensName}`)
          break
        case "ens:resolved":
          console.log(`  ENS: ${event.name} → ${event.address}`)
          break
        case "sandbox:booted":
          console.log(`  sandbox: ${event.sandboxId}`)
          break
        case "browser:connected":
          if (event.egressIp !== "detecting...")
            console.log(`  proxy: ${event.egressIp} (${event.proxyCountry})`)
          break
        case "mobula:data":
          console.log(`  onchain: $${event.totalValueUSD.toFixed(0)} · ${event.assetCount} assets`)
          break
        case "offchain:data":
          console.log(`  offchain: ${event.sourceCount} sources`)
          break
        case "complete":
          console.log(`  risk: ${event.report.riskScore}/100 — ${event.report.riskLabel}`)
          console.log(`  report: ${event.report.reportPath}`)
          console.log(`  ${event.report.privacyVerdict}\n`)
          break
        case "error":
          console.error(`  error: ${event.message}`)
          break
      }
    },
  })
    .then((path) => {
      import("node:child_process").then(({ exec }) => exec(`open "${path}"`))
    })
    .catch((err) => {
      console.error("Investigation failed:", err)
      process.exit(1)
    })
} else {
  // Web UI mode — start the server
  startServer().catch((err) => {
    console.error("Server failed:", err)
    process.exit(1)
  })
}
