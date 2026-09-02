// URL guard — decides which URLs the stealth browser may visit.
//
// The URLs come from ENS text records, i.e. from the target itself. An
// attacker-controlled record could otherwise point the browser session at
// internal infrastructure — cloud metadata endpoints (169.254.169.254),
// private services, localhost — and read the response back through the page.
// Only public http(s) origins pass.
//
// Scope note: this guards the URLs we *navigate to*. A page that redirects to
// an internal address after load is not covered here; closing that gap needs
// request interception inside the remote browser.

import { lookup } from "node:dns/promises"

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal", "metadata.goog", "instance-data"])

const BLOCKED_SUFFIXES = [".internal", ".local", ".home.arpa"]

export async function isPublicHttpUrl(raw: string): Promise<boolean> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return false
  if (url.username || url.password) return false

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "")
  if (BLOCKED_HOSTNAMES.has(hostname)) return false
  if (BLOCKED_SUFFIXES.some((s) => hostname.endsWith(s))) return false
  if (isPrivateIp(hostname)) return false

  // A public-looking name can still resolve into private space (internal DNS
  // records, rebinding), so check every resolved address.
  try {
    const records = await lookup(hostname, { all: true, verbatim: true })
    if (records.length === 0) return false
    return records.every((r) => !isPrivateIp(r.address))
  } catch {
    return false // unresolvable — not worth a browser visit
  }
}

export function isPrivateIp(host: string): boolean {
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (v4) {
    const a = Number(v4[1])
    const b = Number(v4[2])
    if (a === 0 || a === 10 || a === 127) return true
    if (a === 169 && b === 254) return true // link-local, incl. cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
    if (a >= 224) return true // multicast + reserved
    return false
  }

  if (host.includes(":")) {
    const h = host.replace(/^\[|\]$/g, "").toLowerCase()
    if (h === "::1" || h === "::") return true
    if (h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true // link-local + ULA
    if (h.startsWith("::ffff:")) return isPrivateIp(h.slice(7))
    return false
  }

  return false
}
