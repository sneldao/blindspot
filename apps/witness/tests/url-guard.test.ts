import { describe, expect, it } from "vitest"
import { isPublicHttpUrl } from "../src/lib/url-guard.js"

describe("isPublicHttpUrl", () => {
  it("accepts public https and http URLs", () => {
    expect(isPublicHttpUrl("https://example.com/pricing")).toBe(true)
    expect(isPublicHttpUrl("http://example.com")).toBe(true)
  })

  it("rejects non-http protocols", () => {
    expect(isPublicHttpUrl("ftp://example.com")).toBe(false)
    expect(isPublicHttpUrl("file:///etc/passwd")).toBe(false)
    expect(isPublicHttpUrl("javascript:alert(1)")).toBe(false)
  })

  it("rejects unparseable input", () => {
    expect(isPublicHttpUrl("")).toBe(false)
    expect(isPublicHttpUrl("not a url")).toBe(false)
  })

  it("rejects URLs with credentials", () => {
    expect(isPublicHttpUrl("https://user:pass@example.com")).toBe(false)
  })

  it("rejects loopback and private IP literals", () => {
    expect(isPublicHttpUrl("http://127.0.0.1")).toBe(false)
    expect(isPublicHttpUrl("http://10.0.0.1")).toBe(false)
    expect(isPublicHttpUrl("http://192.168.1.1")).toBe(false)
    expect(isPublicHttpUrl("http://172.16.0.1")).toBe(false)
    expect(isPublicHttpUrl("http://169.254.169.254")).toBe(false) // cloud metadata
    expect(isPublicHttpUrl("http://0.0.0.0")).toBe(false)
    expect(isPublicHttpUrl("http://224.0.0.1")).toBe(false)
  })

  it("accepts global IP literals", () => {
    expect(isPublicHttpUrl("http://1.1.1.1")).toBe(true)
    expect(isPublicHttpUrl("http://8.8.8.8")).toBe(true)
  })

  it("rejects internal-looking hostnames", () => {
    expect(isPublicHttpUrl("http://localhost:4568")).toBe(false)
    expect(isPublicHttpUrl("http://db.internal")).toBe(false)
    expect(isPublicHttpUrl("http://printer.local")).toBe(false)
    expect(isPublicHttpUrl("http://router.home")).toBe(false)
  })
})
