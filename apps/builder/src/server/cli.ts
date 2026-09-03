// CLI — run The Builder without the web UI.
//
//   pnpm --filter builder cli "a todo list for my last day alive"

import { runBuilder } from "../lib/orchestrator.js"

const prompt = process.argv.slice(2).join(" ")
if (!prompt) {
  console.error('Usage: pnpm --filter builder cli "describe a small app"')
  process.exit(1)
}

const apiKey = process.env.SOLARI_API_KEY
if (!apiKey) {
  console.error("SOLARI_API_KEY is not set. Copy .env.example to .env and add your key.")
  process.exit(1)
}

await runBuilder(apiKey, prompt, (event) => {
  switch (event.type) {
    case "started":
      console.log(`\nBuilding from prompt: "${prompt}"\n`)
      break
    case "planning":
      console.log(`  plan   : ${event.blueprint.kind} → "${event.blueprint.title}"`)
      break
    case "writing":
      console.log(`  wrote  : ${event.bytes.toLocaleString()} bytes of HTML`)
      break
    case "booting":
      console.log("  boot   : spawning a fresh sandbox VM…")
      break
    case "preview":
      console.log(`  preview: ${event.previewUrl}  (sandbox ${event.sandboxId})`)
      console.log("           open it now — it will be destroyed shortly")
      break
    case "teardown":
      console.log("  teardown: destroying the sandbox VM…")
      break
    case "complete":
      console.log("\nGone. The URL above now leads nowhere. You were never there.\n")
      break
    case "error":
      console.error(`\nError: ${event.message}`)
      process.exit(1)
  }
})
