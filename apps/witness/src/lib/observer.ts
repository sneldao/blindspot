// One stealth browser, one egress location, one observation.
//
// The witness's alibi mechanism: `stealth: true` + a residential proxy for the
// location's country. The target sees the proxy's residential IP — never the
// operator's, never a datacenter's.
//
// Lifecycle note (from Blindspot's field-tested gotchas): browser.close()
// releases the session, then solari.close() must run or the Node process
// hangs forever — the client keeps a loopback proxy open.

import { Solari } from "@solarisdk/browser"
import type { LocationObservation } from "./types.js"
import { extractPageSurface } from "./extract.js"

export async function observeFrom(
  apiKey: string,
  url: string,
  code: string,
  label: string,
): Promise<LocationObservation> {
  const startedAt = Date.now()
  const base: LocationObservation = {
    code,
    label,
    ok: false,
    currencies: [],
    prices: [],
    headings: [],
    bodyLength: 0,
    durationMs: 0,
  }

  const solari = new Solari({ apiKey })
  let browser: Awaited<ReturnType<Solari["launch"]>> | undefined
  try {
    browser = await solari.launch({ stealth: true, proxy: code })
    const page = await browser.newPage()

    // Confirm the alibi: the egress IP must be the proxy's, not ours.
    await page.goto("https://api.ipify.org?format=json", { timeout: 15_000 })
    const egressIp = JSON.parse(await page.locator("pre").innerText()).ip as string

    const surface = await extractPageSurface(page, url)
    return {
      ...base,
      ok: true,
      egressIp,
      ...surface,
      durationMs: Date.now() - startedAt,
    }
  } catch (err) {
    return { ...base, error: (err as Error).message, durationMs: Date.now() - startedAt }
  } finally {
    if (browser) {
      try {
        await browser.close()
      } catch {
        // session already gone
      }
    }
    await solari.close()
  }
}
