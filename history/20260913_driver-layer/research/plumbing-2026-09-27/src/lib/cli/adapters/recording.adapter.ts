import type { Output } from "../cli.port.ts"

export const createRecordingOutput = (): Output & {
  readonly lines: readonly string[]
  readonly failures: readonly string[]
} => {
  const lines: string[] = []
  const failures: string[] = []
  return {
    write: (line) => void lines.push(line),
    fail: (line) => void failures.push(line),
    lines,
    failures,
  }
}
