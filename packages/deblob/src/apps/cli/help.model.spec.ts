import { describe, expect, it } from "vitest"

import { CHECK_HELP, HELP } from "./help.model.ts"

describe("HELP", () => {
  it("lists commands, checks, options, exit codes and the no-autofix line", () => {
    expect(HELP).toContain("deblob check [what...]")
    expect(HELP).toContain("deblob explain <topic...>")
    expect(HELP).toContain("-c, --config <path>")
    expect(HELP).toContain("--no-color")
    expect(HELP).toContain(
      "0  clean    1  violations found    2  usage or config error",
    )
    expect(HELP).toContain("deblob detects; it never moves code.")
  })

  it("carries dag — the fiction's full check list", () => {
    expect(HELP).toContain("dag        service dependencies form a DAG")
  })

  it("cites rules by slug, never by number", () => {
    expect(HELP).not.toMatch(/\brules? [0-9]/)
    expect(HELP).toContain("(private-sealed)")
  })
})

describe("CHECK_HELP", () => {
  it("gives the batch flags and the teaching primer", () => {
    expect(CHECK_HELP).toContain("--explain")
    expect(CHECK_HELP).toContain("--explain-only")
    expect(CHECK_HELP).toContain("one shared import graph")
  })

  it("carries dag — the fiction's full check list", () => {
    expect(CHECK_HELP).toContain("deblob check dag layers")
  })

  it("cites rules by slug, never by number", () => {
    expect(CHECK_HELP).not.toMatch(/\brules? [0-9]/)
    expect(CHECK_HELP).toContain("(service-purity)")
  })
})
