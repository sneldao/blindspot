// Shared types for The Witness geo-diff.
//
// One observation per egress location. Each observation is the extracted,
// comparable surface of the page as that location saw it.

export interface EgressLocation {
  /** Solari proxy country code (lowercase ISO 3166-1 alpha-2). */
  code: string
  label: string
}

export interface LocationObservation {
  code: string
  label: string
  ok: boolean
  error?: string
  /** The egress IP the target site saw — the proxy's, never ours. */
  egressIp?: string
  title?: string
  description?: string
  /** Canonical link if the page declares one. */
  canonical?: string
  /** ISO currency codes detected in the page text (e.g. USD, EUR). */
  currencies: string[]
  /** Price-like strings found in the page, in document order. */
  prices: string[]
  /** Top-level headings, for structural comparison. */
  headings: string[]
  bodyLength: number
  /** How long the location took to observe, in ms. */
  durationMs: number
}

export interface GeoDiff {
  /** True when every location saw the same canonical title and structure. */
  identical: boolean
  /** Human-readable differences, one line each. */
  differences: DiffLine[]
}

export interface DiffLine {
  kind: "title" | "currency" | "price" | "content" | "structure" | "egress" | "availability"
  detail: string
}
