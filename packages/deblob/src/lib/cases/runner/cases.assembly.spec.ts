import { describe, expect, it } from "vitest"

import { AS_MARKED } from "./markers.model.ts"
import { assembleCase } from "./cases.assembly.ts"

describe("assembleCase", () => {
  it("wires the real chain over a tree of strings: a green tree through every check reports nothing", async () => {
    const files = {
      "src/app/app.port.ts": `
        export interface Clock { now(): number }
      `,
      "src/app/app.service.ts": `
        import type { Clock } from "./app.port.ts"
        export const createApp = ({ clock }: { clock: Clock }) => ({
          run: () => clock.now(),
        })
      `,
      "src/app/adapters/system-clock.adapter.ts": `
        import type { Clock } from "../app.port.ts"
        export const createSystemClock = (): Clock => ({ now: () => Date.now() })
      `,
      "src/cli.assembly.ts": `
        import { createSystemClock } from "./app/adapters/system-clock.adapter.ts"
        import { createApp } from "./app/app.service.ts"
        export const createCliAssembly = () => ({
          app: createApp({ clock: createSystemClock() }),
        })
      `,
      "src/cli.driver.ts": `
        import { createCliAssembly } from "./cli.assembly.ts"
        export const main = () => {
          const services = createCliAssembly()
          process.on("ready", () => services.app.run())
        }
      `,
    }
    const { judge } = assembleCase(files)
    expect(await judge({ files })).toEqual({
      ...AS_MARKED,
      expectedFailures: [],
    })
  })

  it("hands back a judge that rejects on a literal import the tree does not resolve, naming file and specifier", async () => {
    const files = {
      "src/a.model.ts": `import { b } from "./SOME_MISSING.model.ts"\nexport const A = b`,
    }
    const { judge } = assembleCase(files)
    await expect(judge({ files })).rejects.toThrow(
      /does not resolve: src\/a\.model\.ts → \.\/SOME_MISSING/,
    )
  })

  describe("with a package.json claiming a surface, and a barrel on it", () => {
    const files = {
      "package.json": JSON.stringify({
        name: "made-up",
        deblob: {},
        exports: { ".": "./src/index.ts" },
      }),
      "src/index.ts": `export { createApp } from "./app.service.ts"`,
      "src/app.service.ts": `export const createApp = () => ({})`,
    }

    it("reports through layers, barrels and surface when every check runs", async () => {
      const { judge } = assembleCase(files)
      // unmarked, every report is unexpected: the barrel's layer-in-path twice
      // (barrels, and surface through the exports map), and the layers cell
      // for a barrel importing a service, runtime-import its hint
      expect((await judge({ files })).unexpected).toEqual([
        "src/index.ts layer-in-path",
        "src/index.ts layer-in-path",
        "src/index.ts runtime-import",
        "src/index.ts service-assembly-only",
      ])
    })

    it("reports through the checks named, alone", async () => {
      const { judge } = assembleCase(files)
      expect((await judge({ files, checks: ["barrels"] })).unexpected).toEqual([
        "src/index.ts layer-in-path",
      ])
    })
  })
})
