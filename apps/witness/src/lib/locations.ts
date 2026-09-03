// Egress locations The Witness observes from.
//
// Codes are Solari residential proxy country codes. Keep this list small —
// the point of the geo-diff is contrast, not coverage.

import type { EgressLocation } from "./types.js"

export const LOCATIONS: EgressLocation[] = [
  { code: "us", label: "United States" },
  { code: "de", label: "Germany" },
  { code: "sg", label: "Singapore" },
]
