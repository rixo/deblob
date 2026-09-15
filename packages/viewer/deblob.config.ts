// Typed against deblob's source, never its `dist` (step 03: source, never
// dist, inside the workspace) — a type-only import, erased before it runs.
import type { DeblobConfig } from "../deblob/src/index.ts"

const config: DeblobConfig = {
  include: ["src/**"],
  // the Vite entry: builds the source, mounts the app
  assembly: ["src/main.ts"],
  // what `pnpm dev` shows: this package first, then deblob — the switch has
  // something to switch to; your own checkouts go in deblob.local.json
  view: { projects: [".", "../deblob"] },
}

export default config
