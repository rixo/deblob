import { describe, expect, it } from "vitest"

import { createProcessTerminal } from "./process-terminal.adapter.ts"

describe("createProcessTerminal", () => {
  const hostWith = (isTTY?: boolean) => {
    const written = { out: "", err: "" }
    const listeners = new Map<string, () => void>()
    const host = {
      stdout: {
        write: (chunk: string) => (written.out += chunk),
        ...(isTTY === undefined ? {} : { isTTY }),
      },
      stderr: { write: (chunk: string) => (written.err += chunk) },
      cwd: () => "/some/made-up/dir",
      env: { SOME_MADE_UP_VAR: "set" },
      exitCode: undefined as number | string | null | undefined,
      once: (signal: string, listener: () => void) =>
        listeners.set(signal, listener),
    }
    return { host, written, listeners }
  }

  it("writes both streams, reads cwd and env, sets the exit code", () => {
    const { host, written } = hostWith()
    const terminal = createProcessTerminal(host)
    terminal.out("answer")
    terminal.err("trouble")
    terminal.exit(2)
    expect(written).toEqual({ out: "answer", err: "trouble" })
    expect(terminal.cwd).toBe("/some/made-up/dir")
    expect(terminal.env("SOME_MADE_UP_VAR")).toBe("set")
    expect(terminal.env("UNSET_MADE_UP_VAR")).toBeUndefined()
    expect(host.exitCode).toBe(2)
  })

  it("is interactive only on a TTY stdout", () => {
    expect(createProcessTerminal(hostWith(true).host).interactive).toBe(true)
    expect(createProcessTerminal(hostWith(false).host).interactive).toBe(false)
    expect(createProcessTerminal(hostWith().host).interactive).toBe(false)
  })

  it("listens for the stop only once asked, and settles on either signal", async () => {
    for (const signal of ["SIGINT", "SIGTERM"]) {
      const { host, listeners } = hostWith()
      const terminal = createProcessTerminal(host)
      expect(listeners.size).toBe(0)
      const stopped = terminal.stopped()
      listeners.get(signal)?.()
      await expect(stopped).resolves.toBeUndefined()
    }
  })
})
