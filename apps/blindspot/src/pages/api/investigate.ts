// SSE endpoint — streams investigation events to the browser.
// GET /api/investigate?name=vitalik.eth

import type { APIRoute } from "astro"
import { investigate } from "../../lib/orchestrator.js"
import type { InvestigationEvent } from "../../lib/events.js"

export const GET: APIRoute = async ({ url }) => {
  const ensName = url.searchParams.get("name")
  if (!ensName) {
    return new Response(JSON.stringify({ error: "name parameter required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const sendEvent = (event: InvestigationEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        await investigate(ensName, {
          outputDir: "reports",
          onEvent: sendEvent,
        })
      } catch (err) {
        sendEvent({ type: "error", message: userMessage(err) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}

// The browser is a system boundary: internal exception text (missing keys,
// DNS failures, stack details) must not reach it verbatim.
function userMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  if (/api\s?key/i.test(message)) {
    return "Blindspot is not configured on this server yet — the investigation API key is missing."
  }
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network/i.test(message)) {
    return "An upstream data provider could not be reached. Try again in a moment."
  }
  return "The investigation could not be completed. Please try again."
}
