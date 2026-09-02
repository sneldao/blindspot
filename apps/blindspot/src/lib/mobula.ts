// Mobula onchain data layer — runs INSIDE the Solari sandbox.
//
// The sandbox is an ephemeral microVM. By running Mobula API calls from inside
// it, the investigator's real IP never touches Mobula's servers. After the
// investigation, the sandbox is killed — no logs, no cookies, no correlation
// possible between this query and any future one.
//
// We use `curl` directly (no package installation needed) and parse the JSON
// output. The sandbox's `commands.run` is NOT shell-interpreted, so argv goes
// in `args`.

import type { Sandbox } from "@solarisdk/sdk"
import type { MobulaData, MobulaAsset, MobulaPosition } from "./types.js"

const MOBULA_BASE = "https://api.mobula.io/api/2"

export async function fetchOnchainData(sandbox: Sandbox, address: string, apiKey: string): Promise<MobulaData> {
  console.log("  [sandbox] fetching portfolio from Mobula...")
  const portfolioRaw = await sandboxCurl(sandbox, apiKey, {
    path: "/wallet/portfolio",
    params: { wallet: address },
  })

  console.log("  [sandbox] fetching positions with PnL from Mobula...")
  const positionsRaw = await sandboxCurl(sandbox, apiKey, {
    path: "/wallet/positions",
    params: { wallet: address, limit: "50" },
  })

  const portfolio = parsePortfolio(portfolioRaw)
  const positions = parsePositions(positionsRaw)

  const totalValueUSD = portfolio.reduce((sum, a) => sum + (a.amountUSD || 0), 0)
  const totalRealizedPnlUSD = positions.reduce((sum, p) => sum + (p.realizedPnlUSD || 0), 0)
  const totalUnrealizedPnlUSD = positions.reduce((sum, p) => sum + (p.unrealizedPnlUSD || 0), 0)

  return { portfolio, positions, totalValueUSD, totalRealizedPnlUSD, totalUnrealizedPnlUSD }
}

async function sandboxCurl(
  sandbox: Sandbox,
  apiKey: string,
  opts: { path: string; params: Record<string, string> },
): Promise<unknown> {
  const qs = new URLSearchParams(opts.params).toString()
  const url = `${MOBULA_BASE}${opts.path}?${qs}`

  const result = await sandbox.commands.run("curl", {
    args: ["-s", "-H", `Authorization: ${apiKey}`, url],
  })

  if (result.exitCode !== 0) {
    throw new Error(`Mobula API call failed (exit ${result.exitCode}): ${result.stderr}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(result.stdout)
  } catch {
    throw new Error(`Mobula API returned non-JSON output for ${opts.path}`)
  }
  if (isRecord(parsed) && typeof parsed.error === "string" && parsed.error) {
    throw new Error(`Mobula API error: ${parsed.error}`)
  }
  return parsed
}

// ── Response parsing ──
// Mobula has shipped more than one response shape for the same endpoint, so
// every field is read defensively through `unknown` narrowing. The fallback
// chains below encode the shapes we've seen in the wild.

type Record_ = Record<string, unknown>

function isRecord(value: unknown): value is Record_ {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asRecord(value: unknown): Record_ {
  return isRecord(value) ? value : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function numOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback
}

function strOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

// `a.asset` is the nested shape; when absent, the asset fields sit directly
// on the item (flat shape).
function assetFields(a: Record_): Record_ {
  return isRecord(a.asset) ? asRecord(a.asset) : a
}

function parsePortfolio(raw: unknown): MobulaAsset[] {
  const root = asRecord(raw)
  const data = asRecord(root.data)
  const items = asArray(data.assets ?? root.assets)
  return items.map((item) => {
    const a = asRecord(item)
    const asset = assetFields(a)
    return {
      asset: {
        id: num(asset.id),
        name: str(asset.name, "Unknown"),
        symbol: str(asset.symbol, "???"),
        contract: str(asset.contract, ""),
        blockchain: str(asset.blockchain, ""),
        logo: strOrNull(asset.logo),
        price: numOrNull(asset.price),
        marketCap: numOrNull(asset.marketCap),
        liquidity: numOrNull(asset.liquidity),
      },
      walletBalance: num(a.walletBalance ?? a.balance),
      walletBalanceRaw: str(a.walletBalanceRaw ?? a.rawBalance, "0"),
      amountUSD: num(a.amountUSD ?? a.valueUSD),
    }
  })
}

function parsePositions(raw: unknown): MobulaPosition[] {
  const root = asRecord(raw)
  const items = asArray(root.data ?? root.positions)
  return items.map((item) => {
    const p = asRecord(item)
    const token = asRecord(p.token)
    return {
      token: {
        name: str(token.name, "Unknown"),
        symbol: str(token.symbol, "???"),
        contract: str(token.contract ?? token.address, ""),
        blockchain: str(token.blockchain ?? p.blockchain, ""),
        logo: strOrNull(token.logo),
        price: numOrNull(token.price),
        liquidity: numOrNull(token.liquidity),
      },
      balance: num(p.balance),
      amountUSD: num(p.amountUSD ?? p.valueUSD),
      buys: num(p.buys),
      sells: num(p.sells),
      buyVolumeUSD: num(p.buyVolumeUSD ?? p.buyVolume),
      sellVolumeUSD: num(p.sellVolumeUSD ?? p.sellVolume),
      realizedPnlUSD: num(p.realizedPnlUSD ?? p.realizedPnl),
      unrealizedPnlUSD: num(p.unrealizedPnlUSD ?? p.unrealizedPnl),
      totalPnlUSD: num(p.totalPnlUSD ?? p.totalPnl),
      firstActivity: strOrNull(p.firstActivity ?? p.firstActivityDate),
      lastActivity: strOrNull(p.lastActivity ?? p.lastActivityDate),
    }
  })
}
