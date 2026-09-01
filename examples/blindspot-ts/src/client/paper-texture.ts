// Procedural paper texture — generates a canvas texture with subtle grain
// and fiber patterns that give panels a tactile, physical quality.
// Inspired by Obys' recycled paper textures.

import * as THREE from "three"

export function createPaperTexture(
  width = 1024,
  height = 768,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")!

  // Base paper color — warm, not white
  const baseGrad = ctx.createLinearGradient(0, 0, width, height)
  baseGrad.addColorStop(0, "#f9f6f0")
  baseGrad.addColorStop(0.5, "#f7f3ec")
  baseGrad.addColorStop(1, "#f5f1e8")
  ctx.fillStyle = baseGrad
  ctx.fillRect(0, 0, width, height)

  // Subtle fiber texture — random short lines
  ctx.globalAlpha = 0.04
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    const len = 2 + Math.random() * 8
    const angle = Math.random() * Math.PI * 2
    const shade = Math.random() > 0.5 ? 80 : 200
    ctx.strokeStyle = `rgb(${shade},${shade - 5},${shade - 10})`
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len)
    ctx.stroke()
  }

  // Fine grain noise
  ctx.globalAlpha = 0.02
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 20
    data[i] = Math.max(0, Math.min(255, data[i] + noise))
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise))
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise))
  }
  ctx.putImageData(imageData, 0, 0)

  // A few darker specks — like ink spots on old paper
  ctx.globalAlpha = 0.06
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    const r = 0.5 + Math.random() * 1.5
    ctx.fillStyle = `rgb(${40 + Math.random() * 30},${35 + Math.random() * 25},${30 + Math.random() * 20})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // Vignette — slightly darker edges, like aged paper
  ctx.globalAlpha = 1
  const vignette = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.3,
    width / 2, height / 2, Math.max(width, height) * 0.7,
  )
  vignette.addColorStop(0, "rgba(0,0,0,0)")
  vignette.addColorStop(1, "rgba(60,50,40,0.08)")
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, width, height)

  const texture = new THREE.CanvasTexture(canvas)
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}
