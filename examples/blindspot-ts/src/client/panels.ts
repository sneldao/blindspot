// Panel system — the declassification dossier.
//
// Each panel is a document that declassifies as the camera approaches.
// The core primitive: content texture underneath, redaction shader on top.
// As proximity (camera distance) increases, the ink dissolves in patches,
// revealing the content beneath. Sequential layers declassify in order.
//
// The panel also lifts slightly as you approach (Obys' tactile response),
// and the content warms in brightness (like leaning into a document in low light).
//
// Panel 0 (Search): no redaction — the cover page
// Panel 1 (Identity): name → address → metadata (sequential declassification)
// Panel 2 (Onchain): numbers → chart → holdings
// Panel 3 (Off-chain): screenshots hidden under redaction covers
// Panel 4 (Verdict): risk score is the final declassification

import * as THREE from "three"
import { htmlToTexture } from "./texture.js"
import { createContentMaterial } from "./redaction-material.js"
import { createRedactionMaterial } from "./redaction-material.js"
import { createDonutChart, type DonutChart, type ChartSegment } from "./chart.js"
import { PANEL_Z } from "./camera-curve.js"

export interface PanelMesh {
  mesh: THREE.Mesh
  contentMaterial: THREE.ShaderMaterial
  redactionMaterials: THREE.ShaderMaterial[]
  basePosition: THREE.Vector3
  setProximity: (p: number, time: number) => void
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
// Panels carry their own warm paper background — the scene around them is dark,
// so the panels glow like lit documents in a dim archive.
const panelCSS = `
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    .panel {
      width: 100%; height: 100%;
      padding: 48px;
      font-family: 'Inter', -apple-system, sans-serif;
      color: oklch(0.15 0.01 270);
      background: oklch(0.96 0.008 80);
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
    .classified { font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: oklch(0.45 0.01 270); font-weight: 600; }
  </style>
`

// ── Panel 0: Search (no redaction — the cover page) ──
function searchPanelHTML(): string {
  return `${panelCSS}
  <div class="panel" style="align-items: center; text-align: center;">
    <div class="classified" style="margin-bottom: 24px; opacity: 0.5;">— Blindspot —</div>
    <h1 class="serif" style="font-size: 42px; margin-bottom: 12px;">Blindspot</h1>
    <p class="muted" style="font-size: 16px; margin-bottom: 40px;">Privacy-preserving onchain investigation</p>
    <p class="dim" style="font-size: 13px;">Enter an ENS name to begin</p>
  </div>`
}

// ── Panel 1: Identity ──
// Three layers: name (threshold 0.0), address (threshold 0.2), metadata (threshold 0.4)
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

// ── Build a declassification panel ──
// A panel is a group containing:
//   - content plane (the actual data texture)
//   - one or more redaction planes (ink layers at different thresholds)
//
// The redaction planes are slightly offset in Z above the content.
// Each redaction plane covers a vertical band of the panel (or the whole panel)
// and dissolves at its specified threshold.
type RedactionLayer = {
  // Vertical band this layer covers (0=top, 1=bottom). Default: full panel.
  yStart?: number
  yEnd?: number
  // Proximity at which this layer starts dissolving
  threshold: number
  // How wide the dissolution range is
  dissolveRange?: number
  // Noise scale for the ink texture
  noiseScale?: number
}

type PanelSpec = {
  html: string
  width: number
  height: number
  position: [number, number, number]
  // If no redaction layers, the panel is always visible (Panel 0)
  redactionLayers?: RedactionLayer[]
}

async function buildDeclassificationPanel(spec: PanelSpec): Promise<PanelMesh> {
  const { width, height, position } = spec
  const basePosition = new THREE.Vector3(...position)

  // Content texture
  const texture = await htmlToTexture(spec.html, { width, height })
  const contentMaterial = createContentMaterial({ map: texture })
  const contentGeo = new THREE.PlaneGeometry(width, height)
  const contentMesh = new THREE.Mesh(contentGeo, contentMaterial)
  contentMesh.position.set(0, 0, 0)
  contentMesh.castShadow = true
  contentMesh.receiveShadow = true

  // Redaction layers
  const redactionMaterials: THREE.ShaderMaterial[] = []
  const redactionMeshes: THREE.Mesh[] = []

  if (spec.redactionLayers) {
    for (const layer of spec.redactionLayers) {
      const yStart = layer.yStart ?? 0
      const yEnd = layer.yEnd ?? 1
      // Sub-plane geometry covering just the band
      const bandHeight = height * (yEnd - yStart)
      const bandY = height * (0.5 - (yStart + yEnd) / 2) // center of band relative to panel center

      const redMat = createRedactionMaterial({
        layerThreshold: layer.threshold,
        dissolveRange: layer.dissolveRange ?? 0.2,
        noiseScale: layer.noiseScale ?? 6.0,
      })
      redactionMaterials.push(redMat)

      const redGeo = new THREE.PlaneGeometry(width + 0.1, bandHeight + 0.1)
      const redMesh = new THREE.Mesh(redGeo, redMat)
      redMesh.position.set(0, bandY, 0.02) // slightly above content
      redactionMeshes.push(redMesh)
    }
  }

  // Group everything
  const group = new THREE.Group()
  group.add(contentMesh)
  for (const m of redactionMeshes) group.add(m)
  group.position.copy(basePosition)

  let revealProgress = 0 // animated externally by proximity

  return {
    mesh: group as unknown as THREE.Mesh, // group acts as the panel's transform root
    contentMaterial,
    redactionMaterials,
    basePosition,
    setProximity: (p: number, time: number) => {
      revealProgress = p
      contentMaterial.uniforms.proximity.value = p
      for (const rm of redactionMaterials) {
        rm.uniforms.proximity.value = p
        rm.uniforms.time.value = time
      }
      // Lift effect: panel rises up to 0.15 units as proximity increases
      group.position.y = basePosition.y + p * 0.15
    },
    reveal: () => {
      // Proximity-based reveal is driven externally; this is a fallback
      // for panels that should be immediately visible (Panel 0)
      contentMaterial.uniforms.proximity.value = 1
      for (const rm of redactionMaterials) {
        rm.uniforms.proximity.value = 1
      }
      group.position.y = basePosition.y + 0.15
    },
    close: () => {
      contentMaterial.uniforms.proximity.value = 0
      for (const rm of redactionMaterials) {
        rm.uniforms.proximity.value = 0
      }
      group.position.y = basePosition.y
    },
    dispose: () => {
      contentGeo.dispose()
      contentMaterial.dispose()
      texture.dispose()
      for (let i = 0; i < redactionMeshes.length; i++) {
        redactionMeshes[i].geometry.dispose()
        redactionMaterials[i].dispose()
      }
    },
  }
}

// ── Build all panels ──
export interface PanelSystem {
  group: THREE.Group
  panels: PanelMesh[][]
  chart: DonutChart | null
  dispose: () => void
}

export async function buildPanels(data: InvestigationData): Promise<PanelSystem> {
  const group = new THREE.Group()
  const panels: PanelMesh[][] = []
  let chart: DonutChart | null = null

  // Panel 0: Search — no redaction, always visible
  const p0 = await buildDeclassificationPanel({
    html: searchPanelHTML(),
    width: 6,
    height: 4,
    position: [0, 0, PANEL_Z[0]],
    // No redaction layers — cover page
  })
  group.add(p0.mesh)
  panels.push([p0])
  p0.reveal()

  // Panel 1: Identity — three sequential declassification layers
  // Name (top third): threshold 0.0 — reveals first
  // Address (middle): threshold 0.2 — reveals second
  // Metadata (bottom): threshold 0.4 — reveals last
  const p1 = await buildDeclassificationPanel({
    html: identityPanelHTML(data),
    width: 6,
    height: 4,
    position: [2, 0, PANEL_Z[1]],
    redactionLayers: [
      { yStart: 0.0, yEnd: 0.35, threshold: 0.0, dissolveRange: 0.2, noiseScale: 5.0 },
      { yStart: 0.35, yEnd: 0.55, threshold: 0.2, dissolveRange: 0.2, noiseScale: 7.0 },
      { yStart: 0.55, yEnd: 1.0, threshold: 0.4, dissolveRange: 0.2, noiseScale: 6.0 },
    ],
  })
  group.add(p1.mesh)
  panels.push([p1])

  // Panel 2: Onchain — numbers first, then holdings table
  const p2 = await buildDeclassificationPanel({
    html: onchainPanelHTML(data),
    width: 6,
    height: 4,
    position: [-2, 0, PANEL_Z[2]],
    redactionLayers: [
      { yStart: 0.0, yEnd: 0.45, threshold: 0.0, dissolveRange: 0.2, noiseScale: 5.0 },
      { yStart: 0.45, yEnd: 1.0, threshold: 0.25, dissolveRange: 0.2, noiseScale: 8.0 },
    ],
  })
  group.add(p2.mesh)
  const p2Planes = [p2]

  // 3D donut chart — declassifies with the numbers
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

  // Panel 3: Off-chain — evidence hidden under redaction
  const p3 = await buildDeclassificationPanel({
    html: offchainPanelHTML(data),
    width: 6,
    height: 4,
    position: [2, 0, PANEL_Z[3]],
    redactionLayers: [
      { yStart: 0.0, yEnd: 0.7, threshold: 0.05, dissolveRange: 0.25, noiseScale: 6.0 },
      { yStart: 0.7, yEnd: 1.0, threshold: 0.35, dissolveRange: 0.2, noiseScale: 9.0 },
    ],
  })
  group.add(p3.mesh)
  panels.push([p3])

  // Panel 4: Verdict — the final declassification
  // The risk score is the last thing revealed — like a stamp being uncovered
  const p4 = await buildDeclassificationPanel({
    html: verdictPanelHTML(data),
    width: 6,
    height: 4,
    position: [0, 0, PANEL_Z[4]],
    redactionLayers: [
      // Label and summary first
      { yStart: 0.0, yEnd: 0.15, threshold: 0.0, dissolveRange: 0.2, noiseScale: 5.0 },
      { yStart: 0.15, yEnd: 0.5, threshold: 0.3, dissolveRange: 0.2, noiseScale: 4.0 },
      // Privacy verdict + metadata last
      { yStart: 0.5, yEnd: 1.0, threshold: 0.5, dissolveRange: 0.25, noiseScale: 7.0 },
    ],
  })
  group.add(p4.mesh)
  panels.push([p4])

  function dispose() {
    panels.forEach((pp) => pp.forEach((p) => p.dispose()))
    chart?.dispose()
  }

  return { group, panels, chart, dispose }
}

function formatCompact(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + "M"
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + "K"
  return n.toFixed(0)
}
