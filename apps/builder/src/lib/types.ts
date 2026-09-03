// Shared types for The Builder.

/** What kind of app the blueprint describes. */
export type AppKind = "landing" | "todo" | "clock" | "guestbook"

export interface Blueprint {
  kind: AppKind
  title: string
  headline: string
  subline: string
  /** Template content slots (e.g. list items, guestbook seed entries). */
  items: string[]
  accent: string
}

/** A running app inside a sandbox. */
export interface LiveApp {
  sandboxId: string
  previewUrl: string
  /** ms from sandbox create to the preview server answering. */
  bootMs: number
}

export interface BuildResult {
  blueprint: Blueprint
  htmlBytes: number
  live: LiveApp
  destroyed: boolean
}
