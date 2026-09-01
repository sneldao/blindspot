// Clip-path shader material for 3D plane reveals.
// Extends MeshBasicMaterial with a clipProgress uniform that discards
// fragments based on direction, creating a wipe reveal effect.
//
// Directions:
//   "right"  — reveal left-to-right (clip from right edge)
//   "up"     — reveal bottom-to-top (clip from bottom edge)
//   "center" — reveal from center outward (radial)

import * as THREE from "three"

export type ClipDirection = "right" | "up" | "center"

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float clipProgress;
  uniform sampler2D map;
  uniform int clipDir; // 0=right, 1=up, 2=center
  varying vec2 vUv;

  void main() {
    float visible = 0.0;
    float feather = 0.02;

    if (clipDir == 0) {
      // Right: reveal from left, clip right edge
      float edge = 1.0 - clipProgress;
      if (vUv.x < edge) discard;
      visible = smoothstep(edge, edge + feather, vUv.x);
    } else if (clipDir == 1) {
      // Up: reveal from bottom, clip top edge
      float edge = 1.0 - clipProgress;
      if (vUv.y < edge) discard;
      visible = smoothstep(edge, edge + feather, vUv.y);
    } else {
      // Center: radial reveal
      float dist = distance(vUv, vec2(0.5));
      float maxDist = 0.71; // diagonal half
      float radius = clipProgress * maxDist;
      if (dist > radius) discard;
      visible = smoothstep(radius, radius - feather, dist);
    }

    vec4 tex = texture2D(map, vUv);
    gl_FragColor = vec4(tex.rgb, tex.a * visible);
  }
`

export interface ClipMaterialOptions {
  map?: THREE.Texture
  clipDirection?: ClipDirection
}

export function createClipMaterial(opts: ClipMaterialOptions = {}): THREE.ShaderMaterial {
  const dirMap: Record<ClipDirection, number> = {
    right: 0,
    up: 1,
    center: 2,
  }
  const direction = opts.clipDirection ?? "right"

  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: opts.map ?? null },
      clipProgress: { value: 0 },
      clipDir: { value: dirMap[direction] },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
  })
}
