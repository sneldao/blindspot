export interface Recipe {
  slug: string
  title: string
  tagline: string
  description: string
  primitives: Array<"browser" | "sandbox" | "desktop">
  status: "live" | "cooking" | "planned"
  source?: string
  demo?: string
}

export const recipes: Recipe[] = [
  {
    slug: "blindspot",
    title: "Blindspot — The Investigator",
    tagline: "Privacy-preserving onchain investigation.",
    description:
      "Resolve an ENS name, run Mobula inside an ephemeral sandbox, enrich off-chain context through a stealth browser, and deliver a verdict. The investigator's identity, traffic, and history are protected.",
    primitives: ["browser", "sandbox"],
    status: "live",
    source: "apps/blindspot",
    demo: "/experiences/blindspot",
  },
  {
    slug: "stealth-scraper",
    title: "Stealth Scraper — The Witness",
    tagline: "Collect evidence from the web without leaving fingerprints.",
    description:
      "Use a cloud browser with a residential proxy to scrape pages from different egress points. Capture screenshots and structured data without revealing the operator.",
    primitives: ["browser"],
    status: "cooking",
    source: "examples/browser-stealth-proxy-ts",
  },
  {
    slug: "code-interpreter",
    title: "Code Interpreter — The Analyst",
    tagline: "Run untrusted code in an ephemeral sandbox.",
    description:
      "Spawn a sandbox, execute Python or shell code, and return the result. The VM is destroyed after the task, so failed or malicious code cannot persist.",
    primitives: ["sandbox"],
    status: "cooking",
    source: "examples/sandbox-code-interpreter-py",
  },
  {
    slug: "desktop-operator",
    title: "Desktop Operator — The Controller",
    tagline: "Operate a remote GUI with vision and clicks.",
    description:
      "Use a cloud desktop to interact with applications that require a screen. Take screenshots, click, type, and observe like a human operator.",
    primitives: ["desktop"],
    status: "planned",
    source: "examples/desktop-computer-use-py",
  },
]

export function getRecipe(slug: string): Recipe | undefined {
  return recipes.find((r) => r.slug === slug)
}
