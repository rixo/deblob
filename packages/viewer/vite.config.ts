/// <reference types="vitest/config" />
import { svelte } from "@sveltejs/vite-plugin-svelte"
import { defineConfig } from "vite"

import { dc } from "./src/spike/map/host/dc-plugin.js"

/** The design's pages, compiled by the spike's `dc` plugin. */
const isDcPage = (filename: string | undefined) =>
  filename?.endsWith(".dc.html.svelte") === true

export default defineConfig({
  plugins: [
    // the design's map (step 09): their pages and engine scripts, spike code
    dc(),
    svelte({
      dynamicCompileOptions: ({ filename }) =>
        isDcPage(filename) ? { runes: true } : undefined,
      // their pages are theirs: warnings about them are not ours to fix
      onwarn: (warning, handler) => {
        if (!isDcPage(warning.filename)) handler(warning)
      },
    }),
  ],
  // the dep scan starts from every .html in the package — the design's pages
  // included, which only the `dc` plugin can read — so it starts from ours
  optimizeDeps: { entries: ["index.html"] },
  server: {
    // the data server (`pnpm dev:serve`, deblob's serve driver, PORT 5175)
    proxy: { "/deblob/ws": { target: "ws://127.0.0.1:5175", ws: true } },
  },
  // vitest resolves svelte's server build without this: mount() unavailable
  ...(process.env.VITEST ? { resolve: { conditions: ["browser"] } } : {}),
  test: {
    include: ["src/**/*.spec.ts"],
    environment: "jsdom",
    globalSetup: ["./vitest.global-setup.ts"],
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
