// ESLint flat config — TypeScript + React hooks rules across the workspace.
// Non-type-checked rules only: keeps lint fast; correctness gating lives in
// `pnpm typecheck`.
import tseslint from "typescript-eslint"
import reactHooks from "eslint-plugin-react-hooks"

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.astro/**",
      "**/node_modules/**",
      "**/.ruff_cache/**",
      "examples/**", // upstream cookbook examples — not linted
    ],
  },
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
)
