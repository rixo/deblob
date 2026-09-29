import { describe, expect, it, test } from "vitest"

import type { ResolvedConfig } from "../../config/config.service.ts"
import { createMemoryProjectSource } from "./memory-project-source.adapter.ts"

describe("createMemoryProjectSource", () => {
  const FAKE_CONFIG = { root: "/FAKE_ROOT" } as ResolvedConfig

  const source = createMemoryProjectSource({
    projects: {
      "/FAKE_ROOT": {
        config: FAKE_CONFIG,
        files: ["src/z.ts", "src/a.ts"],
        dirs: ["src"],
        sizes: { "src/z.ts": 10, "src/a.ts": 20 },
        name: "FAKE_PKG",
        readmes: { src: "FAKE_README" },
      },
    },
    now: "1999-12-31T23:59:59.000Z",
  })

  test("answers every port function from the project at that directory", async () => {
    expect(await source.loadConfig("/FAKE_ROOT")).toBe(FAKE_CONFIG)
    expect(await source.loadConfigAt("/FAKE_ROOT")).toBe(FAKE_CONFIG)
    expect(await source.scanCoverage(FAKE_CONFIG)).toEqual([
      "src/z.ts",
      "src/a.ts",
    ])
    expect(await source.scanCoverageDirs(FAKE_CONFIG)).toEqual(["src"])
    expect(await source.sizesOf("/FAKE_ROOT", ["src/a.ts"])).toEqual([
      { path: "src/a.ts", size: 20 },
    ])
    expect(await source.manifestNameOf("/FAKE_ROOT")).toBe("FAKE_PKG")
    expect(source.now()).toBe("1999-12-31T23:59:59.000Z")
  })

  it("answers no README for a project that holds none", async () => {
    const bare = createMemoryProjectSource({
      projects: {
        "/FAKE_BARE": {
          config: FAKE_CONFIG,
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
    await expect(source.loadConfig("/FAKE_ELSEWHERE")).rejects.toThrow(
      "no project at /FAKE_ELSEWHERE",
    )
    expect(await source.manifestNameOf("/FAKE_ELSEWHERE")).toBeNull()
  })

  it("answers the READMEs it holds for the directories asked, the others left out", async () => {
    expect(await source.readmeTextsOf("/FAKE_ROOT", [".", "src"])).toEqual({
      src: "FAKE_README",
    })
  })

  test("a file without a size is a fixture bug", async () => {
    await expect(
      source.sizesOf("/FAKE_ROOT", ["src/FAKE_UNSIZED.ts"]),
    ).rejects.toThrow("no size for src/FAKE_UNSIZED.ts")
  })
})
