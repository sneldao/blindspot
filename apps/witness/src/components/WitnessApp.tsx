import { useState, useCallback, useRef } from "react"
import type { EgressLocation, LocationObservation, DiffLine } from "../lib/types.js"

type Phase = "idle" | "running" | "done"

interface State {
  phase: Phase
  url: string
  locations: EgressLocation[]
  observations: Record<string, LocationObservation>
  egress: Record<string, string>
  differences: DiffLine[]
  identical: boolean
  error: string | null
}

const initial: State = {
  phase: "idle",
  url: "",
  locations: [],
  observations: {},
  egress: {},
  differences: [],
  identical: false,
  error: null,
}

export default function WitnessApp() {
  const [state, setState] = useState<State>(initial)
  const [input, setInput] = useState("")
  const esRef = useRef<EventSource | null>(null)

  const observe = useCallback(() => {
    const url = input.trim()
    if (!url) return
    esRef.current?.close()

    setState({ ...initial, phase: "running", url })
    const es = new EventSource(`/api/observe?url=${encodeURIComponent(url)}`)
    esRef.current = es

    es.onmessage = (msg) => {
      const event = JSON.parse(msg.data)
      switch (event.type) {
        case "started":
          setState((s) => ({ ...s, locations: event.locations }))
          break
        case "location:egress":
          setState((s) => ({ ...s, egress: { ...s.egress, [event.code]: event.egressIp } }))
          break
        case "location:done":
          setState((s) => ({
            ...s,
            observations: { ...s.observations, [event.observation.code]: event.observation },
          }))
          break
        case "complete":
          setState((s) => ({
            ...s,
            phase: "done",
            differences: event.differences,
            identical: event.identical,
          }))
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
        s.phase === "running" ? { ...s, phase: "idle", error: "Connection lost. Try again." } : s,
      )
      es.close()
    }
  }, [input])

  return (
    <section>
      <WitnessForm input={input} setInput={setInput} onObserve={observe} busy={state.phase === "running"} />
      {state.error && (
        <p role="alert" className="witness-error">
          {state.error}
        </p>
      )}
      <WitnessGrid state={state} />
      {state.phase === "done" && <WitnessVerdict state={state} />}
      <style>{STYLES}</style>
    </section>
  )
}

const STYLES = `
  .witness-form { display: flex; gap: 0.75rem; margin: 2rem 0 2.5rem; }
  .witness-form input {
    flex: 1; padding: 0.75rem 1rem; border: 1px solid var(--line);
    border-radius: 8px; background: var(--paper-warm); color: var(--ink); font: inherit;
  }
  .witness-form button {
    padding: 0.75rem 1.5rem; border: none; border-radius: 8px;
    background: var(--accent); color: #fff; font: inherit; font-weight: 500; cursor: pointer;
  }
  .witness-form button:disabled { opacity: 0.6; cursor: wait; }
  .witness-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: 1rem;
  }
  .witness-card { border: 1px solid var(--line); border-radius: 12px; padding: 1.25rem; background: var(--paper-warm); }
  .witness-card h2 { font-size: 1.15rem; margin: 0 0 0.5rem; }
  .witness-card p { font-size: 0.9rem; margin: 0.4rem 0; }
  .witness-card .egress { color: var(--ink-muted); font-size: 0.8rem; }
  .witness-card .label {
    display: inline-block; min-width: 4.5rem; color: var(--ink-muted);
    font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em;
  }
  .witness-verdict { margin-top: 2.5rem; padding: 1.5rem; border-top: 2px solid var(--line); }
  .witness-verdict ul { padding-left: 1.2rem; line-height: 1.7; }
  .witness-error { color: var(--accent); }
  code { font-family: "JetBrains Mono", monospace; font-size: 0.8em; }
`

function WitnessForm(props: {
  input: string
  setInput: (v: string) => void
  onObserve: () => void
  busy: boolean
}) {
  return (
    <form
      className="witness-form"
      onSubmit={(e) => {
        e.preventDefault()
        props.onObserve()
      }}
    >
      <input
        type="url"
        required
        placeholder="https://example.com/pricing"
        value={props.input}
        onChange={(e) => props.setInput(e.target.value)}
        aria-label="URL to observe"
      />
      <button type="submit" disabled={props.busy}>
        {props.busy ? "Witnessing…" : "Witness it"}
      </button>
    </form>
  )
}

function WitnessGrid({ state }: { state: State }) {
  return (
    <>
      {state.locations.length > 0 && (
        <div className="witness-grid">
          {state.locations.map((loc) => {
            const obs = state.observations[loc.code]
            const ip = state.egress[loc.code]
            return (
              <article key={loc.code} className="witness-card">
                <h2>{loc.label}</h2>
                <p className="egress">
                  {ip ? (
                    <>
                      egress <code>{ip}</code>
                    </>
                  ) : obs?.error ? (
                    "—"
                  ) : (
                    "connecting…"
                  )}
                </p>
                {obs?.ok ? (
                  <>
                    <p className="title">{obs.title || "(no title)"}</p>
                    {obs.prices.length > 0 && (
                      <p>
                        <span className="label">Prices</span> {obs.prices.join(" · ")}
                      </p>
                    )}
                    {obs.currencies.length > 0 && (
                      <p>
                        <span className="label">Currency</span> {obs.currencies.join(", ")}
                      </p>
                    )}
                    <p>
                      <span className="label">Content</span> {obs.bodyLength.toLocaleString()} chars ·{" "}
                      {(obs.durationMs / 1000).toFixed(1)}s
                    </p>
                  </>
                ) : obs ? (
                  <p className="witness-error">{obs.error ?? "Failed."}</p>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}

function WitnessVerdict({ state }: { state: State }) {
  return (
    <div className="witness-verdict" aria-live="polite">
      <h2>{state.identical ? "One web — this time." : "Not one web."}</h2>
      {state.differences.length > 0 ? (
        <ul>
          {state.differences.map((d, i) => (
            <li key={i}>{d.detail}</li>
          ))}
        </ul>
      ) : (
        <p>
          Every location saw the same page — and every location reached it
          through a different residential IP. You were never there.
        </p>
      )}
    </div>
  )
}
