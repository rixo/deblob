import process from "node:process"

import type { Output } from "../cli.port.ts"

export const createStdout = (): Output => ({
  write: (line) => void process.stdout.write(`${line}\n`),
  fail: (line) => {
    process.stderr.write(`${line}\n`)
    process.exitCode = 1
  },
})
