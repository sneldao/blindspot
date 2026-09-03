// SSE endpoint — streams the build as it happens. Errors are sanitized at
// the boundary; the client never sees stack traces or keys.

import type { APIRoute } from "astro"
import { runBuilder } from "../../lib/orchestrator.js"
import type { BuilderEvent } from "../../lib/events.js"

export const GET: APIRoute = ({ url, request }) => {
  const prompt = url.searchParams.get("prompt")
  if (!prompt) {
    return new Response(JSON.stringify({ error: "Missing prompt parameter." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    })
  }

  const apiKey = import.meta.env.SOLARI_API_KEY as string | undefined
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Builder is not configured. Add SOLARI_API_KEY to apps/builder/.env." }),
      { status: 500, headers: { "content-type": "application/json" } },
    )
  }

  const abort = new AbortController()
  request.signal.addEventListener("abort", () => abort.abort())

  const encoder = new TextEncoder()
  const body = new ReadableStream({
    async start(controller) {
      const send = (event: BuilderEvent) => {
        if (!abort.signal.aborted) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }
      }
      try {
        await runBuilder(apiKey, prompt, send)
      } catch (err) {
        send({ type: "error", message: "The builder lost its tools. Try again." })
        console.error("[builder] build failed:", err)
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
