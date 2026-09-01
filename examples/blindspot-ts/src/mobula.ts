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

export async function fetchOnchainData(
  sandbox: Sandbox,
  address: string,
  apiKey: string,
): Promise<MobulaData> {
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
  const totalRealizedPnlUSD = positions.reduce(
    (sum, p) => sum + (p.realizedPnlUSD || 0), 0,
  )
  const totalUnrealizedPnlUSD = positions.reduce(
    (sum, p) => sum + (p.unrealizedPnlUSD || 0), 0,
  )

  return { portfolio, positions, totalValueUSD, totalRealizedPnlUSD, totalUnrealizedPnlUSD }
}

async function sandboxCurl(
  sandbox: Sandbox,
  apiKey: string,
  opts: { path: string; params: Record<string, string> },
): Promise<any> {
  const qs = new URLSearchParams(opts.params).toString()
  const url = `${MOBULA_BASE}${opts.path}?${qs}`

  const result = await sandbox.commands.run("curl", {
    args: ["-s", "-H", `Authorization: ${apiKey}`, url],
  })

  if (result.exitCode !== 0) {
    throw new Error(`Mobula API call failed (exit ${result.exitCode}): ${result.stderr}`)
  }

  const parsed = JSON.parse(result.stdout)
  if (parsed.error) {
    throw new Error(`Mobula API error: ${parsed.error}`)
  }
  return parsed
}

function parsePortfolio(raw: any): MobulaAsset[] {
  const assets = raw?.data?.assets ?? raw?.assets ?? []
  return assets.map((a: any) => ({
    asset: {
      id: a.asset?.id ?? a.id ?? 0,
      name: a.asset?.name ?? a.name ?? "Unknown",
      symbol: a.asset?.symbol ?? a.symbol ?? "???",
      contract: a.asset?.contract ?? a.contract ?? "",
      blockchain: a.asset?.blockchain ?? a.blockchain ?? "",
      logo: a.asset?.logo ?? a.logo ?? null,
      price: a.asset?.price ?? a.price ?? null,
      marketCap: a.asset?.marketCap ?? a.marketCap ?? null,
      liquidity: a.asset?.liquidity ?? a.liquidity ?? null,
    },
    walletBalance: a.walletBalance ?? a.balance ?? 0,
    walletBalanceRaw: a.walletBalanceRaw ?? a.rawBalance ?? "0",
    amountUSD: a.amountUSD ?? a.valueUSD ?? 0,
  }))
}

function parsePositions(raw: any): MobulaPosition[] {
  const items = raw?.data ?? raw?.positions ?? []
  const arr = Array.isArray(items) ? items : []
  return arr.map((p: any) => ({
    token: {
      name: p.token?.name ?? "Unknown",
      symbol: p.token?.symbol ?? "???",
      contract: p.token?.contract ?? p.token?.address ?? "",
      blockchain: p.token?.blockchain ?? p.blockchain ?? "",
      logo: p.token?.logo ?? null,
      price: p.token?.price ?? null,
      liquidity: p.token?.liquidity ?? null,
    },
    balance: p.balance ?? 0,
    amountUSD: p.amountUSD ?? p.valueUSD ?? 0,
    buys: p.buys ?? 0,
    sells: p.sells ?? 0,
    buyVolumeUSD: p.buyVolumeUSD ?? p.buyVolume ?? 0,
    sellVolumeUSD: p.sellVolumeUSD ?? p.sellVolume ?? 0,
    realizedPnlUSD: p.realizedPnlUSD ?? p.realizedPnl ?? 0,
    unrealizedPnlUSD: p.unrealizedPnlUSD ?? p.unrealizedPnl ?? 0,
    totalPnlUSD: p.totalPnlUSD ?? p.totalPnl ?? 0,
    firstActivity: p.firstActivity ?? p.firstActivityDate ?? null,
    lastActivity: p.lastActivity ?? p.lastActivityDate ?? null,
  }))
}
