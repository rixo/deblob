/// <reference types="vitest/config" />
import { svelte } from "@sveltejs/vite-plugin-svelte"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [svelte()],
  // vitest resolves svelte's server build without this: mount() unavailable
  ...(process.env.VITEST ? { resolve: { conditions: ["browser"] } } : {}),
  test: {
    include: ["src/**/*.spec.ts"],
    environment: "jsdom",
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,svelte}"],
      exclude: ["src/**/*.spec.ts"],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
})
