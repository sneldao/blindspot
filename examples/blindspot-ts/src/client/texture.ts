// HTML-to-texture pipeline.
// Converts an HTML string into a THREE.CanvasTexture by routing through
// SVG <foreignObject> → Image → Canvas. This lets us design panels in
// HTML/CSS and project them onto 3D planes with real depth.

import * as THREE from "three"

export interface TextureOptions {
  width: number
  height: number
  scale?: number
}

export async function htmlToTexture(
  html: string,
  opts: TextureOptions,
): Promise<THREE.CanvasTexture> {
  const { width, height, scale = 2 } = opts
  const cw = width * scale
  const ch = height * scale

  // 1. Wrap HTML in SVG foreignObject
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}">
<foreignObject width="100%" height="100%">
<div xmlns="http://www.w3.org/1999/xhtml"
  style="width:${cw}px;height:${ch}px;font-size:${scale * 16}px;box-sizing:border-box;">
${html}
</div>
</foreignObject>
</svg>`

  // 2. Serialize to data URI
  const dataUri =
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)

  // 3. Load as Image
  const img = new Image()
  img.src = dataUri
  await img.decode()

  // 4. Draw to Canvas
  const canvas = document.createElement("canvas")
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(img, 0, 0, cw, ch)

  // 5. Create Three.js texture
  const texture = new THREE.CanvasTexture(canvas)
  texture.anisotropy = 4
  texture.needsUpdate = true

  return texture
}

// Build a plane mesh from HTML content at a given 3D position.
export async function htmlToPlane(
  html: string,
  width: number,
  height: number,
  material: THREE.Material,
): Promise<THREE.Mesh> {
  const texture = await htmlToTexture(html, { width, height })
  const geo = new THREE.PlaneGeometry(width, height)
  ;(material as THREE.MeshBasicMaterial).map = texture
  material.transparent = true
  material.side = THREE.DoubleSide
  const mesh = new THREE.Mesh(geo, material)
  mesh.userData.texture = texture // keep ref for disposal
  return mesh
}
