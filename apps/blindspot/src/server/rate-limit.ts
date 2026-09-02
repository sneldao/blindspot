// In-memory rate limiting for /api/investigate.
//
// Each request spawns paid cloud infrastructure (a sandbox + a stealth
// browser) and the endpoint is unauthenticated — without a limit, anyone can
// run up the bill or use the server as a browsing proxy. This is a
// single-process sliding window plus a global concurrency cap: the right
// shape for a demo deployment, and a placeholder for a real limiter if this
// ever runs multi-instance.

const WINDOW_MS = 10 * 60_000
const MAX_PER_WINDOW = 5
const MAX_CONCURRENT = 2

const hits = new Map<string, number[]>()
let active = 0

export type RateDecision = { allowed: true } | { allowed: false; reason: "rate" | "busy" }

export function checkRateLimit(key: string): RateDecision {
  const windowStart = Date.now() - WINDOW_MS

  const recent = (hits.get(key) ?? []).filter((t) => t > windowStart)
  hits.set(key, recent)

  if (recent.length >= MAX_PER_WINDOW) {
    return { allowed: false, reason: "rate" }
  }
  if (active >= MAX_CONCURRENT) {
    return { allowed: false, reason: "busy" }
  }

  recent.push(Date.now())
  active++

  if (hits.size > 1000) {
    for (const [k, ts] of hits) {
      const kept = ts.filter((t) => t > windowStart)
      if (kept.length === 0) hits.delete(k)
      else hits.set(k, kept)
    }
  }

  return { allowed: true }
}

export function releaseSlot(): void {
  active = Math.max(0, active - 1)
}

// Test hook — resets all state between tests.
export function resetRateLimiter(): void {
  hits.clear()
  active = 0
}
