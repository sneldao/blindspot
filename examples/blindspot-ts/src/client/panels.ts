// Panel system — builds the 5 dossier panels as groups of 3D planes.
// Each panel is designed in HTML/CSS, projected to canvas textures,
// and positioned in 3D space. Clip-path shader reveals on scroll entry.

import * as THREE from "three"
import { htmlToTexture } from "./texture.js"
import { createClipMaterial, type ClipDirection } from "./clip-material.js"
import { createDonutChart, type DonutChart, type ChartSegment } from "./chart.js"
import { PANEL_Z } from "./camera-curve.js"
import {
  createRedactionGroup,
  REDACTION_LAYOUTS,
  type RedactionGroup,
} from "./redaction.js"

export interface PanelMesh {
  mesh: THREE.Mesh
  material: THREE.ShaderMaterial
  reveal: () => void
  close: () => void
  dispose: () => void
}

export interface InvestigationData {
  ensName: string
  address: string
  aliases: string[]
  website: string | null
  twitter: string | null
  avatarUrl: string | null
  totalValueUSD: number
  assetCount: number
  realizedPnlUSD: number
  topHoldings: { symbol: string; value: number; percentage: number }[]
  offchainSources: { url: string; title: string; screenshotUrl: string | null }[]
  egressIp: string
  proxyCountry: string
  riskScore: number
  riskLabel: string
  riskSummary: string
  privacyVerdict: string
  reportPath: string
}

// ── Shared CSS for panel HTML ──
const panelCSS = `
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    .panel {
      width: 100%; height: 100%;
      padding: 48px;
      font-family: 'Inter', -apple-system, sans-serif;
      color: oklch(0.15 0.01 270);
      background: oklch(0.98 0.005 85);
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .serif { font-family: 'Fraunces', Georgia, serif; font-weight: 400; letter-spacing: -0.02em; }
    .mono { font-family: 'JetBrains Mono', monospace; }
    .muted { color: oklch(0.45 0.01 270); }
    .dim { color: oklch(0.65 0.005 270); }
    .accent { color: oklch(0.62 0.14 40); }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: oklch(0.45 0.01 270); margin-bottom: 8px; }
    .link { color: oklch(0.62 0.14 40); text-decoration: underline; text-decoration-color: oklch(0.62 0.14 40 / 0.3); text-underline-offset: 3px; }
    .stamp {
      display: inline-block;
      border: 2px solid oklch(0.62 0.14 40);
      color: oklch(0.62 0.14 40);
      padding: 4px 12px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      transform: rotate(-3deg);
      opacity: 0.8;
    }
    .redacted-line {
      display: inline-block;
      background: oklch(0.08 0.01 270);
      border-radius: 2px;
    }
  </style>
`

// ── Panel 0: Search (static, always present) ──
function searchPanelHTML(): string {
  return `${panelCSS}
  <div class="panel" style="align-items: center; text-align: center;">
    <div class="stamp" style="margin-bottom: 24px;">Blindspot // Classified</div>
    <h1 class="serif" style="font-size: 42px; margin-bottom: 12px;">Blindspot</h1>
    <p class="muted" style="font-size: 16px; margin-bottom: 40px;">Privacy-preserving onchain investigation</p>
    <p class="dim mono" style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;">Enter an ENS name to declassify</p>
  </div>`
}

// ── Redacted placeholder panels (shown on landing before investigation) ──
function redactedIdentityHTML(): string {
  return `${panelCSS}
  <div class="panel">
    <div class="label">Identity</div>
    <h2 class="serif" style="font-size: 36px; margin-bottom: 8px;">████████████</h2>
    <p class="mono muted" style="font-size: 13px; margin-bottom: 24px;">████████████████████████████████████████</p>
    <div style="display: flex; gap: 20px; font-size: 14px;">
      <div class="muted">████████████</div>
      <div class="muted">██████████</div>
    </div>
  </div>`
}

function redactedOnchainHTML(): string {
  return `${panelCSS}
  <div class="panel">
    <div class="label">Onchain Portfolio</div>
    <div style="display: flex; gap: 48px; margin-bottom: 32px;">
      <div>
        <div class="serif" style="font-size: 48px;">██████</div>
        <div class="muted" style="font-size: 13px; margin-top: 4px;">total value</div>
      </div>
      <div>
        <div class="serif" style="font-size: 48px;">████</div>
        <div class="muted" style="font-size: 13px; margin-top: 4px;">assets</div>
      </div>
      <div>
        <div class="serif" style="font-size: 48px;">██████</div>
        <div class="muted" style="font-size: 13px; margin-top: 4px;">realized PnL</div>
      </div>
    </div>
    <div style="font-size: 14px;">
      <div class="muted" style="margin-bottom: 6px;">████████████████████</div>
      <div class="muted" style="margin-bottom: 6px;">██████████████████</div>
      <div class="muted">████████████████</div>
    </div>
  </div>`
}

