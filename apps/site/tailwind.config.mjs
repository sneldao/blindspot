/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,js,jsx,ts,tsx}", "../../packages/shared/src/**/*.{astro,html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#faf8f3",
        "paper-warm": "#f5f1e8",
        ink: "#1a1a1a",
        "ink-muted": "#6b6b6b",
        "ink-dim": "#9e9e9e",
        accent: "#c45f34",
        "accent-soft": "rgba(196, 95, 52, 0.08)",
        risk: {
          low: "#2a9d52",
          moderate: "#d89722",
          high: "#c45f34",
        },
      },
      fontFamily: {
        serif: ["Fraunces", "Georgia", "serif"],
        sans: ["Inter", "-apple-system", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      letterSpacing: {
        tighter: "-0.03em",
        tight: "-0.01em",
      },
      maxWidth: {
        container: "1120px",
        prose: "68ch",
      },
      borderRadius: {
        sc: "8px",
      },
    },
  },
  plugins: [],
}
