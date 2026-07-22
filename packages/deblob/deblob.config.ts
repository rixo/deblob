import { defineConfig } from "./src/index.ts"

export default defineConfig({
  include: ["src/**"],
  // fixture repos hold intentional violations — they are test data, not code
  exclude: ["**/__fixtures__/**"],
  // the packaging entry (05 entry designation) and the CLI driver
  assembly: ["src/index.ts", "src/drivers/**"],
  // deterministic, string-only computation — declared, not presumed (rule 4)
  pureLibs: ["node:util", "picomatch"],
})
