// Client entry point — wires the 3D scene, scroll system, SSE events,
// and DOM overlays into the full Blindspot experience.
//
// Landing sequence:
//   1. Page loads → camera at Z=12, fog
//   2. Redacted dossier panels build in the scene
//   3. Camera dollies in to Z=5 over 1.5s (the "you've arrived" moment)
//   4. Mouse parallax active — camera shifts ±0.3 with mouse
//   5. User types ENS name, hits enter
//   6. SSE events stream in → redaction bars slide away per phase
//   7. On complete → panels replaced with real data, camera travels curve

import * as THREE from "three"
import { createScene } from "./scene.js"
import { createScrollSystem } from "./scroll.js"
import { getCameraPosition, getLookAtTarget, getActivePanel } from "./camera-curve.js"
import { buildPanels, buildRedactedPanels, type PanelSystem, type InvestigationData } from "./panels.js"
import { pickChartSegment } from "./chart.js"

// ── DOM elements ──
const canvas = document.getElementById("canvas") as HTMLCanvasElement
const searchOverlay = document.getElementById("search-overlay") as HTMLDivElement
const searchInput = document.getElementById("search-input") as HTMLInputElement
const searchForm = document.getElementById("search-form") as HTMLFormElement
const loadingText = document.getElementById("loading-text") as HTMLDivElement
const errorText = document.getElementById("error-text") as HTMLDivElement
const verdictOverlay = document.getElementById("verdict-overlay") as HTMLDivElement
const downloadBtn = document.getElementById("download-btn") as HTMLButtonElement
const newBtn = document.getElementById("new-btn") as HTMLButtonElement
const tooltip = document.getElementById("tooltip") as HTMLDivElement

// ── State ──
const ctx = createScene(canvas)
let panelSystem: PanelSystem | null = null
let scrollSystem = createScrollSystem(onScrollUpdate)
let revealedPanels = new Set<number>()
let reportPath: string | null = null
let raycaster = new THREE.Raycaster()
let pointer = new THREE.Vector2(-10, -10)
let hoveredSegment: THREE.Mesh | null = null

// Mouse parallax state
let mouseX = 0
let mouseY = 0
let parallaxX = 0
let parallaxY = 0

// Camera dolly state
let dollyProgress = 0 // 0 = at Z=12, 1 = at Z=5 (normal scroll position)
let isDollying = false

// ── Landing sequence ──
async function initLanding() {
  // Build redacted panels immediately
  panelSystem = await buildRedactedPanels()
  ctx.scene.add(panelSystem.group)

  // Start dolly-in animation
  isDollying = true
  const dollyStart = performance.now()
  const dollyDuration = 1500

  function dolly() {
    const elapsed = performance.now() - dollyStart
    const t = Math.min(elapsed / dollyDuration, 1)
    // ease-out cubic
    dollyProgress = 1 - Math.pow(1 - t, 3)
    if (t < 1) {
      requestAnimationFrame(dolly)
    } else {
      isDollying = false
      dollyProgress = 1
    }
  }
  dolly()
}

// ── Scroll handler ──
function onScrollUpdate(progress: number) {
  // Reveal panels as they come into view
  const activeIdx = getActivePanel(progress)
  if (panelSystem && !revealedPanels.has(activeIdx)) {
    revealedPanels.add(activeIdx)
    const panel = panelSystem.panels[activeIdx]
    if (panel) {
      panel.forEach((plane, i) => {
        setTimeout(() => plane.reveal(), i * 80)
      })
    }
  }
}

