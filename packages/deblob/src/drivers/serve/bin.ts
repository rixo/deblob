#!/usr/bin/env node
// The only process glue — everything testable lives in main(). Covered by the
// child-process smoke test, excluded from instrumentation like the CLI shim.

import process from "node:process"

import { main } from "./main.ts"

await main({
  cwd: process.cwd(),
  port: Number(process.env["PORT"] ?? 5175),
  // the data half alone: in the dev cycle Vite serves the page
  bundle: null,
  stdout: process.stdout,
  stderr: process.stderr,
})
