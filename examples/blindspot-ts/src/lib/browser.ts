// Solari stealth browser wrapper — off-chain context enrichment.
//
// The stealth browser is the privacy mechanism for "who is investigating." It
// runs with `stealth: true` (fingerprint patches + headful on real GPU) and a
// residential proxy (`proxy: "us"`) so the target website sees a residential
// IP, not the investigator's and not a datacenter.
//
// Recording is enabled per-session (`recording: true`) so the replay can be
// downloaded afterward and used as the demo video. The replay is rrweb NDJSON,
// not a video file — small and diffable.
//
// CRITICAL: `solari.close()` must be called or the Node process hangs forever
// (the client keeps a loopback proxy open for connection retries).

import { Solari } from "@solarisdk/browser"
import type { OffChainContext, EnsRecord } from "./types.js"

export interface BrowserHandle {
  solari: Solari
  browser: any // Playwright Browser
  sessionId: string
  proxy: any
}

export async function createStealthBrowser(apiKey: string): Promise<BrowserHandle> {
  const solari = new Solari({ apiKey })

  const browser = await solari.launch({
    stealth: true,
    proxy: "us",
    recording: true,
    // captcha: true, // enable if we hit bot checks
  })

  console.log(`  [browser] stealth session ${browser.id}`)
  console.log(`  [browser] proxy: ${JSON.stringify(browser.proxy)}`)

  return { solari, browser, sessionId: browser.id, proxy: browser.proxy }
}

export async function enrichOffChain(
  handle: BrowserHandle,
  target: EnsRecord,
): Promise<OffChainContext[]> {
  const contexts: OffChainContext[] = []
  const page = await handle.browser.newPage()

  // First, confirm the egress IP is the proxy's, not ours.
  await page.goto("https://api.ipify.org?format=json")
  const egressIp = JSON.parse(await page.locator("pre").innerText()).ip
  console.log(`  [browser] egress IP: ${egressIp} (residential proxy)`)

  // Collect URLs to visit from ENS text records.
  const urls: string[] = []
  if (target.website) urls.push(target.website)
  if (target.twitter) {
    urls.push(`https://x.com/${target.twitter.replace(/^@/, "")}`)
  }
  if (target.github) {
    urls.push(`https://github.com/${target.github.replace(/^@/, "")}`)
  }

  for (const url of urls.slice(0, 3)) {
    try {
      console.log(`  [browser] visiting ${url} via stealth proxy...`)
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 })
      await page.waitForTimeout(1500) // let metadata settle

      const meta = await page.evaluate(() => {
        const getMeta = (name: string) =>
          document.querySelector(`meta[property="${name}"]`)?.getAttribute("content") ||
          document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") ||
          null

        const socialLinks = Array.from(document.querySelectorAll('a[href*="twitter.com"], a[href*="x.com"], a[href*="github.com"], a[href*="discord.com"], a[href*="t.me"]'))
          .map((a) => (a as HTMLAnchorElement).href)
          .filter((h) => h && !h.includes("/share"))
          .slice(0, 5)

        return {
          title: document.title,
          description: getMeta("og:description") || getMeta("description"),
          ogImage: getMeta("og:image"),
          socialLinks: [...new Set(socialLinks)],
          rawSnippet: document.body?.innerText?.slice(0, 500) ?? "",
        }
      })

      contexts.push({
        url,
        title: meta.title,
        description: meta.description,
        ogImage: meta.ogImage,
        socialLinks: meta.socialLinks,
        rawSnippet: meta.rawSnippet,
        fetchedVia: `stealth-proxy:${handle.proxy?.country ?? "us"}`,
        egressIp,
      })
    } catch (err) {
      console.log(`  [browser] could not enrich ${url}: ${(err as Error).message}`)
    }
  }

  await page.close()
  return contexts
}

export async function closeBrowser(handle: BrowserHandle): Promise<void> {
  // browser.close() also RELEASES the session.
  await handle.browser.close()
  // REQUIRED in Node — the loopback proxy keeps the event loop alive.
  await handle.solari.close()
  console.log(`  [browser] closed session ${handle.sessionId}`)
}

export async function downloadRecording(
  handle: BrowserHandle,
): Promise<{ sessionId: string; available: boolean }> {
  // The upload happens asynchronously AFTER the session is released, so we
  // poll for ~30s before concluding there's no replay.
  for (let attempt = 1; attempt <= 10; attempt++) {
    await new Promise((r) => setTimeout(r, 3000))
    try {
      const blob = await handle.solari.sessions.downloadReplay(handle.sessionId)
      const events = blob.toString().split("\n").filter(Boolean)
      console.log(`  [browser] recording: ${blob.length} bytes, ${events.length} rrweb events`)
      return { sessionId: handle.sessionId, available: true }
    } catch (err: any) {
      if (err.status === 404) {
        console.log(`  [browser] replay not uploaded yet (attempt ${attempt})`)
        continue
      }
      throw err
    }
  }
  console.log("  [browser] no replay after ~30s")
  return { sessionId: handle.sessionId, available: false }
}
