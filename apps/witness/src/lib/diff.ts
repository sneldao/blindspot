// The geo-diff engine — pure, deterministic, unit-tested.
//
// Given observations from multiple egress locations, produce the lines that
// prove (or refute) the thesis: the web is not one web.

import type { DiffLine, GeoDiff, LocationObservation } from "./types.js"

function formatPrices(prices: string[]): string {
  return prices.length > 0 ? prices.slice(0, 3).join(", ") : "none"
}

export function diffObservations(observations: LocationObservation[]): GeoDiff {
  const differences: DiffLine[] = []
  const ok = observations.filter((o) => o.ok)
  const failed = observations.filter((o) => !o.ok)

  for (const o of failed) {
    differences.push({
      kind: "availability",
      detail: `${o.label} could not load the page${o.error ? ` (${o.error})` : ""}`,
    })
  }

  if (ok.length > 1) {
    // Title
    const titles = new Set(ok.map((o) => o.title ?? ""))
    if (titles.size > 1) {
      differences.push({
        kind: "title",
        detail: `Titles differ: ${ok.map((o) => `${o.label} → "${o.title ?? ""}"`).join("; ")}`,
      })
    }

    // Canonical URL divergence is the loudest geo-signal.
    const canonicals = new Set(ok.map((o) => o.canonical ?? ""))
    if (canonicals.size > 1) {
      differences.push({
        kind: "structure",
        detail: `Canonical URLs differ by location: ${ok
          .map((o) => `${o.label} → ${o.canonical ?? "(none)"}`)
          .join("; ")}`,
      })
    }

    // Currency
    const currencySet = ok.map((o) => o.currencies.join("+"))
    if (new Set(currencySet).size > 1) {
      differences.push({
        kind: "currency",
        detail: `Currencies differ: ${ok.map((o) => `${o.label} → ${o.currencies.join(", ") || "none"}`).join("; ")}`,
      })
    }

    // Prices
    const priceSet = new Set(ok.map((o) => formatPrices(o.prices)))
    if (priceSet.size > 1) {
      differences.push({
        kind: "price",
        detail: `Prices differ: ${ok.map((o) => `${o.label} → ${formatPrices(o.prices)}`).join("; ")}`,
      })
    }

    // Content volume
    const lengths = ok.map((o) => o.bodyLength)
    const min = Math.min(...lengths)
    const max = Math.max(...lengths)
    if (min > 0 && max / Math.max(min, 1) > 1.5) {
      differences.push({
        kind: "content",
        detail: `Content volume differs sharply: ${ok
          .map((o) => `${o.label} → ${o.bodyLength.toLocaleString()} chars`)
          .join("; ")}`,
      })
    }

    // Headings structure
    const headingSets = new Set(ok.map((o) => o.headings.join("|")))
    if (headingSets.size > 1) {
      differences.push({
        kind: "structure",
        detail: `Page structure differs: not all locations see the same headings`,
      })
    }
  }

  // Egress proof — always included, it is the witness's alibi.
  const egresses = ok.filter((o) => o.egressIp)
  if (egresses.length > 1) {
    const ips = new Set(egresses.map((o) => o.egressIp))
    if (ips.size > 1) {
      differences.push({
        kind: "egress",
        detail: `Distinct egress IPs confirmed: ${ok
          .map((o) => `${o.label} → ${o.egressIp ?? "?"}`)
          .filter((s) => !s.endsWith("→ ?"))
          .join("; ")}`,
      })
    }
  }

  return { identical: differences.length === 0, differences }
}
