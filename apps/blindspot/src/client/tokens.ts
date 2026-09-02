// Design tokens for the WebGL side of the scene.
//
// The CSS side (Layout.astro, panel HTML) uses oklch() directly because the
// browser parses it natively. THREE.Color does NOT understand oklch() — it
// silently falls back to white — so the WebGL side needs the same tokens
// pre-converted to sRGB hex. These values are compiled from the oklch()
// tokens in DESIGN.md; keep both sides in sync.

export const TOKENS = {
  // oklch(0.98 0.005 85)
  paper: "#faf8f5",
  // oklch(0.94 0.008 80)
  fog: "#eeebe5",
  // oklch(0.15 0.01 270)
  ink: "#090b0f",
  // oklch(0.62 0.14 40)
  accent: "#cb6440",
  // Chart segment hues, in token order
  chart: [
    "#cb6440", // oklch(0.62 0.14 40)  terracotta
    "#008388", // oklch(0.55 0.10 200) teal
    "#4d9351", // oklch(0.60 0.12 145) green
    "#9981c3", // oklch(0.65 0.10 300) violet
    "#7e5c2a", // oklch(0.50 0.08 75)  ochre
  ],
} as const
