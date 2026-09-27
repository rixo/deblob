import { svelte } from "@sveltejs/vite-plugin-svelte"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [svelte()],
  resolve: { conditions: ["browser"] },
  test: {
    environment: "happy-dom",
    // the web front talks real HTTP to its own server on localhost
    environmentOptions: {
      happyDOM: { settings: { fetch: { disableSameOriginPolicy: true } } },
    },
  },
})
