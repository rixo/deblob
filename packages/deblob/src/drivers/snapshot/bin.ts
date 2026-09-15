#!/usr/bin/env node
// The only process glue — everything testable lives in main(). Covered by the
// child-process smoke test, excluded from instrumentation like the CLI shim.

import process from "node:process"

import { main } from "./main.ts"

process.exitCode = await main({
  cwd: process.cwd(),
  stdout: process.stdout,
  stderr: process.stderr,
})
