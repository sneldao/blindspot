// Orchestrator — coordinates the full investigation pipeline.
//
// Emits typed events via a callback. The SSE server forwards these to the
// live UI; the CLI mode prints them to the console. The same orchestrator
// powers both.
//
// Flow:
//   1. Resolve ENS name locally (public RPC, not privacy-sensitive)
//   2. Spin up Solari sandbox → run Mobula API calls inside it (ephemeral)
//   3. Spin up Solari stealth browser → enrich off-chain context (residential proxy)
//   4. Analyze combined data → risk score
//   5. Generate HTML report with privacy manifest
//   6. Tear down: kill sandbox, close browser, download recording

import { resolveEns } from "./ens.js"
import { fetchOnchainData } from "./mobula.js"
import { createSandbox, destroySandbox } from "./sandbox.js"
import { createStealthBrowser, enrichOffChain, closeBrowser, downloadRecording } from "./browser.js"
import { assessRisk } from "./analyzer.js"
import { generateReport } from "./report.js"
import type { InvestigationReport, PrivacyManifest } from "./types.js"
import type { EventCallback, InvestigationEvent } from "./events.js"
import { mkdirSync } from "node:fs"
import { join } from "node:path"

const SOLARI_API_KEY = process.env.SOLARI_API_KEY!
const MOBULA_API_KEY = process.env.MOBULA_API_KEY!

export interface InvestigateOptions {
  outputDir?: string
  onEvent?: EventCallback
}

export async function investigate(
  ensName: string,
  opts: InvestigateOptions = {},
): Promise<string> {
  const { outputDir = "reports", onEvent } = opts
  const emit = (event: InvestigationEvent) => {
    onEvent?.(event)
  }

  const startTime = Date.now()

  emit({ type: "started", ensName })

  // 1. ENS resolution — local, public RPC
  emit({ type: "phase", phase: "resolving", status: "working" })
  const target = await resolveEns(ensName)
  emit({
    type: "ens:resolved",
    name: target.name,
    address: target.address,
    aliases: target.aliases,
    website: target.website,
    twitter: target.twitter,
  })
  emit({ type: "phase", phase: "resolving", status: "done", detail: target.address })

  // 2 + 3. Spin up sandbox and stealth browser concurrently
  const [sandboxHandle, browserHandle] = await Promise.all([
    createSandbox(SOLARI_API_KEY),
    createStealthBrowser(SOLARI_API_KEY),
  ])

  emit({ type: "sandbox:booted", sandboxId: sandboxHandle.id })
  emit({ type: "phase", phase: "sandbox", status: "done", detail: sandboxHandle.id })

  emit({
    type: "browser:connected",
    egressIp: "detecting...",
    proxyCountry: browserHandle.proxy?.country ?? "us",
  })

  let onchain, offChain
  try {
    // Run onchain analysis (in sandbox) and off-chain enrichment (stealth browser) in parallel
    emit({ type: "phase", phase: "onchain", status: "working" })
    emit({ type: "phase", phase: "offchain", status: "working" })

    ;[onchain, offChain] = await Promise.all([
      fetchOnchainData(sandboxHandle.sandbox, target.address, MOBULA_API_KEY),
      enrichOffChain(browserHandle, target),
    ])

    emit({
      type: "mobula:data",
      totalValueUSD: onchain.totalValueUSD,
      assetCount: onchain.portfolio.length,
      realizedPnlUSD: onchain.totalRealizedPnlUSD,
    })
    emit({
      type: "phase",
      phase: "onchain",
      status: "done",
      detail: `$${formatCompact(onchain.totalValueUSD)} · ${onchain.portfolio.length} assets`,
    })

    // Update browser egress IP if we got it from off-chain enrichment
    if (offChain.length > 0 && offChain[0].egressIp !== "detecting...") {
      emit({ type: "browser:connected", egressIp: offChain[0].egressIp, proxyCountry: browserHandle.proxy?.country ?? "us" })
    }
    emit({ type: "offchain:data", sourceCount: offChain.length })
    emit({
      type: "phase",
      phase: "offchain",
      status: "done",
      detail: `${offChain.length} sources`,
    })
  } finally {
    // 6. Tear down — always, even on error
    await destroySandbox(sandboxHandle)
    await closeBrowser(browserHandle)
  }

  // 4. Risk assessment
  emit({ type: "analyzing" })
  emit({ type: "phase", phase: "analyzing", status: "working" })
  const risk = assessRisk(target, onchain, offChain)
  emit({ type: "phase", phase: "analyzing", status: "done", detail: `${risk.overallScore}/100` })

  // Download session recording (for demo)
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

  const riskLabel = risk.overallScore >= 60 ? "HIGH RISK"
    : risk.overallScore >= 30 ? "MODERATE" : "LOW RISK"

  emit({
    type: "complete",
    report: {
      riskScore: risk.overallScore,
      riskLabel,
      riskSummary: risk.summary,
      privacyVerdict: "sandbox destroyed · no trace · you were never here",
      reportPath,
      sandboxId: sandboxHandle.id,
      egressIp: offChain[0]?.egressIp ?? "unknown",
      sandboxDestroyed: true,
      recordingAvailable: recording.available,
    },
  })

  return reportPath
}

function formatCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "K"
  return n.toFixed(0)
}
