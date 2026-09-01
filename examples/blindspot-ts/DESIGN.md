---
version: 2
name: Blindspot
description: Privacy-preserving onchain investigation agent. A 3D dossier you scroll through.
product_thesis: "Open a dossier. See everything. Leave no trace."
engine: three.js
scroll: lenis
animation: gsap
colors:
  paper: oklch(0.98 0.005 85)
  paper-warm: oklch(0.96 0.008 75)
  ink: oklch(0.15 0.01 270)
  ink-muted: oklch(0.45 0.01 270)
  ink-dim: oklch(0.65 0.005 270)
  accent: oklch(0.62 0.14 40)
  accent-soft: oklch(0.62 0.14 40 / 0.08)
  risk-low: oklch(0.55 0.13 145)
  risk-moderate: oklch(0.68 0.14 75)
  risk-high: oklch(0.58 0.20 25)
  depth-fog: oklch(0.94 0.008 80)
typography:
  display:
    fontFamily: Fraunces
    fontWeight: 400
    letterSpacing: -0.02em
  body:
    fontFamily: Inter
    fontWeight: 400
    letterSpacing: -0.01em
  mono:
    fontFamily: JetBrains Mono
    fontWeight: 400
motion:
  ease-reveal: cubic-bezier(0.22, 1, 0.36, 1)
  ease-reverse: cubic-bezier(0.4, 0, 0.2, 1)
  ease-camera: cubic-bezier(0.25, 0.1, 0.25, 1)
  duration-reveal: 600ms
  duration-camera: scroll-driven
  stagger: 80ms
---

## Overview

Blindspot is a privacy-preserving onchain investigation agent. The interface
is a **3D dossier** — a sequence of panels floating in three-dimensional space
that you scroll through. Each panel reveals a layer of the target: identity,
onchain holdings, off-chain presence, risk. When the investigation ends, the
dossier closes and the scene fades. You were never there.

The experience is built on **Three.js** as a full 3D engine — not CSS
perspective tricks, not 2D parallax. Real camera movement through a 3D scene.
Real depth. Real lighting. HTML content is rendered to canvas textures and
projected onto 3D planes, giving the data physicality — it exists in space,
not on a flat page.

## Design Principles

### 1. The dossier is a physical space

The UI is not a page. It is a place. You enter it, move through it, and leave
it. Each panel of the dossier is a plane (or group of planes) positioned in
3D space. The camera travels between them as you scroll. This is the curve
gallery approach: scroll drives a camera along a path, and content comes into
view as you approach it.

### 2. Light, warm, editorial

The aesthetic is a well-lit archive. Warm paper-white background, ink-black
text, one terracotta accent. No dark mode. No surveillance aesthetic. No
glossy orbs. The feeling is closer to flipping through a beautifully designed
intelligence brief than staring at a hacker terminal. Delight comes from
craft, spatial depth, and smooth motion — not from darkness.

### 3. Real 3D, not faked

- Depth is real Z-positioning, not CSS `translateZ` hacks.
- Parallax is real camera movement, not `transform: scroll-percentage`.
- Lighting is real Three.js lights, not CSS box-shadows.
- Fog is real Three.js scene fog, not CSS gradients.
- The chart is a real 3D mesh, not a 2D SVG with a tilt transform.
- HTML-to-texture projection uses the SVG ForeignObject → Canvas →
  THREE.CanvasTexture pipeline (the three-html-to-canvas approach).

### 4. Scroll is the engine

Lenis provides smooth, momentum-based scrolling. Scroll position maps to
camera position along a spline path through the scene. GSAP ScrollTrigger
drives per-panel animations (clip reveals, plane rotations, text fades) as
the camera enters each panel's zone. The user never clicks "next" — they
scroll, and the world unfolds.

### 5. Ephemeral by default

The dossier opens, reveals its contents, and closes. When the investigation
ends, the final panel clips shut (the book closes), the scene fades to paper-
white, and the search bar reappears. No persistent state. No history. This
mirrors the architecture: ephemeral sandboxes, killed after use.

## The 3D Scene

### Scene setup