function redactedOffchainHTML(): string {
  return `${panelCSS}
  <div class="panel">
    <div class="label">Off-chain Context</div>
    <div style="margin-bottom: 24px;">
      <div class="muted" style="font-size: 14px; margin-bottom: 8px;">████████████████████████████</div>
      <div class="muted" style="font-size: 13px; margin-bottom: 20px;">████████████████████</div>
      <div class="muted" style="font-size: 14px; margin-bottom: 8px;">████████████████████████████</div>
      <div class="muted" style="font-size: 13px;">████████████████████</div>
    </div>
    <p class="mono dim" style="font-size: 11px;">fetched via ████████████ (██)</p>
  </div>`
}

function redactedVerdictHTML(): string {
  return `${panelCSS}
  <div class="panel" style="align-items: center; text-align: center;">
    <div class="label">Verdict</div>
    <div class="serif" style="font-size: 96px; color: oklch(0.65 0.005 270); line-height: 1; margin: 16px 0 8px;">██</div>
    <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; color: oklch(0.65 0.005 270); margin-bottom: 32px;">████████████</div>
    <p class="muted" style="font-size: 14px; max-width: 320px; margin-bottom: 16px;">████████████████████████████████████████████████████████</p>
    <p class="dim mono" style="font-size: 11px;">████████████████████████████████████████████</p>
  </div>`
}

