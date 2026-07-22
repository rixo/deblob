import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.spec.ts",
        "src/**/__fixtures__/**",
        // process glue only — covered by the child-process smoke test; the
        // ruled e2e-only exception (09 spec), everything else runs in-process
        "src/drivers/cli/bin.ts",
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
