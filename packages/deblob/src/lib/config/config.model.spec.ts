import { describe, expect, it } from "vitest"

import {
  ConfigError,
  COVERAGE_EXTENSIONS,
  asConfigError,
  hasCoverageExtension,
  configImportErrorMessage,
} from "./config.model.ts"

describe("asConfigError", () => {
  it("passes a ConfigError through, rethrows anything else", () => {
    const teaching = new ConfigError("SOME_MADE_UP_MESSAGE")
    expect(asConfigError(teaching)).toBe(teaching)
    const bug = new Error("SOME_MADE_UP_BUG")
    expect(() => asConfigError(bug)).toThrow(bug)
  })
})

describe("hasCoverageExtension", () => {
  it("accepts every extension of the gate", () => {
    for (const ext of COVERAGE_EXTENSIONS) {
      expect(hasCoverageExtension(`dir/file${ext}`)).toBe(true)
    }
  })

  it("rejects non-source extensions and near-misses", () => {
    expect(hasCoverageExtension("dir/styles.css")).toBe(false)
    expect(hasCoverageExtension("dir/notes.md")).toBe(false)
    expect(hasCoverageExtension("dir/data.json")).toBe(false)
    expect(hasCoverageExtension("dir/ts")).toBe(false)
  })
})

describe("configImportErrorMessage", () => {
  it("teaches the erasable-only constraint on the Node syntax code", () => {
    const error = Object.assign(new Error("enum stripped"), {
      code: "ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX",
    })
    const message = configImportErrorMessage(error, "/repo/deblob.config.ts")
    expect(message).toMatch(/erasable/)
    expect(message).toMatch(/deblob\.config\.ts/)
  })

  it("names the config path on any other failure", () => {
    const message = configImportErrorMessage(
      new Error("SOME_FAKE_EVALUATION_FAILURE"),
      "/repo/deblob.config.ts",
    )
    expect(message).toMatch(/failed to load/i)
    expect(message).toMatch(/deblob\.config\.ts/)
  })
})
