// Page surface extraction — the comparable slice of a page as one location
// saw it. The page handle is a minimal structural interface so the logic is
// unit-testable without a browser.

export interface WitnessPage {
  goto(url: string, options?: { timeout?: number; waitUntil?: string }): Promise<unknown>
  locator(selector: string): { innerText(): Promise<string> }
  evaluate<T>(fn: () => T): Promise<T>
}

export interface PageSurface {
  title: string
  description: string
  canonical?: string
  currencies: string[]
  prices: string[]
  headings: string[]
  bodyLength: number
}

const ISO_CURRENCY_REGEX =
  /\b(USD|EUR|GBP|JPY|CHF|CAD|AUD|CNY|SGD|INR|BRL|MXN|KRW|HKD|SEK|NOK|DKK|PLN|ZAR|AED)\b/g
const PRICE_REGEX = /(?:[$€£¥₹]|USD ?|EUR ?|GBP ?|CHF ?)\s?\d[\d,]*(?:\.\d{2})?/g

export async function extractPageSurface(page: WitnessPage, url: string): Promise<PageSurface> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 })
  // Let late-injected geo content (price switches, consent walls) settle.
  await new Promise((r) => setTimeout(r, 1500))

  const surface = await page.evaluate<PageSurface>(() => {
    const canonical =
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href || undefined

    const description =
      document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content ||
      document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ||
      ""

    const headings = Array.from(document.querySelectorAll("h1, h2"))
      .slice(0, 12)
      .map((h) => (h.textContent ?? "").trim().toLowerCase())
      .filter(Boolean)

    const text = document.body?.innerText ?? ""

    return {
      title: document.title,
      description,
      canonical,
      currencies: [],
      prices: [],
      headings,
      bodyLength: text.length,
    }
  })

  // Regex passes run on the extracted text surface — kept outside evaluate()
  // so they are deterministic and unit-testable in isolation.
  const raw = await page.evaluate(() => document.body?.innerText ?? "")
  const currencies = [...new Set(raw.match(ISO_CURRENCY_REGEX) ?? [])].slice(0, 5)
  const prices = (raw.match(PRICE_REGEX) ?? []).slice(0, 8).map((p) => p.replace(/\s+/g, " ").trim())

  return { ...surface, currencies, prices }
}
