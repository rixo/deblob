#!/usr/bin/env node
// The only process glue — everything testable lives in main(). Covered by the
// child-process smoke test, excluded from instrumentation (e2e-only, ruled at
// the 09 spec).

import process from "node:process"
import { fileURLToPath } from "node:url"

import { main } from "./main.ts"

/**
 * Where the built viewer sits, and the whole of what SPEC 05's packaging ruling
 * touches: a copy inside this package, made by `build:viewer` and shipped by
 * `files: ["dist"]`. Anchored at the package root the way the explain cards
 * are, so the same hop works compiled (dist/drivers/cli) and source-run
 * (src/drivers/cli) — source-run needs the copy to exist, exactly as the cards
 * do. The day the viewer is published and depended on instead, this becomes
 * `import.meta.resolve("@deblob/viewer/bundle/index.html")` and nothing else
 * moves.
 */
const bundleRootOf = (): string =>
  fileURLToPath(new URL("../../../dist/viewer", import.meta.url))

// ctrl-c on a verb that keeps running (view): the signal replaces the default
// kill, so the server closes and the exit code is still main's
const stopping = new AbortController()
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => stopping.abort())
}

process.exitCode = await main({
  argv: process.argv.slice(2),
  cwd: process.cwd(),
  stdout: process.stdout,
  stderr: process.stderr,
  env: process.env,
  signal: stopping.signal,
  bundle: bundleRootOf(),
})
