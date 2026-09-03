import { describe, expect, it } from "vitest"
import { diffObservations } from "../src/lib/diff.js"
import type { LocationObservation } from "../src/lib/types.js"

function observation(overrides: Partial<LocationObservation>): LocationObservation {
  return {
    code: "us",
    label: "United States",
    ok: true,
    currencies: [],
    prices: [],
    headings: ["home"],
    bodyLength: 1000,
    durationMs: 500,
    ...overrides,
  }
}

describe("diffObservations", () => {
  it("reports identical when all locations agree", () => {
    const diff = diffObservations([
      observation({ code: "us", label: "United States" }),
      observation({ code: "de", label: "Germany" }),
    ])
    expect(diff.identical).toBe(true)
    expect(diff.differences).toHaveLength(0)
  })

  it("flags title differences", () => {
    const diff = diffObservations([
      observation({ code: "us", label: "United States", title: "Deals" }),
      observation({ code: "de", label: "Germany", title: "Angebote" }),
    ])
    expect(diff.identical).toBe(false)
    expect(diff.differences.some((d) => d.kind === "title")).toBe(true)
  })

  it("flags currency differences", () => {
    const diff = diffObservations([
      observation({ code: "us", label: "United States", currencies: ["USD"] }),
      observation({ code: "de", label: "Germany", currencies: ["EUR"] }),
    ])
    expect(diff.differences.some((d) => d.kind === "currency")).toBe(true)
  })

  it("flags price differences", () => {
    const diff = diffObservations([
      observation({ code: "us", label: "United States", prices: ["$10.00"] }),
      observation({ code: "de", label: "Germany", prices: ["9,99 €"] }),
    ])
    expect(diff.differences.some((d) => d.kind === "price")).toBe(true)
  })

  it("flags sharp content-volume differences", () => {
    const diff = diffObservations([
      observation({ code: "us", label: "United States", bodyLength: 10_000 }),
      observation({ code: "sg", label: "Singapore", bodyLength: 1_000 }),
    ])
    expect(diff.differences.some((d) => d.kind === "content")).toBe(true)
  })

  it("tolerates mild content-volume differences", () => {
    const diff = diffObservations([
      observation({ code: "us", label: "United States", bodyLength: 1_000 }),
      observation({ code: "sg", label: "Singapore", bodyLength: 1_200 }),
    ])
    expect(diff.differences.some((d) => d.kind === "content")).toBe(false)
  })

  it("flags failed locations as availability differences", () => {
    const diff = diffObservations([
      observation({ code: "us", label: "United States" }),
      observation({ code: "sg", label: "Singapore", ok: false, error: "timeout" }),
    ])
    expect(diff.differences.some((d) => d.kind === "availability")).toBe(true)
  })

  it("records distinct egress IPs as proof of the alibi", () => {
    const diff = diffObservations([
      observation({ code: "us", label: "United States", egressIp: "1.2.3.4" }),
      observation({ code: "de", label: "Germany", egressIp: "5.6.7.8" }),
    ])
    expect(diff.differences.some((d) => d.kind === "egress")).toBe(true)
  })
})
