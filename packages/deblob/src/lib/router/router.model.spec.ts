import { describe, expect, it, test } from "vitest"

import { createRouter } from "./router.model.ts"

/** A router whose every hook answers its own name and the line it got. */
const routed = () =>
  createRouter()
    .command("check", (line) => ["check", line])
    .command("explain", (line) => ["explain", line])
    .flag(["--help", "-h"], (line) => ["help", line])
    .otherwise((line) => ["otherwise", line])

const run = (...line: string[]) => routed().run(["node", "bin", ...line])

describe("createRouter", () => {
  it("drops node and the script, and hands the rest on untouched", async () => {
    expect(await run("check", "layers", "--explain")).toEqual([
      "check",
      ["check", "layers", "--explain"],
    ])
  })

  it("picks the first word that names a command, wherever it stands", async () => {
    expect(await run("--no-color", "explain", "check")).toEqual([
      "explain",
      ["--no-color", "explain", "check"],
    ])
  })

  it("lets a registered flag win over any command", async () => {
    expect(await run("check", "-h")).toEqual(["help", ["check", "-h"]])
  })

  it("calls otherwise when no word names a command", async () => {
    expect(await run()).toEqual(["otherwise", []])
    expect(await run("frobnicate")).toEqual(["otherwise", ["frobnicate"]])
  })

  test("words after -- pick nothing", async () => {
    expect(await run("--", "check", "--help")).toEqual([
      "otherwise",
      ["--", "check", "--help"],
    ])
  })

  it("answers undefined when nothing is registered", async () => {
    expect(await createRouter().run(["node", "bin", "check"])).toBeUndefined()
  })

  test("a value spelling a command picks it — the router knows no arity", async () => {
    expect(await run("-c", "check")).toEqual(["check", ["-c", "check"]])
  })
})
