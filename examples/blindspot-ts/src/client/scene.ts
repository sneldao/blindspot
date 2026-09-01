// 3D scene setup — renderer, camera, lights, fog, background.
// The space is a dim archive — panels glow like lit documents in low light.
// The declassification primitive needs darkness to read: ink dissolving
// into warm glow only works against a dark background.

import * as THREE from "three"

export interface SceneContext {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  pointLight: THREE.PointLight
  dispose: () => void
}

export function createScene(canvas: HTMLCanvasElement): SceneContext {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0

  // Deep warm dark — the archive room at night
  const bgColor = new THREE.Color("oklch(0.10 0.008 60)")
  renderer.setClearColor(bgColor)

  const scene = new THREE.Scene()
  scene.background = bgColor
  // Warm fog — distant panels emerge from amber darkness
  scene.fog = new THREE.Fog(new THREE.Color("oklch(0.12 0.01 55)"), 8, 30)

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  )
  camera.position.set(0, 0, 5)

  // ── Lights ──
  // Low ambient — the room is dim, panels provide their own light
  const ambient = new THREE.AmbientLight(0xfff5e6, 0.2)
  scene.add(ambient)

  // Warm key light from above — like a single overhead lamp
  const directional = new THREE.DirectionalLight(0xffd9a0, 0.5)
  directional.position.set(-5, 8, 5)
  directional.castShadow = true
  directional.shadow.mapSize.width = 2048
  directional.shadow.mapSize.height = 2048
  directional.shadow.camera.near = 0.5
  directional.shadow.camera.far = 50
  directional.shadow.camera.left = -10
  directional.shadow.camera.right = 10
  directional.shadow.camera.top = 10
  directional.shadow.camera.bottom = -10
  directional.shadow.bias = -0.0005
  scene.add(directional)

  // Accent point light — terracotta tint, follows camera for warmth
  // This is the light that "illuminates" the document you're reading
  const pointLight = new THREE.PointLight(0xd4663a, 1.2, 15)
  pointLight.position.copy(camera.position)
  scene.add(pointLight)

  // Handle resize
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }
  window.addEventListener("resize", onResize)

  function dispose() {
    window.removeEventListener("resize", onResize)
    renderer.dispose()
  }

  return { renderer, scene, camera, pointLight, dispose }
}
