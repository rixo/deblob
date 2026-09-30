import type { Terminal } from "../terminal.port.ts"

/** The part of node's `process` the terminal reads. */
type Host = {
  stdout: { write(chunk: string): unknown; isTTY?: boolean }
  stderr: { write(chunk: string): unknown }
  cwd(): string
  env: Readonly<Record<string, string | undefined>>
  exitCode?: number | string | null | undefined
  once(signal: "SIGINT" | "SIGTERM", listener: () => void): unknown
}

/**
 * The terminal a node process runs in. The stop listens only once asked: a
 * program that never waits keeps node's default ctrl-c (the kill).
 */
export const createProcessTerminal = (host: Host): Terminal => ({
  out: (chunk) => {
    host.stdout.write(chunk)
  },
  err: (chunk) => {
    host.stderr.write(chunk)
  },
  interactive: host.stdout.isTTY === true,
  cwd: host.cwd(),
  env: (name) => host.env[name],
  exit: (code) => {
    host.exitCode = code
  },
  stopped: () =>
    new Promise<void>((resolve) => {
      host.once("SIGINT", resolve)
      host.once("SIGTERM", resolve)
    }),
})
