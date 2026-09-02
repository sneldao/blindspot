// Redaction shader — the core UI primitive for Blindspot.
//
// A document that declassifies as you approach. The content texture sits
// underneath; a redaction layer sits on top (slightly offset in Z). The
// redaction layer is a shader that renders ink-like noise that dissolves
// based on a `proximity` uniform (0 = fully redacted, 1 = fully revealed).
//
// The dissolution is organic — ink recedes in patches using domain-warped
// noise, not a clean wipe. Edges glow warm (terracotta) as they dissolve.
//
// Multiple content layers can declassify sequentially via `layerThreshold`:
// each layer has its own proximity threshold, so the name reveals before
// the address, the address before the metadata, etc.
//
// The scene is a lit paper archive, so the content plane renders at full
// fidelity and distance falloff is left entirely to scene fog — dimming the
// content in-shader (as the old dark-archive version did) muddies panels
// against a light background.

import * as THREE from "three"
import { TOKENS } from "./tokens.js"

// ── Noise functions (GLSL) ──
// Simplex-like noise via hash + interpolation. Cheap, good enough for ink.
const noiseGLSL = /* glsl */ `
  // Hash-based value noise
  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
          dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
      mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
          dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  // Fractal Brownian Motion — layered noise for organic texture
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  // Domain-warped fbm — makes the ink look irregular, not grid-like
  float warpedNoise(vec2 p) {
    vec2 q = vec2(fbm(p + vec2(0.0, 0.0)),
                   fbm(p + vec2(5.2, 1.3)));
    vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2)),
                   fbm(p + 4.0 * q + vec2(8.3, 2.8)));
    return fbm(p + 4.0 * r);
  }
`

// ── Content material ──
// Renders the panel content texture at full fidelity.
const contentVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const contentFragmentShader = /* glsl */ `
  uniform sampler2D map;
  varying vec2 vUv;

  void main() {
    vec4 tex = texture2D(map, vUv);
    gl_FragColor = vec4(tex.rgb, tex.a);
  }
`

export interface ContentMaterialOptions {
  map: THREE.Texture
}

export function createContentMaterial(opts: ContentMaterialOptions) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: opts.map },
    },
    vertexShader: contentVertexShader,
    fragmentShader: contentFragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
  })
}

// ── Redaction material ──
// The ink layer that sits above the content. Dissolves based on proximity.
// Uses domain-warped noise for organic ink recession.
//
// layerThreshold: the proximity value at which this layer starts dissolving.
//   0.0 = dissolves immediately (first layer to reveal)
//   0.3 = dissolves after the first layer is mostly gone
//   0.6 = dissolves late (last layer to reveal)
// dissolveRange: how much proximity range the dissolution takes (default 0.25)
const redactionVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const redactionFragmentShader = /* glsl */ `
  uniform float proximity;
  uniform float layerThreshold;
  uniform float dissolveRange;
  uniform float time;
  uniform vec3 inkColor;
  uniform vec3 glowColor;
  uniform float noiseScale;
  varying vec2 vUv;

  ${noiseGLSL}

  void main() {
    // How far into the dissolution is this layer? (0 = fully redacted, 1 = fully gone)
    float dissolveProgress = clamp((proximity - layerThreshold) / dissolveRange, 0.0, 1.0);

    if (dissolveProgress >= 1.0) {
      // Fully dissolved — nothing to render
      discard;
    }

    if (dissolveProgress <= 0.0) {
      // Fully redacted — solid ink with subtle texture
      float n = warpedNoise(vUv * noiseScale + time * 0.03);
      float inkDensity = 0.92 + 0.08 * n;
      gl_FragColor = vec4(inkColor * inkDensity, 0.96);
      return;
    }

    // Dissolving — organic recession using warped noise
    // The noise creates patches that clear at different rates
    vec2 noiseUv = vUv * noiseScale;
    float n = warpedNoise(noiseUv + time * 0.05);

    // Threshold the noise against dissolveProgress to create irregular edges
    // Higher noise values dissolve first, creating a patchy recession
    float inkMask = 1.0 - smoothstep(dissolveProgress - 0.15, dissolveProgress + 0.05, n + 0.5);

    if (inkMask <= 0.01) {
      // This fragment has dissolved away — but render a faint glow at the edge
      float edgeGlow = smoothstep(dissolveProgress - 0.15, dissolveProgress, n + 0.5);
      float glowIntensity = edgeGlow * (1.0 - dissolveProgress) * 0.3;
      gl_FragColor = vec4(glowColor, glowIntensity);
      return;
    }

    // Still ink — but with warm glow at the dissolving edge
    float edgeProximity = smoothstep(dissolveProgress - 0.2, dissolveProgress, n + 0.5);
    vec3 color = mix(inkColor, glowColor, edgeProximity * 0.4);
    float alpha = inkMask * 0.96;

    // Add glow at edges
    float glow = edgeProximity * (1.0 - dissolveProgress) * 0.5;
    color += glowColor * glow;

    gl_FragColor = vec4(color, alpha);
  }
`

export interface RedactionMaterialOptions {
  layerThreshold?: number
  dissolveRange?: number
  inkColor?: THREE.Color
  glowColor?: THREE.Color
  noiseScale?: number
}

export function createRedactionMaterial(
  opts: RedactionMaterialOptions = {},
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      proximity: { value: 0 },
      layerThreshold: { value: opts.layerThreshold ?? 0 },
      dissolveRange: { value: opts.dissolveRange ?? 0.25 },
      time: { value: 0 },
      inkColor: { value: opts.inkColor ?? new THREE.Color(TOKENS.ink) },
      glowColor: { value: opts.glowColor ?? new THREE.Color(TOKENS.accent) },
      noiseScale: { value: opts.noiseScale ?? 8.0 },
    },
    vertexShader: redactionVertexShader,
    fragmentShader: redactionFragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
}
