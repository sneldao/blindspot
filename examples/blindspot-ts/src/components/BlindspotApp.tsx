// BlindspotApp — the main React island.
//
// Manages the investigation lifecycle (search → SSE events → data → verdict)
// and renders the Three.js canvas + DOM overlays.
// The 3D engine modules (scene, panels, shaders, scroll, camera) stay as
// vanilla TS — React just owns the container and the state.

import { useEffect, useRef, useState, useCallback } from "react"
import * as THREE from "three"
import { createScene, type SceneContext } from "../client/scene.js"
import { createScrollSystem, type ScrollSystem } from "../client/scroll.js"
import {
  getCameraPosition,
  getLookAtTarget,
  getActivePanel,
  panelCenters,
} from "../client/camera-curve.js"
import { buildPanels, type PanelSystem, type InvestigationData } from "../client/panels.js"
import { pickChartSegment } from "../client/chart.js"

type Phase = "search" | "loading" | "investigating" | "verdict" | "error"

export default function BlindspotApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<SceneContext | null>(null)
  const scrollRef = useRef<ScrollSystem | null>(null)
  const panelSystemRef = useRef<PanelSystem | null>(null)
  const raycasterRef = useRef(new THREE.Raycaster())
  const pointerRef = useRef(new THREE.Vector2(-10, -10))
  const hoveredRef = useRef<THREE.Mesh | null>(null)
  const clockRef = useRef(new THREE.Clock())

  const [phase, setPhase] = useState<Phase>("search")
  const [loadingText, setLoadingText] = useState("connecting...")
  const [errorText, setErrorText] = useState("")
  const [reportPath, setReportPath] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)

  // ── Init Three.js scene + render loop ──
  useEffect(() => {
    if (!canvasRef.current) return

    const ctx = createScene(canvasRef.current)
    ctxRef.current = ctx

    const scrollSystem = createScrollSystem(() => {})
    scrollRef.current = scrollSystem

    // Render loop
    let rafId = 0

    function render() {
      const progress = scrollSystem.getProgress()
      const time = clockRef.current.getElapsedTime()

      // Camera
      const camPos = getCameraPosition(progress)
      ctx.camera.position.copy(camPos)
      const lookTarget = getLookAtTarget(progress)
      ctx.camera.lookAt(lookTarget)

      // Point light follows camera
      ctx.pointLight.position.copy(ctx.camera.position)
      ctx.pointLight.position.x += 2
      ctx.pointLight.position.y += 1

      // Proximity-based declassification
      const panelSystem = panelSystemRef.current
      if (panelSystem) {
        for (let i = 0; i < panelSystem.panels.length; i++) {
          const pc = panelCenters[i]
          if (!pc) continue
          const dist = camPos.distanceTo(pc)
          const proximity = dist <= 3 ? 1 : dist >= 12 ? 0 : 1 - (dist - 3) / 9
          for (const plane of panelSystem.panels[i]) {
            plane.setProximity(proximity, time)
          }
        }

        // Chart rotation
        if (panelSystem.chart) {
          const chartProgress = THREE.MathUtils.clamp((progress - 0.3) / 0.2, 0, 1)
          panelSystem.chart.group.rotation.z = (chartProgress - 0.5) * (Math.PI / 12)
        }

        // Chart hover
        if (getActivePanel(progress) === 2 && panelSystem.chart) {
          const hit = pickChartSegment(
            raycasterRef.current,
            pointerRef.current,
            ctx.camera,
            panelSystem.chart,
          )
          if (hit !== hoveredRef.current) {
            if (hoveredRef.current) {
              const mat = hoveredRef.current.material as THREE.MeshStandardMaterial
              mat.color.set((hoveredRef.current.userData as { originalColor: string }).originalColor)
              hoveredRef.current.scale.setScalar(1)
            }
            hoveredRef.current = hit
            if (hit) {
              const mat = hit.material as THREE.MeshStandardMaterial
              mat.color.setScalar(1.3)
              hit.scale.setScalar(1.05)
              const worldPos = new THREE.Vector3()
              hit.getWorldPosition(worldPos)
              worldPos.project(ctx.camera)
              const x = (worldPos.x * 0.5 + 0.5) * window.innerWidth
              const y = (-worldPos.y * 0.5 + 0.5) * window.innerHeight
              setTooltip({
                text: `${hit.userData.label}: $${formatCompact(hit.userData.value as number)}`,
                x: x + 20,
                y: y - 10,
              })
            } else {
              setTooltip(null)
            }
          }
          if (hoveredRef.current && tooltip) {
            const worldPos = new THREE.Vector3()
            hoveredRef.current.getWorldPosition(worldPos)
            worldPos.project(ctx.camera)
            const x = (worldPos.x * 0.5 + 0.5) * window.innerWidth
            const y = (-worldPos.y * 0.5 + 0.5) * window.innerHeight
            setTooltip({ text: tooltip.text, x: x + 20, y: y - 10 })
          }
        } else if (hoveredRef.current) {
          const mat = hoveredRef.current.material as THREE.MeshStandardMaterial
          mat.color.set((hoveredRef.current.userData as { originalColor: string }).originalColor)
          hoveredRef.current.scale.setScalar(1)
          hoveredRef.current = null
          setTooltip(null)
        }
      }

      ctx.renderer.render(ctx.scene, ctx.camera)
      rafId = requestAnimationFrame(render)
    }
    render()

    // Pointer tracking
    function onPointerMove(e: PointerEvent) {
      pointerRef.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointerRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener("pointermove", onPointerMove)

    // Escape key resets
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape" && panelSystemRef.current) {
        reset()
      }
    }
    window.addEventListener("keydown", onKeydown)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("keydown", onKeydown)
      scrollSystem.dispose()
      ctx.dispose()
    }
  }, [])

  // ── Start investigation ──
  const startInvestigation = useCallback(async (name: string) => {
    setPhase("loading")
    setErrorText("")

    const data: Partial<InvestigationData> = {
      ensName: name,
      topHoldings: [],
      offchainSources: [],
    }

    const url = `/api/investigate?name=${encodeURIComponent(name)}`
    const eventSource = new EventSource(url)

    eventSource.onmessage = async (e) => {
      const event = JSON.parse(e.data)

      switch (event.type) {
        case "ens:resolved":
          data.address = event.address
          data.aliases = event.aliases || []
          data.website = event.website
          data.twitter = event.twitter
          setLoadingText("resolving identity...")
          break

        case "sandbox:booted":
          setLoadingText("spawning ephemeral sandbox...")
          break

        case "browser:connected":
          if (event.egressIp && event.egressIp !== "detecting...") {
            data.egressIp = event.egressIp
            data.proxyCountry = event.proxyCountry
          }
          setLoadingText("connecting residential proxy...")
          break

        case "mobula:data":
          data.totalValueUSD = event.totalValueUSD
          data.assetCount = event.assetCount
          data.realizedPnlUSD = event.realizedPnlUSD
          setLoadingText("fetching onchain data...")
          break

        case "offchain:data":
          setLoadingText("enriching off-chain context...")
          break

        case "analyzing":
          setLoadingText("analyzing risk...")
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
          setReportPath(r.reportPath)

          // Fill defaults
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
          setErrorText(event.message)
          setPhase("error")
          break
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
    }
  }, [])

  // ── Load panels into the scene ──
  async function loadPanels(data: InvestigationData) {
    const ctx = ctxRef.current
    if (!ctx) return

    // Dispose old panels
    if (panelSystemRef.current) {
      ctx.scene.remove(panelSystemRef.current.group)
      panelSystemRef.current.dispose()
    }

    setLoadingText("")
    setPhase("investigating")

    // Reset scroll
    scrollRef.current?.scrollToTop()

    // Build new panels
    const ps = await buildPanels(data)
    ctx.scene.add(ps.group)
    panelSystemRef.current = ps

    // Panel 0 always visible
    ps.panels[0]?.forEach((p) => p.reveal())

    // Check for verdict panel
    const checkVerdict = setInterval(() => {
      if (getActivePanel(scrollRef.current!.getProgress()) === 4) {
        setPhase("verdict")
        clearInterval(checkVerdict)
      }
    }, 200)
  }

  // ── Reset ──
  function reset() {
    const ctx = ctxRef.current
    if (ctx && panelSystemRef.current) {
      ctx.scene.remove(panelSystemRef.current.group)
      panelSystemRef.current.dispose()
      panelSystemRef.current = null
    }
    scrollRef.current?.scrollToTop()
    setPhase("search")
    setErrorText("")
    setReportPath(null)
  }

  // ── Submit handler ──
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const input = (e.target as HTMLFormElement).querySelector("input") as HTMLInputElement
    const name = input.value.trim()
    if (!name) return
    startInvestigation(name)
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 0,
        }}
      />

      {/* Search overlay */}
      {phase === "search" && (
        <div
          className="overlay"
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.5rem",
          }}
        >
          <h1
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: "2.5rem",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              color: "var(--paper)",
            }}
          >
            Blindspot
          </h1>
          <p style={{ fontSize: "1rem", color: "oklch(0.65 0.01 60)" }}>
            Privacy-preserving onchain investigation
          </p>
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "1rem" }}
          >
            <input
              type="text"
              placeholder="Enter an ENS name"
              autoComplete="off"
              spellCheck="false"
              autoCapitalize="off"
              autoFocus
              style={{
                width: 320,
                padding: "0.75rem 1rem",
                border: "1px solid oklch(0.30 0.01 60)",
                borderRadius: 8,
                background: "oklch(0.16 0.008 60)",
                color: "var(--paper)",
                fontFamily: "inherit",
                fontSize: "1rem",
                outline: "none",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "0.75rem 1.25rem",
                border: "1px solid oklch(0.30 0.01 60)",
                borderRadius: 8,
                background: "transparent",
                color: "var(--paper)",
                fontFamily: "inherit",
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              →
            </button>
          </form>
        </div>
      )}

      {/* Loading text */}
      {phase === "loading" && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 10,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.875rem",
            color: "var(--accent)",
          }}
        >
          {loadingText}
        </div>
      )}

      {/* Error text */}
      {phase === "error" && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 10,
            fontSize: "0.875rem",
            color: "oklch(0.58 0.20 25)",
            maxWidth: 400,
            textAlign: "center",
          }}
        >
          {errorText}
          <button
            onClick={reset}
            style={{
              display: "block",
              margin: "1rem auto 0",
              padding: "0.5rem 1rem",
              border: "1px solid oklch(0.30 0.01 60)",
              borderRadius: 8,
              background: "transparent",
              color: "var(--paper)",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Verdict buttons */}
      {phase === "verdict" && (
        <div
          style={{
            position: "fixed",
            bottom: "3rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            display: "flex",
            gap: "0.75rem",
          }}
        >
          <button
            onClick={() => {
              if (reportPath) {
                window.open("/api/report?path=" + encodeURIComponent(reportPath), "_blank")
              }
            }}
            style={verdictBtnStyle}
          >
            Download report
          </button>
          <button onClick={reset} style={verdictBtnStyle}>
            New investigation
          </button>
        </div>
      )}

      {/* Chart tooltip */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            zIndex: 20,
            left: tooltip.x,
            top: tooltip.y,
            background: "var(--ink)",
            color: "var(--paper)",
            padding: "0.375rem 0.625rem",
            borderRadius: 6,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.75rem",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {tooltip.text}
        </div>
      )}
    </>
  )
}

const verdictBtnStyle: React.CSSProperties = {
  padding: "0.625rem 1.25rem",
  border: "1px solid oklch(0.30 0.01 60)",
  borderRadius: 8,
  background: "oklch(0.16 0.008 60)",
  color: "var(--paper)",
  fontFamily: "inherit",
  fontSize: "0.875rem",
  cursor: "pointer",
}

function formatCompact(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + "M"
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + "K"
  return n.toFixed(0)
}
