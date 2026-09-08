import { describe, expect, test } from "vitest"

import {
  ConfigError,
  COVERAGE_EXTENSIONS,
  asConfigError,
  hasCoverageExtension,
  configImportErrorMessage,
} from "./config.model.ts"

describe("asConfigError", () => {
  test("passes a ConfigError through, rethrows anything else", () => {
    const teaching = new ConfigError("SOME_MADE_UP_MESSAGE")
    expect(asConfigError(teaching)).toBe(teaching)
    const bug = new Error("SOME_MADE_UP_BUG")
    expect(() => asConfigError(bug)).toThrow(bug)
  })
})

describe("hasCoverageExtension", () => {
  test("accepts every extension of the gate", () => {
    for (const ext of COVERAGE_EXTENSIONS) {
      expect(hasCoverageExtension(`dir/file${ext}`)).toBe(true)
    }
  })

  test("rejects non-source extensions and near-misses", () => {
    expect(hasCoverageExtension("dir/styles.css")).toBe(false)
    expect(hasCoverageExtension("dir/notes.md")).toBe(false)
    expect(hasCoverageExtension("dir/data.json")).toBe(false)
    expect(hasCoverageExtension("dir/ts")).toBe(false)
  })
})

describe("configImportErrorMessage", () => {
  test("teaches the erasable-only constraint on the Node syntax code", () => {
    const error = Object.assign(new Error("enum stripped"), {
      code: "ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX",
    })
    const message = configImportErrorMessage(error, "/repo/deblob.config.ts")
    expect(message).toMatch(/erasable/)
    expect(message).toMatch(/deblob\.config\.ts/)
  })

  test("teaches the .mts rename when ESM syntax was read as CommonJS", () => {
    const error = new SyntaxError("Unexpected token 'export'")
    const message = configImportErrorMessage(error, "/repo/deblob.config.ts")
    expect(message).toMatch(/loaded as CommonJS/)
    expect(message).toMatch(/rename it deblob\.config\.mts/)
    expect(message).toMatch(/"type": "module"/)
    // the .js twin gets its own modern name
    expect(
      configImportErrorMessage(
        new SyntaxError("Cannot use import statement outside a module"),
        "/repo/deblob.config.js",
      ),
    ).toMatch(/rename it deblob\.config\.mjs/)
    // an .mts never reads as CommonJS — some other syntax error, plain path
    expect(configImportErrorMessage(error, "/repo/deblob.config.mts")).toMatch(
      /^failed to load/,
    )
    // a non-syntax error with that text is not the shape either
    expect(
      configImportErrorMessage(
        new Error("Unexpected token 'export'"),
        "/repo/deblob.config.ts",
      ),
    ).toMatch(/^failed to load/)
  })

  test("names the config path on any other failure", () => {
    const message = configImportErrorMessage(
      new Error("SOME_FAKE_EVALUATION_FAILURE"),
      "/repo/deblob.config.ts",
    )
    expect(message).toMatch(/failed to load/i)
    expect(message).toMatch(/deblob\.config\.ts/)
  })
})
