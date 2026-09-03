// The renderer — blueprint in, one self-contained HTML file out. Pure and
// deterministic. Scudra paper/ink aesthetic, single accent per app.

import { escapeHtml } from "./blueprint.js"
import type { Blueprint } from "./types.js"

export function renderApp(bp: Blueprint): string {
  const title = escapeHtml(bp.title)
  const accent = escapeHtml(bp.accent)

  let body = ""
  switch (bp.kind) {
    case "landing":
      body = `
        <h1>${escapeHtml(bp.headline)}</h1>
        <p class="sub">${escapeHtml(bp.subline)}</p>
        <ul>${bp.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
        <a class="cta" href="#">Get started</a>`
      break
    case "todo":
      body = `
        <h1>${escapeHtml(bp.headline)}</h1>
        <p class="sub">${escapeHtml(bp.subline)}</p>
        <ul class="todo">${bp.items
          .map((i) => `<li><label><input type="checkbox" /> ${escapeHtml(i)}</label></li>`)
          .join("")}</ul>
        <form onsubmit="return false"><input placeholder="New item…" /><button>+</button></form>`
      break
    case "clock":
      body = `
        <h1>${escapeHtml(bp.headline)}</h1>
        <p class="sub">${escapeHtml(bp.subline)}</p>
        <p id="count" class="big">–</p>
        <script>
          const end = Date.now() + 5 * 60_000
          const el = document.getElementById("count")
          setInterval(() => {
            const s = Math.max(0, Math.floor((end - Date.now()) / 1000))
            el.textContent = s + "s until deletion"
          }, 250)
        </script>`
      break
    case "guestbook":
      body = `
        <h1>${escapeHtml(bp.headline)}</h1>
        <p class="sub">${escapeHtml(bp.subline)}</p>
        <form onsubmit="return false">
          <input id="name" placeholder="Name" />
          <input id="msg" placeholder="Message" />
          <button>Sign</button>
        </form>
        <ul id="entries">${bp.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
        <script>
          document.querySelector("form").addEventListener("submit", () => {
            const n = document.getElementById("name").value.trim()
            const m = document.getElementById("msg").value.trim()
            if (n && m) {
              const li = document.createElement("li")
              li.textContent = n + " — " + m
              document.getElementById("entries").appendChild(li)
            }
          })
        </script>`
      break
  }

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
    background: #faf8f3; color: #26262e;
    font-family: ui-sans-serif, system-ui, sans-serif; text-align: center; }
  main { max-width: 36rem; padding: 2rem; }
  h1 { font-size: clamp(1.6rem, 4vw, 2.4rem); letter-spacing: -0.02em; }
  .sub { color: #6d6d78; line-height: 1.6; }
  .big { font-size: 2.5rem; font-variant-numeric: tabular-nums; color: ${accent}; }
  ul { text-align: left; line-height: 1.9; }
  input, button { font: inherit; padding: 0.5rem 0.75rem; border-radius: 8px;
    border: 1px solid #e3ddd0; background: #f4f1e8; }
  button { background: ${accent}; color: #fff; border: none; cursor: pointer; }
  .cta { display: inline-block; margin-top: 1rem; padding: 0.6rem 1.4rem;
    background: ${accent}; color: #fff; border-radius: 8px; text-decoration: none; }
</style>
</head>
<body><main>${body}</main></body>
</html>`
}
