import { describe, expect, it } from "vitest"
import { formatCompact, riskLabelFor, riskColorFor } from "../src/lib/format.js"

describe("formatCompact", () => {
  it("formats millions with a trimmed decimal", () => {
    expect(formatCompact(1_500_000)).toBe("1.5M")
    expect(formatCompact(1_000_000)).toBe("1M")
  })

  it("formats thousands with a trimmed decimal", () => {
    expect(formatCompact(4_200)).toBe("4.2K")
    expect(formatCompact(-2_000)).toBe("-2K")
  })

  it("leaves small numbers alone", () => {
    expect(formatCompact(42)).toBe("42")
    expect(formatCompact(0)).toBe("0")
  })
})

describe("riskLabelFor / riskColorFor thresholds", () => {
  it("labels >= 60 as HIGH RISK", () => {
    expect(riskLabelFor(60)).toBe("HIGH RISK")
    expect(riskLabelFor(100)).toBe("HIGH RISK")
    expect(riskColorFor(60)).toBe("#e74c3c")
  })

  it("labels 30–59 as MODERATE", () => {
    expect(riskLabelFor(30)).toBe("MODERATE")
    expect(riskLabelFor(59)).toBe("MODERATE")
    expect(riskColorFor(30)).toBe("#f39c12")
  })

  it("labels < 30 as LOW RISK", () => {
    expect(riskLabelFor(29)).toBe("LOW RISK")
    expect(riskLabelFor(0)).toBe("LOW RISK")
    expect(riskColorFor(0)).toBe("#27ae60")
  })
})
