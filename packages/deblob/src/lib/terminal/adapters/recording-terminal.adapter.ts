import type { Terminal } from "../terminal.port.ts"

export type RecordingTerminal = {
  terminal: Terminal
  /** Everything written to the answer's stream, so far. */
  out(): string
  /** Everything written to the error stream, so far. */
  err(): string
  /** The exit code set, `null` until one is. */
  code(): number | null
  /** The user's stop: settles every `stopped()` asked so far and after. */
  stop(): void
}

/** A terminal held in memory — the tests' way in. */
export const createRecordingTerminal = (
  options: {
    cwd?: string
    env?: Readonly<Record<string, string>>
    interactive?: boolean
  } = {},
): RecordingTerminal => {
  let out = ""
  let err = ""
  let code: number | null = null
  let stop!: () => void
  const stopping = new Promise<void>((resolve) => {
    stop = resolve
  })
  const env = options.env ?? {}
  return {
    terminal: {
      out: (chunk) => {
        out += chunk
      },
      err: (chunk) => {
        err += chunk
      },
      interactive: options.interactive ?? false,
      cwd: options.cwd ?? "/",
      env: (name) => env[name],
      exit: (exitCode) => {
        code = exitCode
      },
      stopped: () => stopping,
    },
    out: () => out,
    err: () => err,
    code: () => code,
    stop: () => stop(),
  }
}