```
Scene
├── Camera (PerspectiveCamera, fov 50, travels along spline)
├── Lights
│   ├── AmbientLight (warm, low intensity — fills shadows)
│   ├── DirectionalLight (key light, from upper-left, casts soft shadows)
│   └── PointLight (accent, terracotta tint, follows camera for warmth)
├── Fog (paper-warm color, near = panel spacing * 0.5, far = panel spacing * 2)
├── Background (paper color)
└── PanelGroup (5 panels, each at increasing Z depth)
    ├── Panel 0: Search (Z = 0)
    ├── Panel 1: Identity (Z = -20)
    ├── Panel 2: Onchain (Z = -40)
    ├── Panel 3: Off-chain (Z = -60)
    └── Panel 4: Verdict (Z = -80)
```

### Camera path

The camera travels along a gentle curve — not a straight line. This is the
curve-gallery technique: a Blender-style curve path (implemented as a
THREE.CatmullRomCurve3) that weaves slightly left-right as it moves forward
through Z. This makes the journey feel like walking through a gallery, not
riding an elevator.

```
Camera path (viewed from above):

    Panel 0     Panel 1     Panel 2     Panel 3     Panel 4
      ●           ●           ●           ●           ●
       \         / \         / \         / \         /
        \--curve--/ \--curve--/ \--curve--/ \--curve--/
         (right)    (left)     (right)    (left)

    Z:    0        -20        -40        -60        -80
```

The curve offset is subtle — ±2 units on X. Enough to create a sense of
movement and let panels come into view from an angle, not dead-on.

Scroll progress (0 → 1) maps to curve.getPointAt(progress), which gives the
camera position. The camera always looks at the current panel's center.

### Panel construction

Each panel is a group of 3D planes. A plane is a `THREE.PlaneGeometry` with a
`THREE.MeshBasicMaterial` (or `MeshStandardMaterial` for lit panels) using a
`THREE.CanvasTexture` rendered from HTML via the SVG ForeignObject pipeline:

```
HTML string
  → SVG <foreignObject> wrapping the HTML
  → Image (loaded from the SVG data URI)
  → Canvas (drawn from the image)
  → THREE.CanvasTexture
  → THREE.Mesh with PlaneGeometry
```

This lets us design each panel in HTML/CSS (typography, layout, color) and
project it into 3D with real depth, lighting, and perspective.

### Panel detail

#### Panel 0 — The Search

The entry point. A single plane, centered, facing the camera.

Content:
- "BLINDSPOT" in Fraunces, large, ink color
- "Privacy-preserving onchain investigation" in Inter, smaller, ink-muted
- Search input (real HTML input, overlaid on the 3D canvas via CSS
  positioning — not projected to texture, because it needs to be interactive)
- Submit arrow button

The search input and button are **real DOM elements** positioned over the
canvas, not projected to texture. They sit at the panel's screen position.
When the user submits, the input fades out and the camera begins traveling
along the curve.

#### Panel 1 — Identity

Reveals the ENS resolution. Multiple planes at different depths:

- **Avatar plane** (Z offset +2 from panel): circular-cropped ENS avatar
  texture. Floats closer to camera. Parallax is real — it moves more as the
  camera approaches because it's physically closer.
- **Name plane** (Z offset 0): "vitalik.eth" in Fraunces, large
- **Address plane** (Z offset -0.5): "0xd8dA6BF2...96045" in JetBrains Mono,
  smaller, ink-muted
- **Metadata plane** (Z offset -1): website, twitter, github — each line in
  Inter, with a subtle terracotta underline for links

Reveal animation: as the camera enters the panel zone, each plane's material
clips in via a shader uniform that animates `clipPath` from `inset(0 100% 0 0)`
to `inset(0 0 0 0)`. The stagger is 80ms between planes. The avatar reveals
first, then the name, then the address, then the metadata. This is the
easeReverse clip technique — opening with `--ease-reveal`, and if the user
scrolls back, closing with `--ease-reverse` (snappier).

#### Panel 2 — Onchain

Reveals the Mobula data. The most visually rich panel.

- **Numbers plane** (Z offset 0): "$2.1M" and "14 assets" in Fraunces, very
  large. "+$340K realized PnL" below in Inter. These clip in from the bottom.
- **Chart mesh** (Z offset +1.5): a real 3D donut chart. Each segment is a
  `THREE.RingGeometry` sector extruded with `THREE.ExtrudeGeometry` to give
  it depth (like a 3D pie chart). Segments are colored by token. The chart
  rotates slowly as the camera passes — a 15-degree rotation tied to scroll
  progress through the panel zone. Hover (raycasting) highlights a segment
  and shows the token name as an overlaid HTML tooltip.
