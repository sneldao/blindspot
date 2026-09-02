// Scroll system — Lenis smooth scroll + scroll progress tracking.
// Provides a single scrollProgress value (0→1) that drives the camera
// position and panel reveals.

import Lenis from "lenis"

export interface ScrollSystem {
  lenis: Lenis
  getProgress: () => number
  scrollTo: (target: number) => void
  scrollToTop: () => void
  dispose: () => void
}

export function createScrollSystem(onScroll: (progress: number) => void): ScrollSystem {
  // Set body height to create scrollable space (5 panels × 100vh)
  document.body.style.height = "500vh"
  document.body.style.overflow = "auto"

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

  const lenis = new Lenis({
    lerp: 0.08,
    duration: 1.2,
    smoothWheel: !prefersReducedMotion,
  })

  function getProgress(): number {
    const max = document.body.scrollHeight - window.innerHeight
    return max > 0 ? lenis.scroll / max : 0
  }

  function scrollTo(target: number) {
    lenis.scrollTo(target, { duration: prefersReducedMotion ? 0 : 1.2 })
  }

  function scrollToTop() {
    lenis.scrollTo(0, { duration: prefersReducedMotion ? 0 : 1 })
  }

  // RAF loop for Lenis
  let rafId = 0
  function raf(time: number) {
    lenis.raf(time)
    onScroll(getProgress())
    rafId = requestAnimationFrame(raf)
  }
  rafId = requestAnimationFrame(raf)

  function dispose() {
    cancelAnimationFrame(rafId)
    lenis.destroy()
    document.body.style.height = ""
    document.body.style.overflow = ""
  }

  return { lenis, getProgress, scrollTo, scrollToTop, dispose }
}
