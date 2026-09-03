import { defineConfig } from "astro/config"
import react from "@astrojs/react"
import node from "@astrojs/node"

export default defineConfig({
  server: {
    port: 4568,
  },
  integrations: [react()],
  output: "server",
  adapter: node({ mode: "standalone" }),
  // Same as Blindspot: keep the Solari SDK externalized in the SSR build —
  // force-bundling it drags native binaries into the bundle and breaks.
})
