import { describe, expect, test } from "vitest"

import { assembleCase } from "./runner/cases.assembly.ts"
import type { Row } from "./runner/markers.model.ts"
import { AS_MARKED } from "./runner/markers.model.ts"

const ROWS: readonly Row[] = [
  {
    name: "a model importing a service is inward-deps, and runtime-import: as a type it would pass",
    files: {
      "src/totals.service.ts": `
        export const createTotals = () => ({ sum: (xs: number[]) => xs.length })
      `,
      "src/report.model.ts": `
        import { createTotals } from "./totals.service.ts"
        export const report = () => createTotals().sum([])
        // red: inward-deps, runtime-import -- the import of totals.service: a model reaching outward
      `,
    },
    checks: ["layers"],
  },
  {
    name: "a bare import lands in the tree's node_modules and reads through its manifest: concrete in a service is service-purity",
    files: {
      "node_modules/made-up-pkg/package.json": JSON.stringify({
        name: "made-up-pkg",
        main: "./index.js",
      }),
      "node_modules/made-up-pkg/index.js": "module.exports = {}",
      "src/app.service.ts": `
        import pkg from "made-up-pkg"
        export const createApp = () => pkg
        // red: service-purity, runtime-import -- the import of made-up-pkg: a concrete package in a service
      `,
    },
    checks: ["layers"],
  },
  {
    // canon: `ambient-access`, "a model or a service is handed the
    // environment, the time and randomness, by its caller or through a port …
    // The same at module root or in a function, in a condition or in a value."
    // A `throw` the read decides is green (`stable-root`); the read stored
    // at root is also captured state (`stable-root`, ruled 2026-09-21).
    name: "reading the environment in a service is ambient-access wherever it sits: at root, in a condition, in a function",
    files: {
      "src/server.service.ts": `
        // missed red: ambient-access -- discovered, not handed in; ambient-access is not built yet
        export const SOME_MADE_UP_PORT: string = process.env["SOME_MADE_UP_PORT"] ?? "3000" // red: stable-root -- captured at load time
        if (!process.env["SOME_MADE_UP_KEY"]) throw new Error("made up") // missed red: ambient-access -- the read, not the throw; ambient-access is not built yet
        export const createServer = () => ({
          host: () => process.env["SOME_MADE_UP_HOST"], // missed red: ambient-access -- ambient-access is not built yet
        })
      `,
    },
  },
  {
    // canon: `ambient-access`, and the model's own list: "time, randomness,
    // `globalThis` are inputs passed by the caller, not discoveries". A pure
    // language global is no environment: `Math.min`, `Math.floor` stay green.
    // The read stored at root is also captured state (`stable-root`).
    name: "reading the environment, the time or randomness in a model is ambient-access; a pure language global is not",
    files: {
      "src/mode.model.ts": `
        // missed red: ambient-access -- an input; ambient-access is not built yet
        export const SOME_MADE_UP_MODE: string = process.env["SOME_MADE_UP_MODE"] ?? "dev" // red: stable-root -- captured at load time
        export const stamp = () => Date.now() // missed red: ambient-access -- time is an input; ambient-access is not built yet
        export const pick = (xs: readonly number[]) => xs[Math.floor(Math.random() * xs.length)] // missed red: ambient-access -- randomness is an input; ambient-access is not built yet
        export const clamp = (n: number) => Math.min(n, 10)
      `,
    },
  },
  {
    // canon: `ambient-access`, "Adapters and drivers read the environment:
    // that is the tech's business." Ruled 2026-09-21 (rixo). Storing the read
    // at root is another matter, and another rule: `stable-root`, "A
    // value read from the tech is proven by no type".
    name: "reading the environment in an adapter is not ambient-access; storing the read at root is still captured state",
    files: {
      "src/server/adapters/env-server.adapter.ts": `
        export const SOME_MADE_UP_PORT: string = process.env["SOME_MADE_UP_PORT"] ?? "3000" // red: stable-root -- captured at load time, whatever the layer
        if (!process.env["SOME_MADE_UP_KEY"]) throw new Error("made up")
        export const createEnvServer = () => ({
          host: () => process.env["SOME_MADE_UP_HOST"],
        })
      `,
    },
  },
]

describe("layers", () => {
  test.each(ROWS)("$name", async (row) => {
    const { judge } = assembleCase(row.files)
    const { expectedFailures, ...match } = await judge(row)
    if (expectedFailures.length > 0) console.info(expectedFailures.join("\n"))
    expect(match).toEqual(AS_MARKED)
  })
})