- **Holdings list plane** (Z offset -0.5): top 5 holdings as a compact table,
  projected to texture. Clips in after the numbers.

#### Panel 3 — Off-chain

Reveals the stealth browser enrichment. Image cards at different depths.

- **Screenshot planes** (Z offsets +3, +1.5, 0): up to 3 screenshots of the
  target's websites, each rendered as a textured plane. They're positioned
  at slightly different X offsets and Z depths, creating a scattered "pinned
  to a board" feeling. As the camera passes, each plane rotates slightly
  (±5 degrees on Y axis) — like looking at photos pinned at angles.
- **Metadata plane** (Z offset -1): URL, title, and "fetched via
  72.41.xx.xx (US)" for each source, in Inter and JetBrains Mono.

The screenshots are captured by the Solari stealth browser during the
investigation. They're real evidence, displayed as physical objects in space.

#### Panel 4 — The Verdict

The finale. Single large plane, centered.

- **Risk score**: "42" in Fraunces, very large (8rem equivalent), colored by
  risk level (terracotta for high, amber for moderate, green for low)
- **Risk label**: "MODERATE RISK" in Inter, uppercase, wide tracking, same
  color
- **Privacy verdict**: "sandbox destroyed · no trace · you were never here"
  in Inter, ink-muted
- **Buttons**: "Download report" and "New investigation" — real DOM elements
  overlaid on the canvas, like the search input

Reveal: the verdict plane clips in from center — `clip-path: inset(0 0 0 0)`
animating from `inset(50% 50% 50% 50%)` (a point) expanding outward. This
feels like the final stamp being placed on the dossier.

On "New investigation": the camera retraces the path back to Panel 0 (reverse
scroll animation, 800ms, `--ease-reverse`), all panels reset their clip
states, and the search input reappears.

## Scroll System

### Lenis configuration

```js
const lenis = new Lenis({
  lerp: 0.08,        // smooth, not instant
  duration: 1.2,     // momentum duration
  smoothWheel: true,
  smoothTouch: false, // touch uses native scroll
})
```

Lenis is proxied to GSAP ScrollTrigger via `ScrollTrigger.scrollerProxy()` so
all scroll-driven animations use the same smooth scroll position.

### Scroll-to-camera mapping

Total scroll length = 5 panels × 100vh = 500vh of scroll.

```
scrollProgress = lenis.scroll / (document.body.scrollHeight - window.innerHeight)

cameraPosition = cameraCurve.getPointAt(scrollProgress)
camera.lookAt(currentPanelCenter)
```

ScrollTrigger panels are set up at each 20% increment (0%, 20%, 40%, 60%,
80%). Each trigger fires the panel's reveal animations when the camera enters
its zone.

### Snap (optional)

Gentle snapping to each panel center after scroll settles. Not hard snapping
— a soft attraction that settles the camera on a panel if the user stops
scrolling near one. Implemented via Lenis `snap` option or a GSAP tween that
fires on `scrollEnd`.

## HTML-to-Texture Pipeline

The core technique that makes this work. Each panel's content is designed in
HTML/CSS, then projected into 3D.

### The pipeline

```
1. Build HTML string for the panel content
   (using template literals with the investigation data)

2. Wrap in SVG foreignObject:
   <svg xmlns="http://www.w3.org/2000/svg" width="W" height="H">
     <foreignObject width="100%" height="100%">
       <div xmlns="http://www.w3.org/1999/xhtml" style="...">
         ${panelHTML}
       </div>
     </foreignObject>
   </svg>

3. Serialize to data URI:
   const svgData = new XMLSerializer().serializeToString(svg)
   const dataURI = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData)

4. Load as Image:
   const img = new Image()
   img.src = dataURI
   await img.decode()

5. Draw to Canvas:
   const canvas = document.createElement('canvas')
   canvas.width = W * 2  // 2x for retina
   canvas.height = H * 2
   const ctx = canvas.getContext('2d')
   ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

6. Create Three.js texture:
   const texture = new THREE.CanvasTexture(canvas)
   texture.anisotropy = renderer.capabilities.getMaxAnisotropy()

7. Create mesh:
   const geometry = new THREE.PlaneGeometry(width, height)
   const material = new THREE.MeshBasicMaterial({
     map: texture, transparent: true, side: THREE.DoubleSide
   })
   const mesh = new THREE.Mesh(geometry, material)
   mesh.position.set(x, y, z)
```

