import { describe, expect, it, test } from "vitest"

import type { ImportGraph, ModuleNode } from "../extraction/graph.model.ts"
import { readmeDirsOf, snapshotFrom, watchSetOf } from "./snapshot.model.ts"

describe("snapshotFrom", () => {
  const node = (
    path: string,
    overrides: Partial<ModuleNode> = {},
  ): ModuleNode => ({
    path,
    layer: "blob",
    serviceRoot: null,
    isPrivate: false,
    parsed: true,
    runtimeContent: [],
    reading: null,
    readings: [],
    ...overrides,
  })

  const FAKE_GRAPH: ImportGraph = {
    root: "/FAKE_ROOT",
    modules: new Map(
      [
        node("src/FAKE_A/a.model.ts", {
          layer: "model",
          serviceRoot: "src/FAKE_A",
        }),
        node("src/FAKE_A/private/p.model.ts", {
          layer: "model",
          serviceRoot: "src/FAKE_A",
          isPrivate: true,
          runtimeContent: [{ form: "const", name: "X", exported: true }],
        }),
        node("src/FAKE_B/b.service.ts", {
          layer: "service",
          serviceRoot: "src/FAKE_B",
        }),
        node("src/loose.svelte", { parsed: false }),
      ].map((module) => [module.path, module]),
    ),
    edges: [
      {
        from: "src/FAKE_B/b.service.ts",
        to: { type: "module", path: "src/FAKE_A/a.model.ts" },
        kind: "runtime",
        form: "static",
        reExport: false,
      },
    ],
    unresolved: [
      {
        from: "src/FAKE_A/a.model.ts",
        specifier: "FAKE_MISSING",
        reason: "FAKE_REASON",
        literal: true,
      },
    ],
    broken: [],
  }

  const FAKE_SIZES = [
    { path: "src/FAKE_A/a.model.ts", size: 100 },
    { path: "src/FAKE_A/private/p.model.ts", size: 100 },
    { path: "src/FAKE_B/b.service.ts", size: 200 },
    { path: "src/loose.svelte", size: 100 },
  ]

  test("folds graph, sizes and provenance into the contract, field by field", () => {
    const snapshot = snapshotFrom({
      config: {
        root: "/FAKE_ROOT",
        configPath: "/FAKE_ROOT/deblob.config.ts",
        localPath: "/FAKE_ROOT/deblob.local.ts",
        flavorName: "FAKE_FLAVOR",
      },
      graph: FAKE_GRAPH,
      sizes: FAKE_SIZES,
      name: "FAKE_PKG",
      generatedAt: "1999-12-31T23:59:59.000Z",
    })
    expect(snapshot).toEqual({
      generatedAt: "1999-12-31T23:59:59.000Z",
      project: {
        root: "/FAKE_ROOT",
        name: "FAKE_PKG",
        provenance: "deblob.config.ts + deblob.local.ts (flavor: FAKE_FLAVOR)",
      },
      stats: { files: 4, bytes: 500, blobPercent: 20, services: 2 },
      modules: [
        {
          path: "src/FAKE_A/a.model.ts",
          layer: "model",
          serviceRoot: "src/FAKE_A",
          isPrivate: false,
          parsed: true,
        },
        {
          path: "src/FAKE_A/private/p.model.ts",
          layer: "model",
          serviceRoot: "src/FAKE_A",
          isPrivate: true,
          parsed: true,
        },
        {
          path: "src/FAKE_B/b.service.ts",
          layer: "service",
          serviceRoot: "src/FAKE_B",
          isPrivate: false,
          parsed: true,
        },
        {
          path: "src/loose.svelte",
          layer: "blob",
          serviceRoot: null,
          isPrivate: false,
          parsed: false,
        },
      ],
      edges: FAKE_GRAPH.edges,
      unresolved: FAKE_GRAPH.unresolved,
    })
    // the contract is JSON: no runtime content, no maps leak through
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot)
  })

  test("a configless run says so; a config outside the root keeps its path", () => {
    const configless = snapshotFrom({
      config: {
        root: "/FAKE_ROOT",
        configPath: null,
        localPath: null,
        flavorName: "FAKE_FLAVOR",
      },
      graph: {
        root: "/FAKE_ROOT",
        modules: new Map(),
        edges: [],
        unresolved: [],
        broken: [],
      },
      sizes: [],
      name: null,
      generatedAt: "1999-12-31T23:59:59.000Z",
    })
    expect(configless.project).toEqual({
      root: "/FAKE_ROOT",
      name: null,
      provenance: "no config (defaults)",
    })
    expect(configless.stats).toEqual({
      files: 0,
      bytes: 0,
      blobPercent: 0,
      services: 0,
    })

    const elsewhere = snapshotFrom({
      config: {
        root: "/FAKE_ROOT",
        configPath: "/FAKE_ELSEWHERE/deblob.config.ts",
        localPath: null,
        flavorName: "FAKE_FLAVOR",
      },
      graph: {
        root: "/FAKE_ROOT",
        modules: new Map(),
        edges: [],
        unresolved: [],
        broken: [],
      },
      sizes: [],
      name: null,
      generatedAt: "1999-12-31T23:59:59.000Z",
    })
    expect(elsewhere.project.provenance).toBe(
      "/FAKE_ELSEWHERE/deblob.config.ts (flavor: FAKE_FLAVOR)",
    )
  })
})

describe("watchSetOf", () => {
  test("the watch set: the root, then every spanned directory under it", () => {
    expect(watchSetOf("/FAKE_ROOT", ["src", "src/lib"])).toEqual([
      "/FAKE_ROOT",
      "/FAKE_ROOT/src",
      "/FAKE_ROOT/src/lib",
    ])
    expect(watchSetOf("/FAKE_ROOT", [])).toEqual(["/FAKE_ROOT"])
  })
})

describe("readmeDirsOf", () => {
  it("lists the root, then every directory holding a covered file and each one above it, once, sorted", () => {
    expect(
      readmeDirsOf([
        "src/lib/b/b.model.ts",
        "src/lib/a/a.model.ts",
        "src/lib/a/private/p.model.ts",
        "index.ts",
      ]),
    ).toEqual([
      ".",
      "src",
      "src/lib",
      "src/lib/a",
      "src/lib/a/private",
      "src/lib/b",
    ])
  })
})
