import { beforeEach, describe, expect, it, vi } from "vitest"

const lookup = vi.hoisted(() => vi.fn())
vi.mock("node:dns/promises", () => ({ lookup }))

import { isPublicHttpUrl, isPrivateIp } from "../src/lib/url-guard.js"

beforeEach(() => {
  lookup.mockReset()
  // Default: every hostname resolves to a public address.
  lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }])
})

describe("isPublicHttpUrl", () => {
  it("accepts a plain public https URL", async () => {
    await expect(isPublicHttpUrl("https://vitalik.ca")).resolves.toBe(true)
  })

  it("rejects non-http(s) schemes", async () => {
    await expect(isPublicHttpUrl("ftp://example.com")).resolves.toBe(false)
    await expect(isPublicHttpUrl("file:///etc/passwd")).resolves.toBe(false)
    await expect(isPublicHttpUrl("javascript:alert(1)")).resolves.toBe(false)
  })

  it("rejects URLs with embedded credentials", async () => {
    await expect(isPublicHttpUrl("https://user:pass@example.com")).resolves.toBe(false)
  })

  it("rejects internal hostnames and suffixes", async () => {
    await expect(isPublicHttpUrl("http://localhost/x")).resolves.toBe(false)
    await expect(isPublicHttpUrl("http://service.internal")).resolves.toBe(false)
    await expect(isPublicHttpUrl("http://metadata.google.internal")).resolves.toBe(false)
  })

  it("rejects private and reserved IP literals without a DNS lookup", async () => {
    for (const host of [
      "127.0.0.1",
      "10.1.2.3",
      "192.168.0.9",
      "172.16.0.1",
      "169.254.169.254", // cloud metadata
      "100.64.0.1", // CGNAT
      "0.0.0.0",
      "224.0.0.1",
    ]) {
      await expect(isPublicHttpUrl(`http://${host}/`)).resolves.toBe(false)
    }
    expect(lookup).not.toHaveBeenCalled()
  })

  it("rejects hostnames that resolve into private space", async () => {
    lookup.mockResolvedValue([{ address: "192.168.1.10", family: 4 }])
    await expect(isPublicHttpUrl("https://rebind.example.com")).resolves.toBe(false)
  })

  it("rejects hostnames where only some records are public", async () => {
    lookup.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.5", family: 4 },
    ])
    await expect(isPublicHttpUrl("https://mixed.example.com")).resolves.toBe(false)
  })

  it("rejects unresolvable hostnames", async () => {
    lookup.mockRejectedValue(new Error("ENOTFOUND"))
    await expect(isPublicHttpUrl("https://does-not-exist.example")).resolves.toBe(false)
  })

  it("rejects garbage input", async () => {
    await expect(isPublicHttpUrl("not a url")).resolves.toBe(false)
    await expect(isPublicHttpUrl("")).resolves.toBe(false)
  })
})

describe("isPrivateIp", () => {
  it("handles IPv6 loopback, link-local, and ULA", () => {
    expect(isPrivateIp("::1")).toBe(true)
    expect(isPrivateIp("fe80::1")).toBe(true)
    expect(isPrivateIp("fd00::1")).toBe(true)
    expect(isPrivateIp("2607:f8b0:4004:800::200e")).toBe(false)
  })

  it("unwraps IPv4-mapped IPv6", () => {
    expect(isPrivateIp("::ffff:127.0.0.1")).toBe(true)
    expect(isPrivateIp("::ffff:8.8.8.8")).toBe(false)
  })
})
