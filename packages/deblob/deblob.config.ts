import { defineConfig } from "./src/index.ts"

export default defineConfig({
  include: ["src/**"],
  // fixture repos hold intentional violations — they are test data, not code
  // src/spike: throwaway code, rewritten 100% — delete with the directory
  exclude: ["**/__fixtures__/**", "src/spike/**"],
  // the packaging entry (05 entry designation) and the CLI driver
  assembly: ["src/index.ts", "src/drivers/**"],
  // deterministic, string-only computation — declared, not presumed
  // (service-purity)
  pure: ["node:util", "picomatch", "@oxc-project/types"],
  // the parser's AST types: a types-only package, nothing on disk to resolve
  // at runtime — declared, and pure like any type
  external: ["@oxc-project/types"],
})