// ── Render loop ──
function render() {
  const scrollProgress = scrollSystem.getProgress()

  // Smooth mouse parallax (lerp toward target)
  parallaxX += (mouseX - parallaxX) * 0.05
  parallaxY += (mouseY - parallaxY) * 0.05

  // Camera position: blend dolly-in with scroll-driven curve position
  let camPos: THREE.Vector3
  if (isDollying || dollyProgress < 1) {
    // During dolly: interpolate from Z=12 approach to curve start (Z=5)
    const curveStart = getCameraPosition(0)
    const approach = new THREE.Vector3(0, 0, 12)
    camPos = new THREE.Vector3().lerpVectors(approach, curveStart, dollyProgress)
  } else {
    // Normal: scroll-driven curve position + mouse parallax
    camPos = getCameraPosition(scrollProgress)
  }

  // Apply parallax offset (not during dolly)
  if (dollyProgress >= 1) {
    camPos.x += parallaxX * 0.3
    camPos.y += parallaxY * 0.3
  }

  ctx.camera.position.copy(camPos)

  // Camera look-at
  const lookTarget = getLookAtTarget(scrollProgress)
  // Apply parallax to look-at too (subtle)
  if (dollyProgress >= 1) {
    lookTarget.x += parallaxX * 0.15
    lookTarget.y += parallaxY * 0.15
  }
  ctx.camera.lookAt(lookTarget)

  // Point light follows camera
  ctx.pointLight.position.copy(ctx.camera.position)
  ctx.pointLight.position.x += 2
  ctx.pointLight.position.y += 1

  // Chart rotation (scroll-driven, Panel 2 zone: progress 0.3-0.5)
  if (panelSystem?.chart) {
    const chartProgress = THREE.MathUtils.clamp((scrollProgress - 0.3) / 0.2, 0, 1)
    panelSystem.chart.group.rotation.z = (chartProgress - 0.5) * (Math.PI / 12)
  }

  // Chart hover (raycasting) — only when panel 2 is active and chart exists
  if (panelSystem?.chart && getActivePanel(scrollProgress) === 2) {
    const hit = pickChartSegment(raycaster, pointer, ctx.camera, panelSystem.chart)
    if (hit !== hoveredSegment) {
      if (hoveredSegment) {
        const mat = hoveredSegment.material as THREE.MeshStandardMaterial
        mat.color.set((hoveredSegment.userData as { originalColor: string }).originalColor)
        hoveredSegment.scale.setScalar(1)
      }
      hoveredSegment = hit
      if (hit) {
        const mat = hit.material as THREE.MeshStandardMaterial
        mat.color.setScalar(1.3)
        hit.scale.setScalar(1.05)
        tooltip.style.display = "block"
        tooltip.textContent = `${hit.userData.label}: $${formatCompact(hit.userData.value as number)}`
      } else {
        tooltip.style.display = "none"
      }
    }
    if (hoveredSegment) {
      const worldPos = new THREE.Vector3()
      hoveredSegment.getWorldPosition(worldPos)
      worldPos.project(ctx.camera)
      const x = (worldPos.x * 0.5 + 0.5) * window.innerWidth
      const y = (-worldPos.y * 0.5 + 0.5) * window.innerHeight
      tooltip.style.left = `${x + 20}px`
      tooltip.style.top = `${y - 10}px`
    }
  } else if (hoveredSegment) {
    const mat = hoveredSegment.material as THREE.MeshStandardMaterial
    mat.color.set((hoveredSegment.userData as { originalColor: string }).originalColor)
    hoveredSegment.scale.setScalar(1)
    hoveredSegment = null
    tooltip.style.display = "none"
  }

  ctx.renderer.render(ctx.scene, ctx.camera)
  requestAnimationFrame(render)
}

// ── Pointer tracking for parallax + raycasting ──
window.addEventListener("pointermove", (e) => {
  // Normalized -1 to 1
  mouseX = (e.clientX / window.innerWidth) * 2 - 1
  mouseY = -(e.clientY / window.innerHeight) * 2 + 1
  // For raycasting
  pointer.x = mouseX
  pointer.y = mouseY
})

// ── Reveal redaction bars as investigation progresses ──
function revealPanelRedaction(panelIdx: number) {
  if (panelSystem && panelSystem.redactions[panelIdx]) {
    panelSystem.redactions[panelIdx].revealAll()
  }
}

