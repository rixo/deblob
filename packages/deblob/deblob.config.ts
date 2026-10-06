import { defineConfig } from "./src/index.ts"
import { hostDriver, node } from "./src/readers.ts"

export default defineConfig({
  include: ["src/**"],
  // fixture repos hold intentional violations — they are test data, not code
  // src/spike: throwaway code, rewritten 100% — delete with the directory
  exclude: ["**/__fixtures__/**", "src/spike/**"],
  // the packaging entries (05 entry designation); the apps' files say their
  // own kinds
  assembly: ["src/index.ts", "src/readers.ts"],
  readers: {
    host: [node()],
    driver: [
      // the apps' drivers on the host alone: serve and snapshot are started
      // by the process, the CLI's root driver reads its argv (GUESS: D7)
      hostDriver(),
      // deblob's CLI's tech is its own router, claimed as a project file
      // (C1 (b), GUESS: D4)
      {
        name: "deblob-router",
        include: ["src/apps/cli/*.driver.ts"],
        tech: ["./src/lib/router/router.model.ts"],
      },
    ],
  },
  // deterministic, string-only computation — declared, not presumed
  // (service-purity)
  // `node:module`: the node reader's list of Node's builtins, a constant of
  // the Node that runs the check — it varies with that version, nothing else
  pure: ["node:util", "node:module", "picomatch", "@oxc-project/types"],
  // the parser's AST types: a types-only package, nothing on disk to resolve
  // at runtime — declared, and pure like any type
  external: ["@oxc-project/types"],
})
