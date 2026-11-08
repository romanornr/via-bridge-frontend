import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    "node_modules/**",
    ".next/**",
    "private_docs/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "**/.turbo/**",
    "**/.cache/**",
    "**/*.config.js",
    "**/*.config.mjs",
    "**/*.config.ts",
    "**/coverage/**",
    "**/.env*",
  ]),
  {
    rules: {
      semi: ["error", "always"],
      "semi-style": ["error", "last"],
      "@typescript-eslint/no-explicit-any": "off",
      // React Compiler rules new in eslint-plugin-react-hooks 7 flag existing effects.
      // Warn until those components are refactored. Fixing them changes runtime behaviour.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
]);

export default eslintConfig;