### Texture resolution

Each panel texture is rendered at 2x resolution for sharpness on retina
displays. A typical panel is 800×600 CSS pixels → 1600×1200 canvas. With 5
panels and a few sub-planes each, total texture memory is ~20-30MB —
acceptable.

### Texture updates

Textures are created once per investigation (when the data arrives via SSE)
and disposed when the investigation resets. No per-frame texture updates
needed — the content is static once rendered. The only dynamic elements
(chart rotation, clip reveals) are done via mesh transforms and shader
uniforms, not texture re-rendering.

### Interactive elements

Real HTML inputs (search bar, buttons) are **not** projected to texture.
They are positioned as DOM overlays on top of the canvas, at the screen
position of their corresponding 3D plane. A `project3DToScreen()` function
converts the plane's 3D position to 2D screen coordinates each frame. This
keeps inputs fully interactive (focus, typing, click) while appearing to
exist in 3D space.

## Clip-Path Reveals in 3D

The easeReverse clip technique, adapted for 3D planes.

### Shader-based clipping

Each panel mesh uses a `ShaderMaterial` (extending MeshBasicMaterial) with a
custom `clipProgress` uniform:

```glsl
// Vertex shader: pass UV coordinates
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// Fragment shader: clip based on progress
uniform float clipProgress;  // 0 = fully clipped, 1 = fully visible
uniform sampler2D map;
varying vec2 vUv;

void main() {
  // Reveal from left to right: clip the right edge
  float clipEdge = 1.0 - clipProgress;
  if (vUv.x < clipEdge) discard;

  // Soft edge (2% feather)
  float feather = smoothstep(clipEdge, clipEdge + 0.02, vUv.x);

  vec4 tex = texture2D(map, vUv);
  gl_FragColor = vec4(tex.rgb, tex.a * feather);
}
```

### Animation

GSAP tweens the `clipProgress` uniform from 0 → 1 on reveal, and 1 → 0 on
close. Reveal uses `--ease-reveal` (600ms). Close uses `--ease-reverse`
(300ms — snappier, the easeReverse technique). Different clip directions per
panel:

| Panel | Clip direction | Detail |
|-------|---------------|--------|
| 1 — Identity | Left to right | `if (vUv.x < clipEdge) discard` |
| 2 — Onchain | Bottom to top | `if (vUv.y < clipEdge) discard` |
| 3 — Off-chain | Per-plane, varied | Each screenshot clips from a different direction |
| 4 — Verdict | Center outward | `if (distance(vUv, vec2(0.5)) > clipProgress * 0.71) discard` |

## The 3D Donut Chart

Panel 2's portfolio chart is a real 3D mesh, not a 2D projection.

### Construction

```
For each token in top 5 holdings:
  1. Calculate segment angle: (tokenValue / totalValue) * Math.PI * 2
  2. Create RingGeometry sector:
     const geo = new THREE.RingGeometry(innerRadius, outerRadius, 32, 1,
                                        startAngle, segmentAngle)
  3. Extrude for depth:
     const extruded = new THREE.ExtrudeGeometry(geo.shape, { depth: 0.3, bevelEnabled: false })
  4. Color by token (distinct hues, all in the warm palette)
  5. Position at panel center, rotated to face camera
```

### Interaction

Raycasting on mouse move: if the ray intersects a segment mesh, highlight it
(scale up slightly, brighten color) and show an HTML tooltip overlay with the
token name and value. This is real 3D picking, not 2D hit detection.

### Rotation

The chart group rotates ±7.5 degrees on Y axis, tied to scroll progress
through Panel 2's zone. As you scroll past, the chart turns slightly, showing
its 3D depth. Not a continuous spin — a subtle turn that reveals the
extrusion.

## Lighting

### Lights

- **AmbientLight**: `color: 0xfff5e6, intensity: 0.6` — warm fill, prevents
  pure black shadows
- **DirectionalLight**: `color: 0xffffff, intensity: 0.8, position: (-5, 8, 5)`
  — key light from upper-left. `castShadow: true` with a soft shadow map
  (2048×2048, PCFSoftShadowMap)
- **PointLight**: `color: 0xd4663a (terracotta), intensity: 0.3, distance: 15`
  — follows the camera position, offset slightly. Adds warmth to nearby
  panels. This is what makes the paper feel warm, not clinical.

### Shadows

