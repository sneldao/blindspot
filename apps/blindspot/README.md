# Blindspot — Privacy-Preserving Onchain Investigation Agent

Investigate any onchain actor by ENS name, with the investigator's identity,
traffic, and history all protected by Solari's ephemeral sandboxes and stealth
browsers.

Built for [Common S3nse Hackathon](https://commons3nse.cryptocanal.org/hackathon)
at Cypherpunk Week Amsterdam 2026. Targets the ENS and Mobula bounties.

## The privacy inversion

Most privacy projects protect the **subject** — the person being looked at.
Blindspot protects the **investigator** — the person looking.

> "I want to research wallet X without wallet X, my ISP, Mobula, or anyone
> else knowing I looked."

Three layers of metadata are protected:

| Layer | What's protected | Mechanism |
|-------|-----------------|-----------|
| **Who** | Investigator's IP and fingerprint | Solari stealth browser + residential proxy |
| **That** | That an investigation occurred | Ephemeral sandbox, killed after, no persistent state |
| **What** | What onchain data was queried | Mobula API calls run inside the sandbox, not the investigator's IP |

## How ENS is load-bearing

ENS is not cosmetic here. It is the discovery and enrichment layer:

- **Discovery**: The investigator queries by ENS **name**, not raw address. The
  name resolves to the target.
- **Enrichment signals**: ENS text records (website, Twitter, GitHub, avatar,
  description) drive the off-chain context the stealth browser fetches.
- **Identity correlation**: Reverse lookup catches aliases — multiple names on
  one address is a signal worth surfacing in the risk assessment.

Without ENS, you'd have a raw address and no off-chain signals to enrich.

## How Mobula is load-bearing

Mobula powers the onchain analysis layer:

- **Portfolio**: Holdings, balances, USD values across chains
- **Positions with PnL**: Realized and unrealized gains/losses per token
- **Trade history**: Buy/sell counts, volumes, activity timestamps

All Mobula API calls execute from **inside the Solari sandbox** — Mobula sees
the sandbox's ephemeral IP, not the investigator's.

## Architecture

```
npm start -- vitalik.eth
  │
  ├─ 1. LOCAL: ENS resolution (ethers + public RPC)
  │     name → address, text records, reverse lookup
  │
  ├─ 2. SOLARI SANDBOX (ephemeral, killed after):
  │     curl Mobula API → portfolio, positions/PnL
  │     (investigator's IP never touches Mobula)
  │
  ├─ 3. SOLARI STEALTH BROWSER (residential proxy + recording):
  │     visit websites from ENS text records
  │     extract off-chain context
  │     (target sees a residential IP, not the investigator's)
  │
  ├─ 4. ANALYZER: combine signals → risk score
  │
  ├─ 5. REPORT: self-contained HTML + privacy manifest
  │
  └─ 6. TEARDOWN: sandbox.kill(), browser.close(), solari.close()
        + download session recording
```

Steps 2 and 3 run **concurrently** — the Mobula queries and web scraping happen
in parallel.

## Quick start

```bash
cd examples/blindspot-ts
npm install
export SOLARI_API_KEY=slr_live_...   # console.getsolari.com
export MOBULA_API_KEY=...             # admin.mobula.io

# Web UI (3D dossier experience)
npm run dev
# → http://localhost:4567

# CLI mode (terminal output + report file)
npm run cli -- vitalik.eth
```

The web UI is a 3D scroll-driven dossier built with Three.js. Each panel is a
classified document that declassifies as you approach — ink dissolves in
patches to reveal the investigation data underneath.

## Tech stack

- **Astro + React** — app shell, routing, server endpoints (SSE, report serving)
- **Three.js** — 3D dossier experience (custom shaders, proximity-driven declassification)
- **Lenis** — smooth scroll
- **Solari** (`@solarisdk/browser`, `@solarisdk/sdk`) — ephemeral sandboxes + stealth browsers
- **Ethers.js** — ENS resolution and text record fetching
- **Mobula API** — onchain portfolio, positions, and PnL data

### Project structure

```
src/
  pages/          Astro pages + API endpoints
    index.astro   Main page (renders the React island)
    api/
      investigate.ts  SSE endpoint for investigation events
      report.ts       Report file serving
  layouts/        Astro layout (HTML shell, fonts, global CSS)
  components/      React islands
    BlindspotApp.tsx  Main island (state + Three.js canvas + DOM overlays)
  client/         Three.js engine (vanilla TS, imported by React island)
    scene.ts          Renderer, camera, lights, fog
    panels.ts         Declassification dossier panels
    redaction-material.ts  Ink dissolution shader (the core UI primitive)
    camera-curve.ts   Scroll-driven camera path
    scroll.ts         Lenis smooth scroll
    chart.ts          3D donut chart
    texture.ts        HTML-to-texture pipeline
    fonts.ts          Base64 font embedding for the texture pipeline
    tokens.ts         sRGB color tokens for the WebGL side
  lib/            Server-side investigation modules
    orchestrator.ts   Full pipeline coordinator
    ens.ts            ENS resolution
    mobula.ts         Onchain data (via sandbox)
    sandbox.ts        Solari sandbox management
    browser.ts        Solari stealth browser
    analyzer.ts       Risk scoring
    report.ts         HTML report generation
    types.ts          Shared types
    events.ts         SSE event types
  server/         CLI entry point
    cli.ts
```

## Solari gotchas this project handles

- **`await solari.close()`** — the browser client keeps a loopback proxy open;
  skip this and the process hangs forever.
- **`kill()`, not `close()`** — `close()` only drops the local control channel;
  the VM keeps running until its idle timeout. `kill()` destroys it.
- **`commands.run` is not shell-interpreted** — `run("curl -s ...")` looks for
  a binary named `curl -s`. Args go in `args`.
- **Recording is per-session** — pass `recording: true` at launch time or the
  replay endpoint 404s forever. The upload is async after release, so poll
  for ~30s.
- **`timeoutMs` is a rolling idle window** — it resets on every use, it's not
  a hard deadline.

## Future: stronger privacy with ENSv2

- **Rotating ENS subnames**: The investigator's own identity is a fresh ENS
  subname per investigation, so even payment for the service is unlinkable.
- **CCIP-Read resolvers**: Offchain resolvers that reduce publicly exposed ENS
  metadata.
- **ZK proof of authorization**: The investigator proves they're authorized to
  use the service without revealing who they are.

MIT licensed.
