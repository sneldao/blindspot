// Client entry point — wires the 3D scene, scroll system, SSE events,
// and DOM overlays into the full Blindspot experience.
//
// This is the bundled JS that runs in the browser.

import * as THREE from "three"
import { createScene } from "./scene.js"
import { createScrollSystem } from "./scroll.js"
import { getCameraPosition, getLookAtTarget, getActivePanel, PANEL_COUNT } from "./camera-curve.js"
import { buildPanels, type PanelSystem, type InvestigationData } from "./panels.js"
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
let pointer = new THREE.Vector2(-10, -10) // off-screen initially
let hoveredSegment: THREE.Mesh | null = null

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
  const progress = scrollSystem.getProgress()

  // Camera position from curve
  const camPos = getCameraPosition(progress)
  ctx.camera.position.copy(camPos)

  // Camera look-at
  const lookTarget = getLookAtTarget(progress)
  ctx.camera.lookAt(lookTarget)

  // Point light follows camera
  ctx.pointLight.position.copy(ctx.camera.position)
  ctx.pointLight.position.x += 2
  ctx.pointLight.position.y += 1

  // Chart rotation (scroll-driven, Panel 2 zone: progress 0.3-0.5)
  if (panelSystem?.chart) {
    const chartProgress = THREE.MathUtils.clamp((progress - 0.3) / 0.2, 0, 1)
    panelSystem.chart.group.rotation.z = (chartProgress - 0.5) * (Math.PI / 12) // ±7.5 degrees
  }

  // Chart hover (raycasting)
  if (panelSystem?.chart && getActivePanel(progress) === 2) {
    const hit = pickChartSegment(raycaster, pointer, ctx.camera, panelSystem.chart)
    if (hit !== hoveredSegment) {
      // Reset previous
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
      // Update tooltip position to projected screen coords
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

// ── Pointer tracking for raycasting ──
window.addEventListener("pointermove", (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
})

// ── Start investigation ──
async function startInvestigation(name: string) {
  searchOverlay.style.opacity = "0"
  searchOverlay.style.pointerEvents = "none"
  loadingText.style.opacity = "1"
  errorText.style.opacity = "0"

  // Collect SSE events into data
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
        loadingText.textContent = "resolving identity..."
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
        loadingText.textContent = "fetching onchain data..."
        break

      case "offchain:data":
        loadingText.textContent = "enriching off-chain context..."
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

        await loadPanels(data as InvestigationData)
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

// ── Load panels into the scene ──
async function loadPanels(data: InvestigationData) {
  // Dispose old panels if any
  if (panelSystem) {
    ctx.scene.remove(panelSystem.group)
    panelSystem.dispose()
  }

  loadingText.style.opacity = "0"

  // Reset scroll to top
  scrollSystem.scrollToTop()
  revealedPanels.clear()

  // Build new panels
  panelSystem = await buildPanels(data)
  ctx.scene.add(panelSystem.group)

  // Reveal panel 0 immediately
  revealedPanels.add(0)
  panelSystem.panels[0]?.forEach((p) => p.reveal())

  // Show verdict overlay buttons when user reaches Panel 4
  // (handled by scroll progress check in render loop via a watcher)
  const checkVerdict = setInterval(() => {
    if (getActivePanel(scrollSystem.getProgress()) === 4) {
      verdictOverlay.style.opacity = "1"
      verdictOverlay.style.pointerEvents = "auto"
      clearInterval(checkVerdict)
    }
  }, 200)
}

// ── Reset for new investigation ──
function reset() {
  if (panelSystem) {
    ctx.scene.remove(panelSystem.group)
    panelSystem.dispose()
    panelSystem = null
  }
  revealedPanels.clear()
  scrollSystem.scrollToTop()
  verdictOverlay.style.opacity = "0"
  verdictOverlay.style.pointerEvents = "none"
  errorText.style.opacity = "0"
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

newBtn.addEventListener("click", reset)

downloadBtn.addEventListener("click", () => {
  if (reportPath) {
    window.open("/report?path=" + encodeURIComponent(reportPath), "_blank")
  }
})

// Escape key resets
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && panelSystem) reset()
})

// ── Start render loop ──
render()
searchInput.focus()

// ── Helpers ──
function formatCompact(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + "M"
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + "K"
  return n.toFixed(0)
}
