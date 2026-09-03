// SSRF guard — The Witness fetches visitor-supplied URLs from cloud browsers.
// A cloud browser with a residential proxy is a potent request origin, so the
// guard is strict: public http(s) only, no credentials in the URL, and no
// hostnames that resolve to loopback, link-local, private ranges, or bare
// IP literals that are not global unicast.

const BLOCKED_HOSTNAMES = new Set(["localhost"])

export function isPublicHttpUrl(raw: string): boolean {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return false
  if (url.username || url.password) return false
  if (BLOCKED_HOSTNAMES.has(url.hostname.toLowerCase())) return false

  // Bare IP literals: only global, non-reserved addresses are allowed.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname)) {
    const octets = url.hostname.split(".").map(Number)
    const [a, b] = octets
    if (a === 0 || a === 10 || a === 127) return false
    if (a === 169 && b === 254) return false // link-local
    if (a === 172 && b >= 16 && b <= 31) return false // private
    if (a === 192 && b === 168) return false // private
    if (a === 100 && b >= 64 && b <= 127) return false // CGNAT
    if (a >= 224) return false // multicast / reserved
    return true
  }

  // Hostnames that smell like internal infrastructure.
  const host = url.hostname.toLowerCase()
  if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".home")) return false
  return true
}