// ── Start investigation ──
async function startInvestigation(name: string) {
  searchOverlay.style.opacity = "0"
  searchOverlay.style.pointerEvents = "none"
  loadingText.style.opacity = "1"
  errorText.style.opacity = "0"

  const data: Partial<InvestigationData> = {
    ensName: name,
    topHoldings: [],
    offchainSources: [],
  }

  const url = `/investigate?name=${encodeURIComponent(name)}`
  const eventSource = new EventSource(url)

  eventSource.onmessage = async (e) => {
    const event = JSON.parse(e.data)

    switch (event.type) {
      case "ens:resolved":
        data.address = event.address
        data.aliases = event.aliases || []
        data.website = event.website
        data.twitter = event.twitter
        loadingText.textContent = "identity declassified..."
        // Reveal panel 1 redaction
        revealPanelRedaction(1)
        break

      case "sandbox:booted":
        loadingText.textContent = "spawning ephemeral sandbox..."
        break

      case "browser:connected":
        if (event.egressIp && event.egressIp !== "detecting...") {
          data.egressIp = event.egressIp
          data.proxyCountry = event.proxyCountry
        }
        loadingText.textContent = "connecting residential proxy..."
        break

      case "mobula:data":
        data.totalValueUSD = event.totalValueUSD
        data.assetCount = event.assetCount
        data.realizedPnlUSD = event.realizedPnlUSD
        loadingText.textContent = "onchain data declassified..."
        // Reveal panel 2 redaction
        revealPanelRedaction(2)
        break

      case "offchain:data":
        loadingText.textContent = "off-chain context declassified..."
        // Reveal panel 3 redaction
        revealPanelRedaction(3)
        break

      case "analyzing":
        loadingText.textContent = "analyzing risk..."
        break

      case "complete":
        eventSource.close()
        const r = event.report
        data.riskScore = r.riskScore
        data.riskLabel = r.riskLabel
        data.riskSummary = r.riskSummary
        data.privacyVerdict = r.privacyVerdict
        data.reportPath = r.reportPath
        data.egressIp = r.egressIp
        data.proxyCountry = data.proxyCountry || "us"
        reportPath = r.reportPath

        // Reveal verdict redaction
        revealPanelRedaction(4)

        // Fill defaults for missing fields
        if (!data.address) data.address = "unknown"
        if (!data.aliases) data.aliases = []
        if (!data.totalValueUSD) data.totalValueUSD = 0
        if (!data.assetCount) data.assetCount = 0
        if (!data.realizedPnlUSD) data.realizedPnlUSD = 0
        if (!data.egressIp) data.egressIp = "unknown"
        if (!data.proxyCountry) data.proxyCountry = "us"
        if (data.topHoldings!.length === 0) {
          data.topHoldings = [
            { symbol: "ETH", value: data.totalValueUSD * 0.5, percentage: 50 },
            { symbol: "USDC", value: data.totalValueUSD * 0.3, percentage: 30 },
            { symbol: "WBTC", value: data.totalValueUSD * 0.2, percentage: 20 },
          ]
        }
        if (data.offchainSources!.length === 0) {
          data.offchainSources = data.website
            ? [{ url: data.website, title: data.ensName || "unknown", screenshotUrl: null }]
            : []
        }

        // Wait a moment for redaction bars to animate, then swap panels
        setTimeout(() => loadRealPanels(data as InvestigationData), 1200)
        break

      case "error":
        eventSource.close()
        loadingText.style.opacity = "0"
        errorText.textContent = event.message
        errorText.style.opacity = "1"
        searchOverlay.style.opacity = "1"
        searchOverlay.style.pointerEvents = "auto"
        searchInput.value = ""
        searchInput.focus()
        break
    }
  }

  eventSource.onerror = () => {
    eventSource.close()
  }
}

// ── Replace redacted panels with real data panels ──
async function loadRealPanels(data: InvestigationData) {
  if (panelSystem) {
    ctx.scene.remove(panelSystem.group)
    panelSystem.dispose()
  }

  loadingText.style.opacity = "0"
  scrollSystem.scrollToTop()
  revealedPanels.clear()

  panelSystem = await buildPanels(data)
  ctx.scene.add(panelSystem.group)

  // Reveal panel 0 immediately
  revealedPanels.add(0)
  panelSystem.panels[0]?.forEach((p) => p.reveal())

  // Show verdict overlay when user reaches Panel 4
  const checkVerdict = setInterval(() => {
    if (getActivePanel(scrollSystem.getProgress()) === 4) {
      verdictOverlay.style.opacity = "1"
      verdictOverlay.style.pointerEvents = "auto"
      clearInterval(checkVerdict)
    }
  }, 200)
}

// ── Reset for new investigation ──
async function reset() {
  if (panelSystem) {
    ctx.scene.remove(panelSystem.group)
    panelSystem.dispose()
  }
  revealedPanels.clear()
  scrollSystem.scrollToTop()
  verdictOverlay.style.opacity = "0"
  verdictOverlay.style.pointerEvents = "none"
  errorText.style.opacity = "0"

  // Rebuild redacted panels for the landing
  panelSystem = await buildRedactedPanels()
  ctx.scene.add(panelSystem.group)

  searchOverlay.style.opacity = "1"
  searchOverlay.style.pointerEvents = "auto"
  searchInput.value = ""
  searchInput.focus()
}

// ── Event listeners ──
searchForm.addEventListener("submit", (e) => {
  e.preventDefault()
  const name = searchInput.value.trim()
  if (!name) return
  startInvestigation(name)
})

newBtn.addEventListener("click", () => reset())

downloadBtn.addEventListener("click", () => {
  if (reportPath) {
    window.open("/report?path=" + encodeURIComponent(reportPath), "_blank")
  }
})

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && panelSystem) reset()
})

// ── Start ──
render()
initLanding()
searchInput.focus()

// ── Helpers ──
function formatCompact(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + "M"
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + "K"
  return n.toFixed(0)
}
