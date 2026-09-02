// Camera curve path — a CatmullRomCurve3 that weaves through the 5 panels.
// Scroll progress (0→1) maps to a point on this curve, giving the camera
// a gentle left-right weave as it travels forward through Z.

import * as THREE from "three"

// Panel Z positions (from DESIGN.md)
export const PANEL_Z = [0, -20, -40, -60, -80]
export const PANEL_COUNT = 5
export const PANEL_SPACING = 20

// Curve control points — one stop per panel, held 5 units in front of it so
// the panel fills the frame at its active scroll position, with a gentle
// left-right weave between stops.
const curvePoints: THREE.Vector3[] = [
  new THREE.Vector3(0, 0, PANEL_Z[0] + 5), // Panel 0: Search
  new THREE.Vector3(2, 0, PANEL_Z[1] + 5), // Panel 1: Identity (right weave)
  new THREE.Vector3(-2, 0, PANEL_Z[2] + 5), // Panel 2: Onchain (left weave)
  new THREE.Vector3(2, 0, PANEL_Z[3] + 5), // Panel 3: Off-chain (right weave)
  new THREE.Vector3(0, 0, PANEL_Z[4] + 5), // Panel 4: Verdict
]

export const cameraCurve = new THREE.CatmullRomCurve3(curvePoints, false, "catmullrom", 0.5)

// Panel center positions (for camera lookAt)
export const panelCenters: THREE.Vector3[] = PANEL_Z.map((z, i) => {
  const x = i === 0 ? 0 : i === 1 ? 2 : i === 2 ? -2 : i === 3 ? 2 : 0
  return new THREE.Vector3(x, 0, z)
})

// Map scroll progress (0→1) to camera position on the curve.
// The curve has 6 segments (7 points). We map progress to the full curve.
export function getCameraPosition(progress: number): THREE.Vector3 {
  const t = Math.max(0, Math.min(1, progress))
  return cameraCurve.getPointAt(t)
}

// Get the panel center the camera should look at, based on progress.
// Each panel occupies 1/5 of the scroll range.
export function getLookAtTarget(progress: number): THREE.Vector3 {
  const t = Math.max(0, Math.min(1, progress))
  const panelFloat = t * (PANEL_COUNT - 1)
  const idx = Math.floor(panelFloat)
  const frac = panelFloat - idx

  if (idx >= PANEL_COUNT - 1) return panelCenters[PANEL_COUNT - 1]

  // Lerp between adjacent panel centers for smooth look-at transitions
  const a = panelCenters[idx]
  const b = panelCenters[idx + 1]
  return new THREE.Vector3().lerpVectors(a, b, frac)
}

// Get which panel index is currently "active" (closest to camera)
export function getActivePanel(progress: number): number {
  const t = Math.max(0, Math.min(1, progress))
  return Math.round(t * (PANEL_COUNT - 1))
}