// ── Panel 1: Identity ──
function identityPanelHTML(data: InvestigationData): string {
  const meta = []
  if (data.website) meta.push(`<span class="link">${data.website}</span>`)
  if (data.twitter) meta.push(`<span class="link">@${data.twitter.replace(/^@/, "")}</span>`)
  if (data.aliases.length > 0) meta.push(`<span class="muted">${data.aliases.join(", ")}</span>`)

  return `${panelCSS}
  <div class="panel">
    <div class="label">Identity</div>
    <h2 class="serif" style="font-size: 36px; margin-bottom: 8px;">${data.ensName}</h2>
    <p class="mono muted" style="font-size: 13px; margin-bottom: 24px;">${data.address}</p>
    ${meta.length > 0 ? `<div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 14px;">${meta.map((m) => `<div>${m}</div>`).join("")}</div>` : ""}
  </div>`
}

// ── Panel 2: Onchain ──
function onchainPanelHTML(data: InvestigationData): string {
  const holdingsRows = data.topHoldings
    .slice(0, 5)
    .map(
      (h) =>
        `<tr><td class="mono" style="padding: 4px 0;">${h.symbol}</td><td style="text-align: right; padding: 4px 0;">$${formatCompact(h.value)}</td><td class="muted" style="text-align: right; padding: 4px 0 4px 16px;">${h.percentage.toFixed(1)}%</td></tr>`,
    )
    .join("")

  return `${panelCSS}
  <div class="panel">
    <div class="label">Onchain Portfolio</div>
    <div style="display: flex; gap: 48px; margin-bottom: 32px;">
      <div>
        <div class="serif" style="font-size: 48px;">$${formatCompact(data.totalValueUSD)}</div>
        <div class="muted" style="font-size: 13px; margin-top: 4px;">total value</div>
      </div>
      <div>
        <div class="serif" style="font-size: 48px;">${data.assetCount}</div>
        <div class="muted" style="font-size: 13px; margin-top: 4px;">assets</div>
      </div>
      <div>
        <div class="serif ${data.realizedPnlUSD >= 0 ? "" : "accent"}" style="font-size: 48px;">${data.realizedPnlUSD >= 0 ? "+" : ""}$${formatCompact(data.realizedPnlUSD)}</div>
        <div class="muted" style="font-size: 13px; margin-top: 4px;">realized PnL</div>
      </div>
    </div>
    <table style="font-size: 14px; border-collapse: collapse; width: 280px;">
      <thead><tr><td class="label" style="padding-bottom: 8px;">Token</td><td class="label" style="text-align: right; padding-bottom: 8px;">Value</td><td class="label" style="text-align: right; padding-bottom: 8px; padding-left: 16px;">%</td></tr></thead>
      <tbody>${holdingsRows}</tbody>
    </table>
  </div>`
}

// ── Panel 3: Off-chain ──
function offchainPanelHTML(data: InvestigationData): string {
  const sources = data.offchainSources
    .slice(0, 3)
    .map(
      (s) =>
        `<div style="margin-bottom: 20px;">
          <div class="link" style="font-size: 14px; margin-bottom: 4px;">${s.url}</div>
          <div class="muted" style="font-size: 13px;">${s.title}</div>
        </div>`,
    )
    .join("")

  return `${panelCSS}
  <div class="panel">
    <div class="label">Off-chain Context</div>
    <div style="margin-bottom: 24px;">${sources}</div>
    <p class="mono dim" style="font-size: 11px;">fetched via ${data.egressIp} (${data.proxyCountry.toUpperCase()})</p>
  </div>`
}

// ── Panel 4: Verdict ──
function verdictPanelHTML(data: InvestigationData): string {
  const riskColor =
    data.riskScore >= 60
      ? "oklch(0.58 0.20 25)"
      : data.riskScore >= 30
        ? "oklch(0.68 0.14 75)"
        : "oklch(0.55 0.13 145)"

  return `${panelCSS}
  <div class="panel" style="align-items: center; text-align: center;">
    <div class="label">Verdict</div>
    <div class="serif" style="font-size: 96px; color: ${riskColor}; line-height: 1; margin: 16px 0 8px;">${data.riskScore}</div>
    <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; color: ${riskColor}; margin-bottom: 32px;">${data.riskLabel}</div>
    <p class="muted" style="font-size: 14px; max-width: 320px; margin-bottom: 16px;">${data.riskSummary}</p>
    <p class="dim mono" style="font-size: 11px;">${data.privacyVerdict}</p>
  </div>`
}

// ── Build a single textured plane with clip material ──
async function buildPlane(
  html: string,
  width: number,
  height: number,
  position: [number, number, number],
  clipDir: ClipDirection,
): Promise<PanelMesh> {
  const texture = await htmlToTexture(html, { width, height })
  const material = createClipMaterial({ map: texture, clipDirection: clipDir })
  const geo = new THREE.PlaneGeometry(width, height)
  const mesh = new THREE.Mesh(geo, material)
  mesh.position.set(...position)
  mesh.castShadow = true
  mesh.receiveShadow = true

  let revealTween: { kill: () => void } | null = null

  return {
    mesh,
    material,
    reveal: () => {
      revealTween?.kill()
      // Animate clipProgress 0 → 1
      const start = performance.now()
      const duration = 600
      const animate = () => {
        const elapsed = performance.now() - start
        const t = Math.min(elapsed / duration, 1)
        // ease-out cubic
        const eased = 1 - Math.pow(1 - t, 3)
        material.uniforms.clipProgress.value = eased
        if (t < 1) {
          const raf = requestAnimationFrame(animate)
          revealTween = { kill: () => cancelAnimationFrame(raf) }
        }
      }
      animate()
    },
    close: () => {
      revealTween?.kill()
      const start = performance.now()
      const duration = 300
      const startVal = material.uniforms.clipProgress.value
      const animate = () => {
        const elapsed = performance.now() - start
        const t = Math.min(elapsed / duration, 1)
        // ease-in for snappy close
        const eased = startVal * (1 - Math.pow(t, 2))
        material.uniforms.clipProgress.value = eased
        if (t < 1) {
          const raf = requestAnimationFrame(animate)
          revealTween = { kill: () => cancelAnimationFrame(raf) }
        }
      }
      animate()
    },
    dispose: () => {
      revealTween?.kill()
      geo.dispose()
      material.dispose()
      texture.dispose()
    },
  }
}

// ── Build all panels ──
export interface PanelSystem {
  group: THREE.Group
  panels: PanelMesh[][]
  chart: DonutChart | null
  redactions: RedactionGroup[]
  dispose: () => void
}

// Build redacted placeholder panels for the landing experience.
// These are visible on page load, before any investigation starts.
export async function buildRedactedPanels(): Promise<PanelSystem> {
  const group = new THREE.Group()
  const panels: PanelMesh[][] = []
  const redactions: RedactionGroup[] = []

  // Panel 0: Search (with classification stamp)
  const p0 = await buildPlane(searchPanelHTML(), 6, 4, [0, 0, PANEL_Z[0]], "right")
  group.add(p0.mesh)
  panels.push([p0])
  p0.reveal()

  // Panel 1: Identity (redacted)
  const p1 = await buildPlane(redactedIdentityHTML(), 6, 4, [2, 0, PANEL_Z[1]], "right")
  group.add(p1.mesh)
  panels.push([p1])
  p1.reveal()
  // Add redaction bars
  const r1 = createRedactionGroup([2, 0, PANEL_Z[1]], REDACTION_LAYOUTS[1])
  r1.bars.forEach((b) => group.add(b.mesh))
  redactions.push(r1)

  // Panel 2: Onchain (redacted)
  const p2 = await buildPlane(redactedOnchainHTML(), 6, 4, [-2, 0, PANEL_Z[2]], "up")
  group.add(p2.mesh)
  panels.push([p2])
  p2.reveal()
  const r2 = createRedactionGroup([-2, 0, PANEL_Z[2]], REDACTION_LAYOUTS[2])
  r2.bars.forEach((b) => group.add(b.mesh))
  redactions.push(r2)

  // Panel 3: Off-chain (redacted)
  const p3 = await buildPlane(redactedOffchainHTML(), 6, 4, [2, 0, PANEL_Z[3]], "right")
  group.add(p3.mesh)
  panels.push([p3])
  p3.reveal()
  const r3 = createRedactionGroup([2, 0, PANEL_Z[3]], REDACTION_LAYOUTS[3])
  r3.bars.forEach((b) => group.add(b.mesh))
  redactions.push(r3)

  // Panel 4: Verdict (redacted)
  const p4 = await buildPlane(redactedVerdictHTML(), 6, 4, [0, 0, PANEL_Z[4]], "center")
  group.add(p4.mesh)
  panels.push([p4])
  p4.reveal()
  const r4 = createRedactionGroup([0, 0, PANEL_Z[4]], REDACTION_LAYOUTS[4])
  r4.bars.forEach((b) => group.add(b.mesh))
  redactions.push(r4)

  function dispose() {
    panels.forEach((pp) => pp.forEach((p) => p.dispose()))
    redactions.forEach((r) => r.dispose())
  }

  return { group, panels, chart: null, redactions, dispose }
}

// Build panels with real investigation data (replaces redacted panels).
export async function buildPanels(data: InvestigationData): Promise<PanelSystem> {
  const group = new THREE.Group()
  const panels: PanelMesh[][] = []
  let chart: DonutChart | null = null
  const redactions: RedactionGroup[] = []

  // Panel 0: Search (static)
  const p0 = await buildPlane(searchPanelHTML(), 6, 4, [0, 0, PANEL_Z[0]], "right")
  group.add(p0.mesh)
  panels.push([p0])
  p0.reveal() // always visible

  // Panel 1: Identity
  const p1 = await buildPlane(identityPanelHTML(data), 6, 4, [2, 0, PANEL_Z[1]], "right")
  group.add(p1.mesh)
  panels.push([p1])

  // Panel 2: Onchain (numbers + chart + holdings)
  const p2Numbers = await buildPlane(onchainPanelHTML(data), 6, 4, [-2, 0, PANEL_Z[2]], "up")
  group.add(p2Numbers.mesh)
  const p2Planes = [p2Numbers]

  // 3D donut chart
  if (data.topHoldings.length > 0) {
    const chartColors = [
      "oklch(0.62 0.14 40)",
      "oklch(0.55 0.10 200)",
      "oklch(0.60 0.12 145)",
      "oklch(0.65 0.10 300)",
      "oklch(0.50 0.08 75)",
    ]
    const chartSegs: ChartSegment[] = data.topHoldings.slice(0, 5).map((h, i) => ({
      label: h.symbol,
      value: h.value,
      color: chartColors[i % chartColors.length],
    }))
    chart = createDonutChart({
      segments: chartSegs,
      position: [1.5, 0, PANEL_Z[2] + 1.5],
    })
    group.add(chart.group)
  }
  panels.push(p2Planes)

  // Panel 3: Off-chain
  const p3 = await buildPlane(offchainPanelHTML(data), 6, 4, [2, 0, PANEL_Z[3]], "right")
  group.add(p3.mesh)
  panels.push([p3])

  // Panel 4: Verdict
  const p4 = await buildPlane(verdictPanelHTML(data), 6, 4, [0, 0, PANEL_Z[4]], "center")
  group.add(p4.mesh)
  panels.push([p4])

  function dispose() {
    panels.forEach((pp) => pp.forEach((p) => p.dispose()))
    chart?.dispose()
    redactions.forEach((r) => r.dispose())
  }

  return { group, panels, chart, redactions, dispose }
}

function formatCompact(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + "M"
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + "K"
  return n.toFixed(0)
}
