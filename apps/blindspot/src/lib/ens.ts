// ENS resolution layer — the discovery and identity backbone of Blindspot.
//
// ENS is load-bearing here, not cosmetic: the investigator queries by *name*,
// not raw address. Text records (website, socials, avatar) drive the off-chain
// enrichment the stealth browser performs. Reverse lookup catches aliases —
// multiple names on one address is a signal worth surfacing.
//
// Resolution uses a public Ethereum RPC. This call is NOT privacy-sensitive
// (it's a generic lookup that doesn't reveal intent), so it runs locally rather
// than inside the ephemeral sandbox. The privacy-sensitive work — Mobula calls
// and web browsing — happens in the sandbox and stealth browser respectively.

import { ethers } from "ethers"
import type { EnsRecord } from "./types.js"

const RPC_URL = process.env.ETHEREUM_RPC_URL || "https://ethereum-rpc.publicnode.com"

// Cheap pre-flight validation before an RPC round-trip. ENS names are
// unicode (labels can hold emoji), so this is deliberately permissive — it
// rejects control characters, whitespace, and structurally impossible names,
// not unusual scripts.
export function isValidEnsName(name: string): boolean {
  const normalized = name.trim().toLowerCase()
  if (normalized.length === 0 || normalized.length > 255) return false
  if (/\s/.test(normalized)) return false
  if (/[\u0000-\u001f\u007f]/.test(normalized)) return false
  if (/[<>"'`\\{}|~^\[\]]/.test(normalized)) return false
  // No empty labels — "a..eth" or a trailing dot besides a lone "." root.
  const labels = normalized.replace(/\.$/, "").split(".")
  return labels.every((label) => label.length > 0)
}

export async function resolveEns(name: string): Promise<EnsRecord> {
  const provider = new ethers.JsonRpcProvider(RPC_URL)

  // Normalize — ENS names are lowercase, strip trailing dots/eth suffix is kept.
  const normalizedName = name.toLowerCase().replace(/^\.+/, "")

  // 1. Forward resolution: name → address
  const address = await provider.resolveName(normalizedName)
  if (!address || address === ethers.ZeroAddress) {
    throw new Error(`No address found for ENS name: ${normalizedName}`)
  }

  // 2. Text records — these drive the stealth browser enrichment
  const resolver = await provider.getResolver(normalizedName)
  const [avatar, website, twitter, github, discord, email, description] = await Promise.all([
    resolver ? resolver.getAvatar().catch(() => null) : Promise.resolve(null),
    safeText(resolver, "url"),
    safeText(resolver, "com.twitter"),
    safeText(resolver, "com.github"),
    safeText(resolver, "com.discord"),
    safeText(resolver, "email"),
    safeText(resolver, "description"),
  ])

  // 3. Reverse lookup — what other names point to this address?
  const reverseName = await provider.lookupAddress(address)
  const aliases: string[] = []
  if (reverseName && reverseName !== normalizedName) {
    aliases.push(reverseName)
  }

  return {
    name: normalizedName,
    address,
    avatar,
    website,
    twitter,
    github,
    discord,
    email,
    description,
    aliases,
  }
}

async function safeText(resolver: ethers.EnsResolver | null, key: string): Promise<string | null> {
  if (!resolver) return null
  try {
    const value = await resolver.getText(key)
    return value || null
  } catch {
    return null
  }
}
