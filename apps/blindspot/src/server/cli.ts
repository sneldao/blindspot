// CLI entry point — run an investigation from the terminal.
// Usage: pnpm --filter blindspot cli [ens-name]

import { execFile } from "node:child_process"
import { investigate } from "../lib/orchestrator.js"

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

if (!process.env.SOLARI_API_KEY) {
  console.error("Error: SOLARI_API_KEY not set. Get one at https://console.getsolari.com")
  process.exit(1)
}

if (!process.env.MOBULA_API_KEY) {
  console.error("Error: MOBULA_API_KEY not set. Get one at https://admin.mobula.io")
  process.exit(1)
}

if (!ensName) {
  console.error("Usage: tsx src/server/cli.ts <ens-name>")
  process.exit(1)
}

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
        if (event.egressIp !== "detecting...") console.log(`  proxy: ${event.egressIp} (${event.proxyCountry})`)
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
    // execFile (no shell) — the path embeds the user-supplied ENS name, so a
    // shell string would be command injection.
    const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer" : "xdg-open"
    execFile(opener, [path], (err) => {
      if (err) console.log(`  could not open report automatically: ${err.message}`)
    })
  })
  .catch((err) => {
    console.error("Investigation failed:", err)
    process.exit(1)
  })
