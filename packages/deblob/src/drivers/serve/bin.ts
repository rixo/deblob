#!/usr/bin/env node
// The only process glue — everything testable lives in main(). Covered by the
// child-process smoke test, excluded from instrumentation like the CLI shim.

import process from "node:process"

import { main } from "./main.ts"

// ctrl-c: the signal replaces the default kill, so the server closes and the
// exit code is still main's
const stopping = new AbortController()
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => stopping.abort())
}

process.exitCode = await main({
  cwd: process.cwd(),
  port: Number(process.env["PORT"] ?? 5175),
  stdout: process.stdout,
  stderr: process.stderr,
  signal: stopping.signal,
})
