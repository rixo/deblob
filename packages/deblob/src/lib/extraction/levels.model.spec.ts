import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vitest"

import { createOxcEngine } from "./adapters/oxc-extraction.adapter.ts"
import { createPlainTsReader } from "./adapters/plain-ts-reader.adapter.ts"
import { createTestRunnerReader } from "./adapters/test-runner-reader.adapter.ts"
import { createTsSuffixesFactoriesFlavor } from "./adapters/ts-suffixes-factories-flavor.adapter.ts"
import { createExtraction } from "./extraction.service.ts"
import { useCaseLevels } from "./levels.model.ts"

const root = fileURLToPath(new URL("./__fixtures__/reading/", import.meta.url))

const FILES = [
  "src/app/app.service.ts",
  "src/app/app.port.ts",
  "src/app/store.adapter.ts",
  "src/app/app.model.ts",
  "src/legacy.ts",
  "src/cli.assembly.ts",
  "src/cli.driver.ts",
  "src/sub.driver.ts",
  "src/cli.boot.ts",
  "src/group.assembly.ts",
  "src/other.driver.ts",
  "src/default.driver.ts",
  "src/opaque.assembly.ts",
  "src/const.assembly.ts",
  "src/default.assembly.ts",
  "src/app/app.service.spec.ts",
  "src/globals.spec.ts",
]

/** Test factory: the reading fixture's graph, with or without the second driver. */
const levelsOf = (files: readonly string[] = FILES) => {
  const extraction = createExtraction({
    engine: createOxcEngine({ tsconfigPath: `${root}tsconfig.json` }),
    flavor: createTsSuffixesFactoriesFlavor(),
    readers: [createPlainTsReader(), createTestRunnerReader()],
  })
  return useCaseLevels(
    extraction.extractGraph({
      root,
      files,
      driverTech: (specifier) => specifier === "some-made-up-parser",
    }),
  )
}

describe("useCaseLevels", () => {
  test("a use case called from a driver's hook is primary, traced through the assembly's returned record to its service", () => {
    const { primary } = levelsOf()
    expect(
      primary.map(({ service, member, driver, span }) => [
        service,
        member,
        driver,
        span.line,
      ]),
    ).toEqual([
      ["src/app/app.service.ts", "check", "src/cli.driver.ts", 16],
      ["src/app/app.service.ts", "status", "src/cli.driver.ts", 20],
      ["src/app/app.service.ts", "check", "src/cli.driver.ts", 26],
      // the sub-driver's hook, in the world where its parser is tech —
      // the other site's world reads no hook, and disagreement kills nothing
      ["src/app/app.service.ts", "check", "src/sub.driver.ts", 4],
      ["src/app/app.service.ts", "check", "src/other.driver.ts", 20],
    ])
  })

  test("a use case on an instance the reading cannot trace is listed unresolved; an adapter or a model instance reached through the records is neither", () => {
    const { primary, unresolved } = levelsOf()
    expect(
      unresolved.map(({ driver, member, span }) => [driver, member, span.line]),
    ).toEqual([
      // the sub-driver in its third world: the instance came from the opaque
      // assembly, whose record the reading cannot see
      ["src/sub.driver.ts", "app.check", 4],
      // a record returned through a binding
      ["src/other.driver.ts", "app.status", 18],
      // an instance at an assembly's root, no function to trace
      ["src/other.driver.ts", "app.check", 22],
      // the service instance itself, and an assembly's record, called bare
      ["src/other.driver.ts", "app", 24],
      ["src/other.driver.ts", "group", 25],
    ])
    // `services.registry.get` — a model factory's instance, skipped like an adapter's
    expect(primary.map(({ member }) => member)).not.toContain("registry.get")
  })

  test("a sub-driver's hook counts once its parameters are bound: the same use case, another driver", () => {
    const { primary } = levelsOf(
      FILES.filter((file) => file !== "src/other.driver.ts"),
    )
    expect(
      primary.map(({ member, driver }) => [member, driver]),
    ).toContainEqual(["check", "src/sub.driver.ts"])
  })

  test("test hooks never label", () => {
    const { primary, unresolved } = levelsOf()
    expect(primary.map(({ driver }) => driver)).not.toContain(
      "src/app/app.service.spec.ts",
    )
    expect(unresolved.map(({ driver }) => driver)).not.toContain(
      "src/app/app.service.spec.ts",
    )
  })
})
