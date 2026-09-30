import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts"],
    // fixture repos carry spec files of their own — test data, never run
    exclude: ["**/node_modules/**", "**/__fixtures__/**"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.spec.ts",
        "src/**/__fixtures__/**",
        // process glue only — each app's boot and root driver, covered by the
        // child-process smoke tests; the ruled e2e-only exception (09 spec),
        // everything else runs in-process
        "src/apps/*/*.boot.ts",
        "src/apps/cli/cli.driver.ts",
        "src/apps/serve/serve.driver.ts",
        "src/apps/snapshot/snapshot.driver.ts",
        // throwaway code, rewritten 100% — delete with the directory
        "src/spike/**",
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
})
