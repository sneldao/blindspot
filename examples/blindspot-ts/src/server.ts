// Local web server — serves the live UI and streams investigation events
// via Server-Sent Events.
//
// No framework. Vanilla Node http module. Two routes:
//   GET /          → the single-page UI (HTML + CSS + JS inline)
//   POST /investigate → starts an investigation, streams events via SSE
//
// The server stays alive after the investigation completes so the user can
// start a new one without restarting. Ctrl+C to exit.

import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { readFile } from "node:fs/promises"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { investigate } from "./orchestrator.js"
import type { InvestigationEvent } from "./events.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = parseInt(process.env.PORT || "4567", 10)

export async function startServer(): Promise<void> {
  const server = createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/") {
      return serveUI(req, res)
    }

    if (req.method === "POST" && req.url?.startsWith("/investigate")) {
      return handleInvestigate(req, res)
    }

    if (req.method === "GET" && req.url?.startsWith("/report")) {
      return serveReport(req, res)
    }

    res.writeHead(404)
    res.end("not found")
  })

  server.listen(PORT, () => {
    console.log(`\n  Blindspot UI: http://localhost:${PORT}\n`)
    console.log(`  Open it in your browser, enter an ENS name, and watch.`)
    console.log(`  Ctrl+C to exit.\n`)
  })
}

async function serveUI(_req: IncomingMessage, res: ServerResponse) {
  try {
    const html = await readFile(join(__dirname, "ui.html"), "utf-8")
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
    res.end(html)
  } catch {
    res.writeHead(500)
    res.end("UI file not found. Run from the project root.")
  }
}

async function handleInvestigate(req: IncomingMessage, res: ServerResponse) {
  // Parse the ENS name from query string
  const url = new URL(req.url!, `http://localhost:${PORT}`)
  const ensName = url.searchParams.get("name")

  if (!ensName) {
    res.writeHead(400, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: "name parameter required" }))
    return
  }

  // Set up SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  })

  const sendEvent = (event: InvestigationEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`)
  }

  try {
    await investigate(ensName, {
      outputDir: "reports",
      onEvent: sendEvent,
    })
  } catch (err) {
    sendEvent({ type: "error", message: (err as Error).message })
  } finally {
    res.end()
  }
}

async function serveReport(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url!, `http://localhost:${PORT}`)
  const path = url.searchParams.get("path")

  if (!path) {
    res.writeHead(400)
    res.end("path parameter required")
    return
  }

  try {
    const html = await readFile(path, "utf-8")
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
    res.end(html)
  } catch {
    res.writeHead(404)
    res.end("report not found")
  }
}
