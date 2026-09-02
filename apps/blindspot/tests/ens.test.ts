import { describe, expect, it } from "vitest"
import { isValidEnsName } from "../src/lib/ens.js"

describe("isValidEnsName", () => {
  it("accepts ordinary names", () => {
    expect(isValidEnsName("vitalik.eth")).toBe(true)
    expect(isValidEnsName("sub.domain.eth")).toBe(true)
    expect(isValidEnsName("VITALIK.ETH")).toBe(true) // normalized internally
    expect(isValidEnsName("foo.eth.")).toBe(true) // root dot
  })

  it("rejects empty and oversized input", () => {
    expect(isValidEnsName("")).toBe(false)
    expect(isValidEnsName("   ")).toBe(false)
    expect(isValidEnsName("x".repeat(256))).toBe(false)
  })

  it("rejects empty labels", () => {
    expect(isValidEnsName("a..eth")).toBe(false)
    expect(isValidEnsName(".eth")).toBe(false)
  })

  it("rejects whitespace and control characters", () => {
    expect(isValidEnsName("has space.eth")).toBe(false)
    expect(isValidEnsName("a\u0000b.eth")).toBe(false)
    expect(isValidEnsName("a\u007fb.eth")).toBe(false)
  })

  it("rejects URL/shell metacharacters", () => {
    expect(isValidEnsName("<script>.eth")).toBe(false)
    expect(isValidEnsName('a"b.eth')).toBe(false)
    expect(isValidEnsName("a'b.eth")).toBe(false)
    expect(isValidEnsName("a`b.eth")).toBe(false)
    expect(isValidEnsName("a\\b.eth")).toBe(false)
  })
})
