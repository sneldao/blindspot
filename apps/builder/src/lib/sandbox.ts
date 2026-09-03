// Sandbox management — the body the builder's app lives in, and dies with.
//
// Field-tested gotchas carried from Blindspot and the cookbook examples:
//   - `commands.run` is NOT shell-interpreted; pipes/redirects need
//     run("sh", { args: ["-c", "..."] }).
//   - Servers must be backgrounded or run() blocks until the idle timeout.
//   - kill() destroys the remote VM; close() alone leaves it running.

import { SolariClient } from "@solarisdk/sdk"
import type { LiveApp } from "./types.js"

export interface BootedApp {
  live: LiveApp
  /** Destroys the remote VM. Safe to call more than once. */
  destroy: () => Promise<void>
}

export async function bootApp(apiKey: string, html: string, onWrite: (bytes: number) => void): Promise<BootedApp> {
  const startedAt = Date.now()
  const client = new SolariClient({ apiKey })
  const sandbox = await client.sandboxes.create({
    template: "base",
    timeoutMs: 5 * 60_000,
  })

  let killed = false
  const destroy = async (): Promise<void> => {
    if (killed) return
    killed = true
    try {
      await sandbox.kill()
    } catch {
      // already gone
    }
  }

  try {
    await sandbox.connect()

    await sandbox.files.write("/tmp/app/index.html", html)
    onWrite(html.length)

    // Serve it in the background — run() waits for process exit otherwise.
    await sandbox.commands.run("sh", {
      args: ["-c", "cd /tmp/app && nohup python3 -m http.server 3000 >/dev/null 2>&1 &"],
    })

    const { url } = await sandbox.previewUrl(3000)

    // Prove the URL is really public before showing it to the visitor.
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1000))
      try {
        const res = await fetch(url)
        if (res.ok) {
          return {
            live: { sandboxId: sandbox.sandboxId, previewUrl: url, bootMs: Date.now() - startedAt },
            destroy,
          }
        }
      } catch {
        // not up yet
      }
    }
    throw new Error("The preview server did not come up in time.")
  } catch (err) {
    // Never leave a VM behind on failure.
    await destroy()
    throw err
  }
}

