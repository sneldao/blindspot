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
        sendEvent({ type: "error", message: (err as Error).message })
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
