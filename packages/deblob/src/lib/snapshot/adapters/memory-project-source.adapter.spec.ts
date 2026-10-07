import { describe, expect, it, test } from "vitest"

import type { ResolvedConfig } from "../../config/config.service.ts"
import { createMemoryProjectSource } from "./memory-project-source.adapter.ts"

describe("createMemoryProjectSource", () => {
  const fakeConfig = () => ({ root: "/FAKE_ROOT" }) as ResolvedConfig

  const sourceOver = (config = fakeConfig()) =>
    createMemoryProjectSource({
      projects: {
        "/FAKE_ROOT": {
          config,
          files: ["src/z.ts", "src/a.ts"],
          dirs: ["src"],
          sizes: { "src/z.ts": 10, "src/a.ts": 20 },
          name: "FAKE_PKG",
          readmes: { src: "FAKE_README" },
        },
      },
      now: "1999-12-31T23:59:59.000Z",
    })

  test("answers every port of the snapshot's world from the project at that directory, the scan sorted as the disk's is", async () => {
    const config = fakeConfig()
    const source = sourceOver(config)
    expect(await source.loadConfig("/FAKE_ROOT")).toBe(config)
    expect(await source.loadConfigAt("/FAKE_ROOT")).toBe(config)
    expect(await source.scanCoverage(config)).toEqual(["src/a.ts", "src/z.ts"])
    expect(await source.scanCoverageDirs(config)).toEqual(["src"])
    expect(await source.statSizes("/FAKE_ROOT", ["src/a.ts"])).toEqual([
      { path: "src/a.ts", size: 20 },
    ])
    expect(await source.readPackageName("/FAKE_ROOT")).toBe("FAKE_PKG")
    expect(source.now()).toBe("1999-12-31T23:59:59.000Z")
  })

  it("answers no README for a project that holds none", async () => {
    const bare = createMemoryProjectSource({
      projects: {
        "/FAKE_BARE": {
          config: fakeConfig(),
          files: [],
          dirs: [],
          sizes: {},
          name: null,
        },
      },
      now: "1999-12-31T23:59:59.000Z",
    })
    expect(await bare.readmeTextsOf("/FAKE_BARE", ["."])).toEqual({})
  })

  test("no project there: loading fails, the manifest name is null", async () => {
    const source = sourceOver()
    await expect(source.loadConfig("/FAKE_ELSEWHERE")).rejects.toThrow(
      "no project at /FAKE_ELSEWHERE",
    )
    expect(await source.readPackageName("/FAKE_ELSEWHERE")).toBeNull()
  })

  it("answers the READMEs it holds for the directories asked, the others left out", async () => {
    const source = sourceOver()
    expect(await source.readmeTextsOf("/FAKE_ROOT", [".", "src"])).toEqual({
      src: "FAKE_README",
    })
  })

  test("a file without a size is a fixture bug", async () => {
    const source = sourceOver()
    await expect(
      source.statSizes("/FAKE_ROOT", ["src/FAKE_UNSIZED.ts"]),
    ).rejects.toThrow("no size for src/FAKE_UNSIZED.ts")
  })
})
