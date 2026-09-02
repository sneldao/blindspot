import { beforeEach, describe, expect, it } from "vitest"
import { checkRateLimit, releaseSlot, resetRateLimiter } from "../src/server/rate-limit.js"

beforeEach(() => {
  resetRateLimiter()
})

describe("checkRateLimit", () => {
  it("allows up to MAX_PER_WINDOW requests per key, then blocks", () => {
    for (let i = 0; i < 5; i++) {
      const decision = checkRateLimit("1.1.1.1")
      expect(decision.allowed).toBe(true)
      releaseSlot() // keep the concurrency cap out of this test
    }
    const decision = checkRateLimit("1.1.1.1")
    expect(decision.allowed).toBe(false)
    if (!decision.allowed) expect(decision.reason).toBe("rate")
  })

  it("tracks keys independently", () => {
    expect(checkRateLimit("1.1.1.1").allowed).toBe(true)
    expect(checkRateLimit("2.2.2.2").allowed).toBe(true)
  })

  it("caps global concurrency and frees slots on release", () => {
    expect(checkRateLimit("a").allowed).toBe(true)
    expect(checkRateLimit("b").allowed).toBe(true)
    const decision = checkRateLimit("c")
    expect(decision.allowed).toBe(false)
    if (!decision.allowed) expect(decision.reason).toBe("busy")

    releaseSlot()
    expect(checkRateLimit("c").allowed).toBe(true)
  })

  it("releaseSlot never drives the count negative", () => {
    releaseSlot()
    releaseSlot()
    expect(checkRateLimit("a").allowed).toBe(true)
    expect(checkRateLimit("b").allowed).toBe(true)
    expect(checkRateLimit("c").allowed).toBe(false)
  })
})