Panels cast soft shadows onto an invisible floor plane below them. The
shadow grounds the floating panels in space — without it, they look like
cutouts. Shadow opacity is low (0.15) — subtle, not dramatic.

### Fog

`THREE.Fog(paper-warm, near, far)` where near = 8 (just beyond the current
panel) and far = 25 (two panels ahead). This creates depth fading — distant
panels are slightly washed out, current panel is crisp. The fog color matches
the background, so distant panels dissolve into the paper rather than into
darkness.

## Colors

- **Paper** is the background and the base surface of all panels. Warm, not
  white. Think museum archive paper, not printer paper.
- **Ink** is the primary text color. High contrast on paper (14:1).
- **Ink-muted** is for secondary text (addresses, metadata). 6:1 contrast.
- **Ink-dim** is for the most subtle text (phase labels, hints). 3:1 —
  decorative, not essential.
- **Accent** (terracotta) is the only color besides ink. Used for:
  - Interactive element focus (search bar border, button hover)
  - Risk score color (when moderate or high)
  - Link underlines in panel content
  - The PointLight tint (warmth in the scene)
- **Risk colors** appear only in Panel 4 (the verdict). Green for low risk,
  amber for moderate, terracotta-red for high. They do not appear earlier —
  showing risk colors before the verdict would prejudice the reading.

### Do not
- Use pure white (`#fff`). Paper has warmth.
- Use dark mode. This is a light, editorial experience.
- Use gradients on UI elements. The only gradient is the fog falloff.
- Use more than one accent color. Terracotta is the only accent.
- Use risk colors during investigation phases.

## Typography

- **Fraunces** (serif) for display: the wordmark, panel headings, risk score,
  large numbers. Optical sizing enabled — looks good at all sizes.
- **Inter** (sans) for body: metadata, descriptions, buttons, status text.
- **JetBrains Mono** for technical identifiers: addresses, sandbox IDs,
  egress IPs, token contracts.

### Scale (in CSS pixels, before 2x texture rendering)

| Use | Font | Size | Weight | Tracking |
|-----|------|------|--------|----------|
| Wordmark | Fraunces | 2.5rem | 400 | -0.02em |
| Panel heading | Fraunces | 2rem | 400 | -0.02em |
| Risk score | Fraunces | 8rem | 400 | -0.04em |
| Large numbers | Fraunces | 3.5rem | 400 | -0.03em |
| Body text | Inter | 1rem | 400 | -0.01em |
| Metadata | Inter | 0.875rem | 400 | -0.01em |
| Links | Inter | 0.875rem | 400 | -0.01em |
| Mono identifiers | JetBrains Mono | 0.75rem | 400 | 0 |
| Button text | Inter | 0.875rem | 500 | 0 |

## Motion

### Easing

| Token | Curve | Use |
|-------|-------|-----|
| `--ease-reveal` | `cubic-bezier(0.22, 1, 0.36, 1)` | Clip reveals (opening) |
| `--ease-reverse` | `cubic-bezier(0.4, 0, 0.2, 1)` | Clip closes (snappy, on scroll back) |
| `--ease-camera` | `cubic-bezier(0.25, 0.1, 0.25, 1)` | Camera reset on "new investigation" |

### Duration

| Token | Value | Use |
|-------|-------|-----|
| `--duration-reveal` | 600ms | Panel content clip reveals |
| `--duration-close` | 300ms | Panel clip closes (easeReverse — faster than open) |
| `--duration-camera-reset` | 800ms | Camera returns to Panel 0 |
| `--stagger` | 80ms | Between sub-planes within a panel |

### Rules

1. **Camera movement is scroll-driven, not duration-based.** The camera
   position is a function of scroll progress. No GSAP tween on the camera
   during normal scrolling — only on "new investigation" reset.

2. **Clip reveals use GSAP tweens on shader uniforms.** `clipProgress`
   animates 0 → 1 with `--ease-reveal` at 600ms. On scroll-back, 1 → 0 with
   `--ease-reverse` at 300ms. The asymmetry is the easeReverse technique:
   opening is deliberate, closing is snappy.

3. **Stagger between sub-planes.** Within a panel, planes reveal in sequence
   with 80ms delay each. Avatar → name → address → metadata. This creates a
   cascade that feels like the dossier page being assembled.

