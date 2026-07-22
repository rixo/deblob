#!/usr/bin/env node
// The only process glue — everything testable lives in main(). Covered by the
// child-process smoke test, excluded from instrumentation (e2e-only, ruled at
// the 09 spec).

import process from "node:process"

import { main } from "./main.ts"

process.exitCode = await main({
  argv: process.argv.slice(2),
  cwd: process.cwd(),
  stdout: process.stdout,
  stderr: process.stderr,
  env: process.env,
})
