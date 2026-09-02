// Solari sandbox wrapper — ephemeral execution for onchain analysis.
//
// The sandbox is the privacy mechanism for "what was investigated." It boots
// from a memory snapshot in ~1s, runs the Mobula queries, and is then killed
// with `kill()` — not `close()`, which would only drop the local channel and
// leave the VM running until its idle timeout.
//
// Key gotcha: `commands.run` is NOT shell-interpreted. `run("curl -s ...")`
// would look for a binary named "curl -s". Args go in `args`.

import { SolariClient } from "@solarisdk/sdk"
import type { Sandbox } from "@solarisdk/sdk"

export interface SandboxHandle {
  sandbox: Sandbox
  id: string
}

export async function createSandbox(apiKey: string): Promise<SandboxHandle> {
  const pt = new SolariClient({ apiKey })
  const sandbox = await pt.sandboxes.create({
    template: "base",
    // Rolling idle window — resets on every use, not a hard deadline.
    // 5 minutes is plenty for a single investigation.
    timeoutMs: 5 * 60_000,
  })

  console.log(`  [sandbox] booted ${sandbox.sandboxId} (from snapshot)`)

  // Connect the control channel — needed for commands.
  await sandbox.connect()

  // Verify curl is available (base template should have it).
  const check = await sandbox.commands.run("curl", { args: ["--version"] })
  if (check.exitCode !== 0) {
    throw new Error("curl not found in sandbox — base template expected it")
  }

  return { sandbox, id: sandbox.sandboxId }
}

export async function destroySandbox(handle: SandboxHandle): Promise<void> {
  // kill() destroys the remote VM. close() alone would only drop the local
  // control channel and leave it running until the idle timeout.
  await handle.sandbox.kill()
  console.log(`  [sandbox] destroyed ${handle.id} — no state persists`)
}