4. **Chart rotation is scroll-driven.** The donut chart's Y rotation is
   mapped to scroll progress through Panel 2's zone. No tween — it's a
   direct function of scroll position. Scroll forward, it turns right.
   Scroll back, it turns left. Always in sync with the user.

5. **Screenshot planes tilt on scroll.** Each screenshot's Y rotation is
   mapped to scroll progress with a per-plane offset. They tilt at different
   rates, creating a parallax-within-parallax effect. This is real 3D
   rotation, not CSS transform.

6. **No infinite animations.** No breathing, no pulsing, no idle loops. The
   scene is still unless the user scrolls. Motion is a response to user
   input, not ambient decoration. This is the opposite of the orb design —
   the scene doesn't perform for you, you perform through it.

7. **Respect `prefers-reduced-motion`.** If set: disable Lenis smooth scroll
   (use native), skip clip reveals (show panels instantly), skip chart
   rotation, skip screenshot tilts. Camera still moves through the scene
   (that's the core experience) but without supplementary animations.

## Dependencies

| Library | Version | Source | Size | Purpose |
|---------|---------|--------|------|---------|
| Three.js | ^0.170 | npm | ~600KB | 3D engine: scene, camera, meshes, lighting, fog, raycasting |
| Lenis | ^1.1 | npm | ~8KB | Smooth momentum scrolling |
| GSAP | ^3.12 | npm | ~50KB | ScrollTrigger, clip uniform tweens, camera reset |
| Fraunces | — | Google Fonts | — | Display serif |
| Inter | — | Google Fonts | — | Body sans |
| JetBrains Mono | — | Google Fonts | — | Technical identifiers |

All loaded via npm (not CDN) for reliable, version-pinned builds. Three.js
is imported as a module: `import * as THREE from 'three'`.

## Performance

- **Texture budget**: ~30MB total (5 panels × ~6MB each at 2x resolution).
  Created once per investigation, disposed on reset.
- **Geometry**: ~50 meshes total (panels + sub-planes + chart segments).
  Negligible draw calls.
- **Shadows**: 2048×2048 shadow map, PCFSoft. One directional light only.
- **Fog**: eliminates overdraw on distant panels (they're fogged out, not
  rendered in detail).
- **Frame rate**: target 60fps. The scene is simple — no particles, no
  post-processing, no complex shaders. If frame drops occur, reduce shadow
  map to 1024×1024 and disable shadows on sub-planes.
- **Texture disposal**: on "new investigation", all textures and geometries
  are disposed via `texture.dispose()` and `geometry.dispose()` to prevent
  GPU memory leaks across multiple investigations.

## Accessibility

- **Focus states**: search input and buttons (real DOM overlays) have
  visible terracotta focus rings.
- **Keyboard**: Enter submits search. Tab moves between interactive
  elements. Escape resets to a new investigation.
- **Reduced motion**: disable smooth scroll, clip animations, chart
  rotation, screenshot tilts. Camera still travels through the scene.
- **Touch devices**: Lenis `smoothTouch: false` — native touch scroll. Hover
  effects (chart segment highlight) disabled.
- **Contrast**: ink on paper is 14:1 (AAA). Ink-muted on paper is 6:1 (AA+).
  Accent on paper is 4.5:1 (AA). All essential content meets AA.
- **Screen readers**: the 3D canvas is `aria-hidden`. The downloadable HTML
  report is the accessible version of the content. The live UI is a visual
  experience; the report is the information.

## Do's and Don'ts

### Do
- Use Three.js for all 3D — real scene, real camera, real depth.
- Project HTML to canvas textures for panel content.
- Use Lenis for smooth scroll, proxied to GSAP ScrollTrigger.
- Use shader uniforms for clip-path reveals on 3D planes.
- Keep the palette warm and editorial — paper, ink, terracotta.
- Dispose textures and geometries on investigation reset.
- Gate hover effects behind `@media (hover: hover) and (pointer: fine)`.
- Respect `prefers-reduced-motion`.

### Don't
- Use CSS perspective or `translateZ` to fake 3D.
- Use dark mode or a dark palette.
- Use the orb, breathing animations, or any infinite loops.
- Use more than one accent color.
- Use risk colors before Panel 4.
- Use pure white (`#fff`) — paper has warmth.
- Use a framework (React, Vue, etc.) — vanilla JS + Three.js + GSAP.
- Animate anything other than transform, opacity, and shader uniforms.
- Forget to dispose GPU resources on reset.
