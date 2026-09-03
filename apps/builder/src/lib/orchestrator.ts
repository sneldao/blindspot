// The orchestrator — plan, write, boot, show, destroy.
//
// The choreography IS the thesis: the visitor watches software be born,
// uses it, and then watches the machine that hosted it be destroyed.
// The teardown beat is not cleanup — it is the finale.

import { plan } from "./blueprint.js"
import { renderApp } from "./render.js"
import { bootApp } from "./sandbox.js"
import type { EventCallback } from "./events.js"

export async function runBuilder(apiKey: string, prompt: string, onEvent: EventCallback): Promise<void> {
  if (!prompt.trim() || prompt.length > 200) {
    onEvent({ type: "error", message: "Give the builder a prompt between 1 and 200 characters." })
    return
  }

  onEvent({ type: "started", prompt })

  const blueprint = plan(prompt)
  onEvent({ type: "planning", blueprint })

  const html = renderApp(blueprint)
  onEvent({ type: "writing", bytes: html.length })

  onEvent({ type: "booting" })
  let booted
  try {
    booted = await bootApp(apiKey, html, () => {})
  } catch (err) {
    onEvent({ type: "error", message: "The sandbox refused to boot. Try again." })
    console.error("[builder] boot failed:", err)
    return
  }

  onEvent({ type: "preview", sandboxId: booted.live.sandboxId, previewUrl: booted.live.previewUrl })

  // Hold the stage long enough for the visitor to click through the app.
  await new Promise((r) => setTimeout(r, 60_000))

  onEvent({ type: "teardown" })
  await booted.destroy()

  onEvent({ type: "complete" })
}
