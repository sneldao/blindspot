// Local web server — serves the 3D UI, bundled client JS, and SSE events.
//
// No framework. Vanilla Node http module. Routes:
//   GET /            → the HTML shell
//   GET /bundle.js   → the esbuild-bundled client JS
//   GET /investigate → SSE stream of investigation events
//   GET /report      → serves a generated HTML report

import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { readFile } from "node:fs/promises"
import { join, dirname, extname } from "node:path"
import { fileURLToPath } from "node:url"
import { investigate } from "./orchestrator.js"
import type { InvestigationEvent } from "./events.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = parseInt(process.env.PORT || "4567", 10)

export async function startServer(): Promise<void> {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url!, `http://localhost:${PORT}`)

    if (req.method === "GET" && url.pathname === "/") {
      return serveFile(res, join(__dirname, "ui.html"), "text/html; charset=utf-8")
    }

    if (req.method === "GET" && url.pathname === "/bundle.js") {
      return serveFile(res, join(__dirname, "bundle.js"), "application/javascript; charset=utf-8")
    }

    if (req.method === "GET" && url.pathname === "/investigate") {
      return handleInvestigate(url, res)
    }

    if (req.method === "GET" && url.pathname === "/report") {
      return serveReport(url, res)
    }

    res.writeHead(404)
    res.end("not found")
  })

  server.listen(PORT, () => {
    console.log(`\n  Blindspot UI: http://localhost:${PORT}\n`)
    console.log(`  Open it in your browser, enter an ENS name, and scroll.`)
    console.log(`  Ctrl+C to exit.\n`)
  })
}

async function serveFile(res: ServerResponse, path: string, contentType: string) {
  try {
    const data = await readFile(path)
    res.writeHead(200, { "Content-Type": contentType })
    res.end(data)
  } catch {
    res.writeHead(404)
    res.end(`File not found: ${path}`)
  }
}

async function handleInvestigate(url: URL, res: ServerResponse) {
  const ensName = url.searchParams.get("name")
  if (!ensName) {
    res.writeHead(400, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: "name parameter required" }))
    return
  }

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

async function serveReport(url: URL, res: ServerResponse) {
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
