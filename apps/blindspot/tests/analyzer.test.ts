import { describe, expect, it } from "vitest"
import { assessRisk } from "../src/lib/analyzer.js"
import type { EnsRecord, MobulaAsset, MobulaData, MobulaPosition, OffChainContext } from "../src/lib/types.js"

function ensRecord(overrides: Partial<EnsRecord> = {}): EnsRecord {
  return {
    name: "target.eth",
    address: "0xabc",
    avatar: null,
    website: "https://target.example",
    twitter: "target",
    github: null,
    discord: null,
    email: null,
    description: "a target",
    aliases: [],
    ...overrides,
  }
}

function asset(symbol: string, amountUSD: number): MobulaAsset {
  return {
    asset: {
      id: 1,
      name: symbol,
      symbol,
      contract: "0x0",
      blockchain: "ethereum",
      logo: null,
      price: null,
      marketCap: null,
      liquidity: null,
    },
    walletBalance: 1,
    walletBalanceRaw: "1",
    amountUSD,
  }
}

function position(overrides: Partial<MobulaPosition> = {}): MobulaPosition {
  return {
    token: {
      name: "Token",
      symbol: "TKN",
      contract: "0x0",
      blockchain: "ethereum",
      logo: null,
      price: null,
      liquidity: 1_000_000,
    },
    balance: 1,
    amountUSD: 100,
    buys: 0,
    sells: 0,
    buyVolumeUSD: 0,
    sellVolumeUSD: 0,
    realizedPnlUSD: 0,
    unrealizedPnlUSD: 0,
    totalPnlUSD: 0,
    firstActivity: null,
    lastActivity: null,
    ...overrides,
  }
}

function mobulaData(overrides: Partial<MobulaData> = {}): MobulaData {
  return {
    portfolio: [],
    positions: [],
    totalValueUSD: 0,
    totalRealizedPnlUSD: 0,
    totalUnrealizedPnlUSD: 0,
    ...overrides,
  }
}

function offchain(overrides: Partial<OffChainContext> = {}): OffChainContext {
  return {
    url: "https://target.example",
    title: "Target",
    description: "",
    ogImage: null,
    socialLinks: [],
    rawSnippet: "some content",
    fetchedVia: "stealth-proxy:us",
    egressIp: "1.2.3.4",
    ...overrides,
  }
}

describe("assessRisk", () => {
  it("scores a clean target low", () => {
    const risk = assessRisk(
      ensRecord(),
      mobulaData({
        portfolio: [asset("ETH", 50), asset("USDC", 50)],
        totalValueUSD: 100,
      }),
      [offchain()],
    )
    expect(risk.overallScore).toBeLessThan(30)
    expect(risk.signals).toHaveLength(0)
  })

  it("flags heavy concentration in one token", () => {
    const risk = assessRisk(
      ensRecord(),
      mobulaData({
        portfolio: [asset("SCAM", 90), asset("ETH", 10)],
        totalValueUSD: 100,
      }),
      [offchain()],
    )
    const signal = risk.signals.find((s) => s.label === "High concentration")
    expect(signal).toBeDefined()
    expect(signal?.severity).toBe("medium")
  })

  it("flags large realized losses as high severity", () => {
    const risk = assessRisk(ensRecord(), mobulaData({ totalRealizedPnlUSD: -25_000 }), [offchain()])
    const signal = risk.signals.find((s) => s.label === "Significant realized losses")
    expect(signal?.severity).toBe("high")
    // One high signal weighs 40 points on its own
    expect(risk.overallScore).toBeGreaterThanOrEqual(40)
  })

  it("flags buy-only bag holder patterns", () => {
    const risk = assessRisk(
      ensRecord(),
      mobulaData({
        positions: [
          position({ buys: 20, sells: 0 }),
          position({ buys: 15, sells: 0 }),
          position({ buys: 11, sells: 0 }),
        ],
      }),
      [offchain()],
    )
    expect(risk.signals.some((s) => s.label === "Buy-only positions")).toBe(true)
  })

  it("does not flag sellable positions as bag holders", () => {
    const risk = assessRisk(
      ensRecord(),
      mobulaData({
        positions: [position({ buys: 20, sells: 5 }), position({ buys: 15, sells: 2 })],
      }),
      [offchain()],
    )
    expect(risk.signals.some((s) => s.label === "Buy-only positions")).toBe(false)
  })

  it("flags targets with no ENS records and no off-chain presence", () => {
    const risk = assessRisk(ensRecord({ website: null, twitter: null, description: null }), mobulaData(), [])
    expect(risk.signals.some((s) => s.label === "No ENS text records")).toBe(true)
    expect(risk.signals.some((s) => s.label === "No verifiable off-chain presence")).toBe(true)
  })

  it("never scores above 100", () => {
    const risk = assessRisk(
      ensRecord({
        website: null,
        twitter: null,
        github: null,
        description: null,
        aliases: ["a.eth", "b.eth", "c.eth", "d.eth"],
      }),
      mobulaData({ totalRealizedPnlUSD: -100_000 }),
      [],
    )
    expect(risk.overallScore).toBeLessThanOrEqual(100)
  })
})
