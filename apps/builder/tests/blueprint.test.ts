import { describe, expect, it } from "vitest"
import { plan } from "../src/lib/blueprint.js"
import { renderApp } from "../src/lib/render.js"

describe("plan", () => {
  it("maps todo-ish prompts to the todo blueprint", () => {
    expect(plan("a todo list for my last day").kind).toBe("todo")
    expect(plan("write a checklist app").kind).toBe("todo")
  })

  it("maps clock prompts to the clock blueprint", () => {
    expect(plan("a countdown timer to deletion").kind).toBe("clock")
  })

  it("maps guestbook prompts to the guestbook blueprint", () => {
    expect(plan("a guest book for visitors").kind).toBe("guestbook")
  })

  it("defaults to landing", () => {
    expect(plan("something cool").kind).toBe("landing")
  })

  it("escapes html in the echoed prompt", () => {
    const bp = plan('<script>alert("x")</script>')
    expect(bp.subline).not.toContain("<script>")
    expect(bp.subline).toContain("&lt;script&gt;")
  })

  it("is deterministic", () => {
    expect(plan("a todo app")).toEqual(plan("a todo app"))
  })
})

describe("renderApp", () => {
  it("produces a self-contained html document", () => {
    const html = renderApp(plan("a guestbook that gets burned"))
    expect(html).toContain("<!doctype html>")
    expect(html).toContain("<form")
  })

  it("renders interactive seeds for the todo app", () => {
    const html = renderApp(plan("a todo app"))
    expect(html).toContain('type="checkbox"')
  })

  it("renders a countdown for the clock app", () => {
    const html = renderApp(plan("a clock"))
    expect(html).toContain("count")
    expect(html).toContain("setInterval")
  })

  it("escapes the prompt everywhere it appears", () => {
    const html = renderApp(plan('the "><img src=x onerror=alert(1)> app'))
    expect(html).not.toContain("<img src=x")
  })

  it("uses the accent color consistently", () => {
    const html = renderApp(plan("a landing page"))
    // The accent appears in the palette block and on interactive elements.
    const occurrences = html.match(/#c26b3f/g) ?? []
    expect(occurrences.length).toBeGreaterThanOrEqual(2)
  })
})
