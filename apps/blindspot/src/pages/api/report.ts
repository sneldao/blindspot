// Report endpoint — serves a generated HTML report file.
// GET /api/report?path=reports/blindspot-<name>-<timestamp>.html
//
// The endpoint is unauthenticated and the path comes from the client, so it is
// constrained to the reports output directory (and .html files). Without that
// constraint, ?path=.env would hand out any file on the server.

import type { APIRoute } from "astro"
import { readFile } from "node:fs/promises"
import { resolve, sep } from "node:path"

// Must match the outputDir the investigate route passes to the orchestrator.
const OUTPUT_DIR = resolve("reports")

export const GET: APIRoute = async ({ url }) => {
  const path = url.searchParams.get("path")
  if (!path) {
    return new Response("path parameter required", { status: 400 })
  }

  const filepath = resolve(path)
  const insideReports = filepath === OUTPUT_DIR || filepath.startsWith(OUTPUT_DIR + sep)
  if (!insideReports || !filepath.endsWith(".html")) {
    return new Response("path outside reports directory", { status: 403 })
  }

  try {
    const html = await readFile(filepath, "utf-8")
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  } catch {
    return new Response("report not found", { status: 404 })
  }
}
