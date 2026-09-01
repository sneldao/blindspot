// Redaction bar system — black planes positioned slightly in front of
// text planes, representing redacted content. On investigation phase
// completion, bars slide laterally and fade away, revealing the data
// underneath.
//
// The bars are real 3D objects at z+0.1, casting real shadows on the
// text below. Mouse parallax makes the depth between secret and veil
// visible.

import * as THREE from "three"

export interface RedactionBar {
  mesh: THREE.Mesh
  revealed: boolean
  reveal: () => void
  dispose: () => void
}

export interface RedactionGroup {
  bars: RedactionBar[]
  revealAll: () => void
  dispose: () => void
}

// Create a single redaction bar at a position relative to a panel.
// The bar is a thin black plane, slightly in front of the text plane.
export function createRedactionBar(
  width: number,
  height: number,
  position: [number, number, number],
): RedactionBar {
  const geo = new THREE.PlaneGeometry(width, height)
  const mat = new THREE.MeshBasicMaterial({
    color: 0x0a0a0a,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(...position)
  mesh.castShadow = true

  // Store original position for animation
  const originalX = position[0]
  let animId = 0

  function reveal() {
    if (animId) cancelAnimationFrame(animId)
    const start = performance.now()
    const duration = 600
    const startX = mesh.position.x
    const targetX = originalX + width + 1 // slide right off the text
    const startOpacity = mat.opacity

    function animate() {
      const elapsed = performance.now() - start
      const t = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      mesh.position.x = startX + (targetX - startX) * eased
      mat.opacity = startOpacity * (1 - eased)
      if (t < 1) {
        animId = requestAnimationFrame(animate)
      } else {
        mesh.visible = false
      }
    }
    animate()
  }

  function dispose() {
    if (animId) cancelAnimationFrame(animId)
    geo.dispose()
    mat.dispose()
  }

  return { mesh, revealed: false, reveal, dispose }
}

// Create a set of redaction bars for a panel.
// Positions are relative to the panel center.
// Each bar covers a "line" of text.
export function createRedactionGroup(
  panelCenter: [number, number, number],
  barConfigs: { width: number; height: number; yOffset: number }[],
): RedactionGroup {
  const bars: RedactionBar[] = []
  const [cx, cy, cz] = panelCenter

  for (const cfg of barConfigs) {
    const bar = createRedactionBar(cfg.width, cfg.height, [
      cx,
      cy + cfg.yOffset,
      cz + 0.1, // slightly in front of the text plane
    ])
    bars.push(bar)
  }

  function revealAll() {
    bars.forEach((b, i) => {
      if (!b.revealed) {
        b.revealed = true
        setTimeout(() => b.reveal(), i * 80) // 80ms stagger
      }
    })
  }

  function dispose() {
    bars.forEach((b) => b.dispose())
  }

  return { bars, revealAll, dispose }
}

// Standard redaction layouts per panel.
// Each config describes bars covering the "interesting" parts of each panel.
export const REDACTION_LAYOUTS: Record<
  number,
  { width: number; height: number; yOffset: number }[]
> = {
  // Panel 1: Identity — cover name, address, metadata
  1: [
    { width: 3.5, height: 0.5, yOffset: 0.3 },
    { width: 4.5, height: 0.3, yOffset: -0.2 },
    { width: 3.0, height: 0.3, yOffset: -0.7 },
  ],
  // Panel 2: Onchain — cover numbers and holdings
  2: [
    { width: 2.0, height: 0.6, yOffset: 0.8 },
    { width: 1.5, height: 0.6, yOffset: 0.8, },
    { width: 2.5, height: 0.4, yOffset: 0.1 },
    { width: 3.0, height: 0.3, yOffset: -0.4 },
    { width: 2.5, height: 0.3, yOffset: -0.8 },
  ],
  // Panel 3: Off-chain — cover source URLs and titles
  3: [
    { width: 4.0, height: 0.3, yOffset: 0.5 },
    { width: 3.0, height: 0.3, yOffset: 0.1 },
    { width: 3.5, height: 0.3, yOffset: -0.3 },
    { width: 2.5, height: 0.2, yOffset: -0.8 },
  ],
  // Panel 4: Verdict — cover the risk score and label
  4: [
    { width: 2.0, height: 1.2, yOffset: 0.5 },
    { width: 3.0, height: 0.4, yOffset: -0.5 },
    { width: 4.0, height: 0.3, yOffset: -1.0 },
  ],
}
