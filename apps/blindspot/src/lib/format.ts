// Shared formatting + risk labeling.
//
// Used by the orchestrator (server), the HTML report generator, and the React
// island (client) — one source of truth for score thresholds and number
// formatting, instead of a copy per module.

export function formatCompact(n: number): string {
  const abs = Math.abs(n)
  const trim = (s: string) => s.replace(/\.0$/, "")
  if (abs >= 1e6) return trim((n / 1e6).toFixed(1)) + "M"
  if (abs >= 1e3) return trim((n / 1e3).toFixed(1)) + "K"
  return n.toFixed(0)
}

export function riskLabelFor(score: number): string {
  if (score >= 60) return "HIGH RISK"
  if (score >= 30) return "MODERATE"
  return "LOW RISK"
}

export function riskColorFor(score: number): string {
  if (score >= 60) return "#e74c3c"
  if (score >= 30) return "#f39c12"
  return "#27ae60"
}
