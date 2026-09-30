import { describe, expect, it } from "vitest"

import { createRecordingTerminal } from "./recording-terminal.adapter.ts"

describe("createRecordingTerminal", () => {
  it("records both streams and the exit code, and settles the stop on demand", async () => {
    const recording = createRecordingTerminal({
      cwd: "/made-up",
      env: { SOME_MADE_UP_VAR: "set" },
      interactive: true,
    })
    const { terminal } = recording
    expect(recording.code()).toBeNull()
    terminal.out("a")
    terminal.err("b")
    terminal.exit(1)
    expect([recording.out(), recording.err(), recording.code()]).toEqual([
      "a",
      "b",
      1,
    ])
    expect([terminal.cwd, terminal.interactive]).toEqual(["/made-up", true])
    expect(terminal.env("SOME_MADE_UP_VAR")).toBe("set")
    const stopped = terminal.stopped()
    recording.stop()
    await expect(stopped).resolves.toBeUndefined()
  })

  it("defaults to a plain terminal at / with an empty environment", () => {
    const { terminal } = createRecordingTerminal()
    expect([terminal.cwd, terminal.interactive]).toEqual(["/", false])
    expect(terminal.env("PATH")).toBeUndefined()
  })
})
