// SSE endpoint — streams the geo-diff as it happens.
//
// Same boundary rules as Blindspot: the client never sees stack traces or
// keys, only human sentences. The API key stays server-side.

import type { APIRoute } from "astro"
import { runWitness } from "../../lib/orchestrator.js"
import type { WitnessEvent } from "../../lib/events.js"

export const GET: APIRoute = ({ url, request }) => {
  const target = url.searchParams.get("url")
  if (!target) {
    return new Response(JSON.stringify({ error: "Missing url parameter." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    })
  }

  const apiKey = import.meta.env.SOLARI_API_KEY as string | undefined
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Witness is not configured. Add SOLARI_API_KEY to apps/witness/.env." }),
      { status: 500, headers: { "content-type": "application/json" } },
    )
  }

  const abort = new AbortController()
  request.signal.addEventListener("abort", () => abort.abort())

  const encoder = new TextEncoder()
  const body = new ReadableStream({
    async start(controller) {
      const send = (event: WitnessEvent) => {
        if (!abort.signal.aborted) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }
      }
      try {
        await runWitness(apiKey, target, send)
      } catch (err) {
        // Sanitized at the boundary.
        send({ type: "error", message: "The witness lost its way. Try again." })
        console.error("[witness] observe failed:", err)
      } finally {
        if (!abort.signal.aborted) controller.close()
      }
    },
    cancel() {
      abort.abort()
    },
  })

  return new Response(body, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  })
}
