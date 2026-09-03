// The blueprint engine — prompt in, app spec out. Pure and deterministic.
//
// This is the seam where an LLM can be slotted in later: keep the signature
// `plan(prompt): Blueprint` and the orchestrator does not care who planned
// it. For now a vocabulary matcher keeps the experience runnable with only a
// SOLARI_API_KEY and makes every build reproducible in tests.

import type { AppKind, Blueprint } from "./types.js"

const KINDS: Record<AppKind, Blueprint> = {
  landing: {
    kind: "landing",
    title: "Northwind",
    headline: "Software for the open road",
    subline: "A one-page launch site, generated in a VM that no longer exists.",
    items: ["Zero cold starts", "Ephemeral by default", "One API, three primitives"],
    accent: "#c26b3f",
  },
  todo: {
    kind: "todo",
    title: "Driftlist",
    headline: "Things to do before the VM dies",
    subline: "A todo app with the shortest shelf life in software.",
    items: [
      "Watch the sandbox boot",
      "Click around the preview URL",
      "Watch the sandbox die",
    ],
    accent: "#3e8e5a",
  },
  clock: {
    kind: "clock",
    title: "Hourglass",
    headline: "A clock counting down to its own deletion",
    subline: "Every second it runs, it gets closer to never having existed.",
    items: [],
    accent: "#8a6bbf",
  },
  guestbook: {
    kind: "guestbook",
    title: "Fading Ink",
    headline: "Sign a book that will be burned",
    subline: "Your entry lives until the sandbox is destroyed. Then, nowhere.",
    items: ["Ada — first!", "Grace — hello from the future past"],
    accent: "#c26b3f",
  },
}

export function plan(prompt: string): Blueprint {
  const p = prompt.toLowerCase()
  let kind: AppKind = "landing"
  if (/\btodo|task|checklist|list\b/.test(p)) kind = "todo"
  else if (/\bclock|timer|countdown|time\b/.test(p)) kind = "clock"
  else if (/\bguestbook|guest book|sign|visitors\b/.test(p)) kind = "guestbook"

  const base = KINDS[kind]
  // Personalize the headline with the visitor's words (bounded, escaped).
  const trimmed = prompt.trim().slice(0, 80)
  return {
    ...base,
    headline: base.headline,
    subline: trimmed ? `Prompt: “${escapeHtml(trimmed)}”` : base.subline,
  }
}

export function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}
