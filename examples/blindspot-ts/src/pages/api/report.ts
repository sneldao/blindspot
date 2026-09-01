// Report endpoint — serves a generated HTML report file.
// GET /api/report?path=/path/to/report.html

import type { APIRoute } from "astro"
import { readFile } from "node:fs/promises"

export const GET: APIRoute = async ({ url }) => {
  const path = url.searchParams.get("path")
  if (!path) {
    return new Response("path parameter required", { status: 400 })
  }

  try {
    const html = await readFile(path, "utf-8")
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  } catch {
    return new Response("report not found", { status: 404 })
  }
}
