import { useState, useRef, useCallback } from "react"
import type { Blueprint } from "../lib/types.js"

type Phase = "idle" | "building" | "live" | "teardown" | "gone"

interface State {
  phase: Phase
  blueprint: Blueprint | null
  bytes: number
  sandboxId: string | null
  previewUrl: string | null
  error: string | null
}

const initial: State = {
  phase: "idle",
  blueprint: null,
  bytes: 0,
  sandboxId: null,
  previewUrl: null,
  error: null,
}

const EXAMPLES = [
  "a todo list for my last day alive",
  "a countdown clock to deletion",
  "a guestbook that gets burned",
  "a launch page for an ephemeral startup",
]

export default function BuilderApp() {
  const [state, setState] = useState<State>(initial)
  const [prompt, setPrompt] = useState("")
  const esRef = useRef<EventSource | null>(null)

  const build = useCallback(() => {
    const p = prompt.trim()
    if (!p) return
    esRef.current?.close()

    setState({ ...initial, phase: "building" })
    const es = new EventSource(`/api/build?prompt=${encodeURIComponent(p)}`)
    esRef.current = es

    es.onmessage = (msg) => {
      const event = JSON.parse(msg.data)
      switch (event.type) {
        case "planning":
          setState((s) => ({ ...s, blueprint: event.blueprint }))
          break
        case "writing":
          setState((s) => ({ ...s, bytes: event.bytes }))
          break
        case "preview":
          setState((s) => ({
            ...s,
            phase: "live",
            sandboxId: event.sandboxId,
            previewUrl: event.previewUrl,
          }))
          break
        case "teardown":
          setState((s) => ({ ...s, phase: "teardown" }))
          break
        case "complete":
          setState((s) => ({ ...s, phase: "gone" }))
          es.close()
          break
        case "error":
          setState((s) => ({ ...s, phase: "idle", error: event.message }))
          es.close()
          break
      }
    }
    es.onerror = () => {
      setState((s) =>
        s.phase === "building" || s.phase === "live" || s.phase === "teardown"
          ? { ...s, phase: "idle", error: "Connection lost. The build may still be running — try again." }
          : s,
      )
      es.close()
    }
  }, [prompt])

  return (
    <section>
      <BuildForm prompt={prompt} setPrompt={setPrompt} onBuild={build} busy={state.phase !== "idle"} />
      {state.phase === "idle" && !state.error && (
        <div className="examples">
          {EXAMPLES.map((e) => (
            <button key={e} type="button" onClick={() => setPrompt(e)}>
              {e}
            </button>
          ))}
        </div>
      )}
      {state.error && (
        <p role="alert" className="builder-error">
          {state.error}
        </p>
      )}
      {state.blueprint && <BlueprintCard blueprint={state.blueprint} bytes={state.bytes} />}
      {state.previewUrl && <PreviewCard url={state.previewUrl} phase={state.phase} />}
      {state.phase === "teardown" && <p className="teardown">Destroying the machine that hosted it…</p>}
      {state.phase === "gone" && <Tombstone />}
      <style>{STYLES}</style>
    </section>
  )
}

const STYLES = `
  .builder-form { display: flex; gap: 0.75rem; margin: 2rem 0 1rem; }
  .builder-form input {
    flex: 1; padding: 0.75rem 1rem; border: 1px solid var(--line);
    border-radius: 8px; background: var(--paper-warm); color: var(--ink); font: inherit;
  }
  .builder-form button {
    padding: 0.75rem 1.5rem; border: none; border-radius: 8px;
    background: var(--accent); color: #fff; font: inherit; font-weight: 500; cursor: pointer;
  }
  .builder-form button:disabled { opacity: 0.6; cursor: wait; }
`

function BuildForm(props: {
  prompt: string
  setPrompt: (v: string) => void
  onBuild: () => void
  busy: boolean
}) {
  return (
    <form
      className="builder-form"
      onSubmit={(e) => {
        e.preventDefault()
        props.onBuild()
      }}
    >
      <input
        placeholder="Describe a small app…"
        value={props.prompt}
        onChange={(e) => props.setPrompt(e.target.value)}
        aria-label="App prompt"
        maxLength={200}
      />
      <button type="submit" disabled={props.busy}>
        {props.busy ? "Building…" : "Build it"}
      </button>
    </form>
  )
}

function BlueprintCard({ blueprint, bytes }: { blueprint: Blueprint; bytes: number }) {
  return (
    <div className="blueprint-card">
      <h2>{blueprint.title}</h2>
      <p>
        {blueprint.kind} · {bytes.toLocaleString()} bytes · staged into a fresh VM
      </p>
    </div>
  )
}

function PreviewCard({ url, phase }: { url: string; phase: Phase }) {
  const dead = phase === "teardown" || phase === "gone"
  return (
    <div className="preview-card">
      {dead ? (
        <p>
          <code>{url}</code>
          <br />
          <span className="builder-error">This URL is a tombstone now.</span>
        </p>
      ) : (
        <p>
          Live now —{" "}
          <a href={url} target="_blank" rel="noreferrer">
            {url}
          </a>
          <br />
          <span style={{ color: "var(--ink-muted)", fontSize: "0.85rem" }}>
            It will be destroyed shortly. Go click things.
          </span>
        </p>
      )}
    </div>
  )
}

function Tombstone() {
  return (
    <div className="tombstone" aria-live="polite">
      <h2>Gone.</h2>
      <p>
        The sandbox is destroyed. The preview URL now leads nowhere — try it.
        No database, no storage, no residue. <em>You were never there.</em>
      </p>
    </div>
  )
}
