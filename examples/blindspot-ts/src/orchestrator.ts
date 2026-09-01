// Orchestrator — coordinates the full investigation pipeline.
//
// Flow:
//   1. Resolve ENS name locally (public RPC, not privacy-sensitive)
//   2. Spin up Solari sandbox → run Mobula API calls inside it (ephemeral)
//   3. Spin up Solari stealth browser → enrich off-chain context (residential proxy)
//   4. Analyze combined data → risk score
//   5. Generate HTML report with privacy manifest
//   6. Tear down: kill sandbox, close browser, download recording
//
// The sandbox and browser run concurrently — the Mobula calls and web scraping
// happen in parallel, cutting total investigation time.

import { resolveEns } from "./ens.js"
import { fetchOnchainData } from "./mobula.js"
import { createSandbox, destroySandbox } from "./sandbox.js"
import { createStealthBrowser, enrichOffChain, closeBrowser, downloadRecording } from "./browser.js"
import { assessRisk } from "./analyzer.js"
import { generateReport } from "./report.js"
import type { InvestigationReport, PrivacyManifest } from "./types.js"
import { mkdirSync } from "node:fs"
import { join } from "node:path"

const SOLARI_API_KEY = process.env.SOLARI_API_KEY!
const MOBULA_API_KEY = process.env.MOBULA_API_KEY!

export async function investigate(ensName: string, outputDir = "reports"): Promise<string> {
  const startTime = Date.now()
  console.log(`\n┌─ Blindspot: investigating ${ensName}`)
  console.log(`│  Privacy: ephemeral sandbox + stealth residential proxy`)
  console.log(`│`)

  // 1. ENS resolution — local, public RPC
  console.log(`├─ [1/5] Resolving ENS name...`)
  const target = await resolveEns(ensName)
  console.log(`│  ${target.name} → ${target.address}`)
  if (target.aliases.length > 0) console.log(`│  aliases: ${target.aliases.join(", ")}`)
  if (target.website) console.log(`│  website: ${target.website}`)
  if (target.twitter) console.log(`│  twitter: @${target.twitter.replace(/^@/, "")}`)

  // 2 + 3. Spin up sandbox and stealth browser concurrently
  console.log(`├─ [2/5] Spawning Solari sandbox + stealth browser...`)
  const [sandboxHandle, browserHandle] = await Promise.all([
    createSandbox(SOLARI_API_KEY),
    createStealthBrowser(SOLARI_API_KEY),
  ])

  let onchain, offChain
  try {
    // Run onchain analysis (in sandbox) and off-chain enrichment (stealth browser) in parallel
    console.log(`├─ [3/5] Running onchain analysis + off-chain enrichment in parallel...`)
    ;[onchain, offChain] = await Promise.all([
      fetchOnchainData(sandboxHandle.sandbox, target.address, MOBULA_API_KEY),
      enrichOffChain(browserHandle, target),
    ])
    console.log(`│  onchain: ${onchain.portfolio.length} assets, $${onchain.totalValueUSD.toFixed(0)} total`)
    console.log(`│  offchain: ${offChain.length} pages enriched via stealth proxy`)
  } finally {
    // 6. Tear down — always, even on error
    console.log(`├─ [5/5] Tearing down — killing sandbox, closing browser...`)
    await destroySandbox(sandboxHandle)
    await closeBrowser(browserHandle)
  }

  // 4. Risk assessment
  console.log(`├─ [4/5] Assessing risk...`)
  const risk = assessRisk(target, onchain, offChain)
  console.log(`│  risk score: ${risk.overallScore}/100 — ${risk.summary}`)

  // Download session recording (for demo)
  console.log(`│  downloading session recording...`)
  const recording = await downloadRecording(browserHandle)

  // Build privacy manifest
  const privacy: PrivacyManifest = {
    protectedData: [
      "Investigator's real IP address",
      "Investigator's browser fingerprint",
      "That an investigation of this target occurred",
      "What onchain data was queried (Mobula sees sandbox IP, not investigator)",
      "What websites were visited (target sees residential proxy IP)",
    ],
    adversaries: [
      "The target entity (website operator)",
      "Mobula (onchain data provider)",
      "ISP / network observer",
      "Future correlation attempts (no persistent state)",
    ],
    mechanisms: [
      `Ephemeral Solari sandbox (${sandboxHandle.id}) — killed after investigation, no state persists`,
      `Stealth browser with residential proxy (${browserHandle.proxy?.country ?? "us"}) — fingerprint masked, IP rotated`,
      `ENS as discovery layer — investigator queries by name, not by linking address to identity`,
      `Session recording opt-in only — replay available for audit, not stored by default`,
    ],
    sandboxId: sandboxHandle.id,
    browserSessionId: browserHandle.sessionId,
    egressIp: offChain[0]?.egressIp ?? "unknown",
    sandboxDestroyed: true,
    recordingAvailable: recording.available,
  }

  // 5. Generate report
  mkdirSync(outputDir, { recursive: true })
  const report: InvestigationReport = {
    target,
    onchain,
    offChain,
    risk,
    privacy,
    timestamp: new Date().toISOString(),
    duration: (Date.now() - startTime) / 1000,
  }

  const reportPath = generateReport(report, outputDir)
  console.log(`│`)
  console.log(`└─ Report: ${reportPath}`)
  console.log(`   Duration: ${report.duration.toFixed(1)}s`)
  console.log(`   Privacy: sandbox destroyed, browser closed, recording ${recording.available ? "saved" : "unavailable"}\n`)

  return reportPath
}
