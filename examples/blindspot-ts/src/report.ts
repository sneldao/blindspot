// Report generator — produces a self-contained HTML file.
//
// This is the demo artifact: what you open in a browser, what you show on
// stage, what you post on LinkedIn. It embeds the privacy manifest front and
// center because that's the thesis — not an afterthought.

import type { InvestigationReport } from "./types.js"
import { writeFileSync } from "node:fs"
import { join } from "node:path"

export function generateReport(report: InvestigationReport, outputDir: string): string {
  const html = renderHtml(report)
  const filename = `blindspot-${report.target.name.replace(/\./g, "-")}-${Date.now()}.html`
  const filepath = join(outputDir, filename)
  writeFileSync(filepath, html)
  return filepath
}

function renderHtml(r: InvestigationReport): string {
  const riskColor = r.risk.overallScore >= 60 ? "#e74c3c" : r.risk.overallScore >= 30 ? "#f39c12" : "#27ae60"
  const riskLabel = r.risk.overallScore >= 60 ? "HIGH RISK" : r.risk.overallScore >= 30 ? "MODERATE" : "LOW RISK"

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Blindspot — Investigation: ${esc(r.target.name)}</title>
<style>
  :root {
    --bg: #0a0a0f;
    --card: #14141f;
    --border: #2a2a3a;
    --text: #e4e4ef;
    --muted: #8888a0;
    --accent: #6c5ce7;
    --green: #27ae60;
    --yellow: #f39c12;
    --red: #e74c3c;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
    line-height: 1.6;
    padding: 2rem;
    max-width: 900px;
    margin: 0 auto;
  }
  h1 { font-size: 1.8rem; margin-bottom: 0.25rem; }
  h2 { font-size: 1.2rem; margin: 2rem 0 0.75rem; color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
  h3 { font-size: 1rem; margin: 1rem 0 0.5rem; color: var(--muted); }
  .header { margin-bottom: 2rem; }
  .header .tag { display: inline-block; background: var(--accent); color: white; padding: 2px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.5px; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem; margin-bottom: 1rem; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .stat { text-align: center; }
  .stat .value { font-size: 1.5rem; font-weight: 700; }
  .stat .label { font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .risk-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-weight: 700; font-size: 0.85rem; color: white; background: ${riskColor}; }
  .signal { padding: 0.75rem; border-left: 3px solid; margin-bottom: 0.5rem; background: rgba(255,255,255,0.03); border-radius: 0 4px 4px 0; }
  .signal.high { border-color: var(--red); }
  .signal.medium { border-color: var(--yellow); }
  .signal.low { border-color: var(--green); }
  .signal .label { font-weight: 600; }
  .signal .detail { font-size: 0.85rem; color: var(--muted); margin-top: 2px; }
  .signal .cat { font-size: 0.7rem; text-transform: uppercase; color: var(--muted); float: right; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  th { text-align: left; color: var(--muted); padding: 0.5rem; border-bottom: 1px solid var(--border); }
  td { padding: 0.5rem; border-bottom: 1px solid var(--border); }
  .mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.8rem; }
  .privacy { background: linear-gradient(135deg, #1a1a2e, #16213e); border: 1px solid var(--accent); }
  .privacy li { margin: 0.25rem 0 0.25rem 1.5rem; }
  .privacy .mechanism { color: var(--green); }
  .muted { color: var(--muted); }
  .pos { color: var(--green); }
  .neg { color: var(--red); }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  .footer { margin-top: 3rem; text-align: center; color: var(--muted); font-size: 0.8rem; }
</style>
</head>
<body>

<div class="header">
  <span class="tag">BLINDSPOT</span>
  <h1>Privacy-Preserving Investigation: ${esc(r.target.name)}</h1>
  <p class="muted">Generated ${new Date(r.timestamp).toISOString()} · ${r.duration.toFixed(1)}s · ENS + Mobula + Solari</p>
</div>

<!-- PRIVACY MANIFEST — front and center, this is the thesis -->
<div class="card privacy">
  <h2 style="margin-top:0; border:none">Privacy Manifest</h2>
  <p class="muted" style="margin-bottom: 0.75rem">This investigation was conducted without exposing the investigator's identity, traffic, or history.</p>
  <h3>Protected data</h3>
  <ul>
    ${r.privacy.protectedData.map(d => `<li>${esc(d)}</li>`).join("")}
  </ul>
  <h3>Adversaries</h3>
  <ul>
    ${r.privacy.adversaries.map(a => `<li>${esc(a)}</li>`).join("")}
  </ul>
  <h3>Mechanisms</h3>
  <ul>
    ${r.privacy.mechanisms.map(m => `<li class="mechanism">${esc(m)}</li>`).join("")}
  </ul>
  <div class="grid" style="margin-top: 1rem">
    <div class="stat">
      <div class="value mono" style="font-size:0.75rem; color: var(--muted)">${esc(r.privacy.sandboxId.slice(0, 16))}...</div>
      <div class="label">Sandbox ${r.privacy.sandboxDestroyed ? "Destroyed ✓" : "Leaked ✗"}</div>
    </div>
    <div class="stat">
      <div class="value mono" style="font-size:0.75rem; color: var(--muted)">${esc(r.privacy.egressIp)}</div>
      <div class="label">Egress IP (residential proxy)</div>
    </div>
  </div>
</div>

<!-- TARGET IDENTITY -->
<div class="card">
  <h2 style="margin-top:0; border:none">Target Identity (ENS)</h2>
  <div class="grid">
    <div>
      <p><span class="muted">Name:</span> <strong>${esc(r.target.name)}</strong></p>
      <p><span class="muted">Address:</span> <span class="mono">${esc(r.target.address)}</span></p>
      ${r.target.aliases.length > 0 ? `<p><span class="muted">Aliases:</span> ${r.target.aliases.map(a => esc(a)).join(", ")}</p>` : ""}
    </div>
    <div>
      ${r.target.website ? `<p>🌐 <a href="${esc(r.target.website)}">${esc(r.target.website)}</a></p>` : ""}
      ${r.target.twitter ? `<p>🐦 @${esc(r.target.twitter.replace(/^@/, ""))}</p>` : ""}
      ${r.target.github ? `<p>📦 github.com/${esc(r.target.github.replace(/^@/, ""))}</p>` : ""}
      ${r.target.description ? `<p class="muted">${esc(r.target.description.slice(0, 200))}</p>` : ""}
    </div>
  </div>
</div>

<!-- RISK ASSESSMENT -->
<div class="card">
  <h2 style="margin-top:0; border:none">Risk Assessment</h2>
  <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem">
    <div style="font-size: 2.5rem; font-weight: 800; color: ${riskColor}">${r.risk.overallScore}</div>
    <div>
      <span class="risk-badge">${riskLabel}</span>
      <p class="muted" style="margin-top: 4px">${esc(r.risk.summary)}</p>
    </div>
  </div>
  ${r.risk.signals.length === 0
    ? '<p class="muted">No signals detected.</p>'
    : r.risk.signals.map(s => `
    <div class="signal ${s.severity}">
      <span class="cat">${esc(s.category)}</span>
      <div class="label">${esc(s.label)}</div>
      <div class="detail">${esc(s.detail)}</div>
    </div>`).join("")
  }
</div>

<!-- ONCHAIN PORTFOLIO -->
<div class="card">
  <h2 style="margin-top:0; border:none">Onchain Portfolio (Mobula)</h2>
  <div class="grid" style="margin-bottom: 1rem">
    <div class="stat">
      <div class="value">$${fmt(r.onchain.totalValueUSD)}</div>
      <div class="label">Total Holdings</div>
    </div>
    <div class="stat">
      <div class="value ${r.onchain.totalRealizedPnlUSD >= 0 ? 'pos' : 'neg'}">
        ${r.onchain.totalRealizedPnlUSD >= 0 ? '+' : ''}$${fmt(r.onchain.totalRealizedPnlUSD)}
      </div>
      <div class="label">Realized PnL</div>
    </div>
  </div>
  ${r.onchain.portfolio.length > 0 ? `
  <table>
    <tr><th>Token</th><th>Balance</th><th>USD Value</th><th>Chain</th></tr>
    ${r.onchain.portfolio.slice(0, 10).map(a => `
    <tr>
      <td>${esc(a.asset.symbol)} <span class="muted">${esc(a.asset.name)}</span></td>
      <td>${fmtNum(a.walletBalance)}</td>
      <td>$${fmt(a.amountUSD)}</td>
      <td class="mono">${esc(a.asset.blockchain)}</td>
    </tr>`).join("")}
  </table>` : '<p class="muted">No holdings found.</p>'}
</div>

<!-- POSITIONS WITH PNL -->
${r.onchain.positions.length > 0 ? `
<div class="card">
  <h2 style="margin-top:0; border:none">Trading Positions & PnL</h2>
  <table>
    <tr><th>Token</th><th>Buys</th><th>Sells</th><th>Realized PnL</th><th>Unrealized</th></tr>
    ${r.onchain.positions.slice(0, 10).map(p => `
    <tr>
      <td>${esc(p.token.symbol)}</td>
      <td>${p.buys}</td>
      <td>${p.sells}</td>
      <td class="${p.realizedPnlUSD >= 0 ? 'pos' : 'neg'}">${p.realizedPnlUSD >= 0 ? '+' : ''}$${fmt(p.realizedPnlUSD)}</td>
      <td class="${p.unrealizedPnlUSD >= 0 ? 'pos' : 'neg'}">${p.unrealizedPnlUSD >= 0 ? '+' : ''}$${fmt(p.unrealizedPnlUSD)}</td>
    </tr>`).join("")}
  </table>
</div>` : ""}

<!-- OFF-CHAIN CONTEXT -->
${r.offChain.length > 0 ? `
<div class="card">
  <h2 style="margin-top:0; border:none">Off-Chain Context (Stealth Browser)</h2>
  <p class="muted" style="margin-bottom: 0.75rem">Fetched via residential proxy — target saw ${esc(r.offChain[0].egressIp)}, not the investigator.</p>
  ${r.offChain.map(c => `
  <div style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border)">
    <p><strong>${esc(c.title)}</strong> <span class="muted">— ${esc(c.url)}</span></p>
    <p class="muted">${esc(c.description ?? "No description")}</p>
    ${c.socialLinks.length > 0 ? `<p class="mono" style="font-size:0.75rem; margin-top:4px">Socials: ${c.socialLinks.map(s => esc(s)).join(" · ")}</p>` : ""}
  </div>`).join("")}
</div>` : ""}

<div class="footer">
  <p>Blindspot — Privacy-Preserving Onchain Investigation Agent</p>
  <p>Built with Solari (ephemeral sandboxes + stealth browsers) · ENS (discovery) · Mobula (onchain data)</p>
  <p>Common S3nse Hackathon · Cypherpunk Week Amsterdam 2026</p>
</div>

</body>
</html>`
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M"
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "K"
  return n.toFixed(2)
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(2) + "K"
  return n.toFixed(4)
}
