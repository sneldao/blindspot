// 3D scene setup — renderer, camera, lights, fog, background.
// All the static scene infrastructure that doesn't change per-investigation.

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

  // Paper-warm background
  const paperColor = new THREE.Color("oklch(0.98 0.005 85)")
  renderer.setClearColor(paperColor)

  const scene = new THREE.Scene()
  scene.background = paperColor
  // Fog: paper-warm, near 8, far 25 — distant panels dissolve into paper
  scene.fog = new THREE.Fog(new THREE.Color("oklch(0.94 0.008 80)"), 8, 25)

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  )
  camera.position.set(0, 0, 5)

  // Lights
  const ambient = new THREE.AmbientLight(0xfff5e6, 0.6)
  scene.add(ambient)

  const directional = new THREE.DirectionalLight(0xffffff, 0.8)
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
  const pointLight = new THREE.PointLight(0xd4663a, 0.3, 15)
  pointLight.position.copy(camera.position)
  scene.add(pointLight)

  // Invisible floor plane to catch shadows — grounds the floating panels
  const floorGeo = new THREE.PlaneGeometry(200, 200)
  const floorMat = new THREE.ShadowMaterial({ opacity: 0.15 })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -5
  floor.receiveShadow = true
  scene.add(floor)

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
    floorGeo.dispose()
    floorMat.dispose()
  }

  return { renderer, scene, camera, pointLight, dispose }
}
