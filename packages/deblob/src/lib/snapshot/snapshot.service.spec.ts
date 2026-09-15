import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vitest"

import type { Snapshot } from "@deblob/viewer/snapshot.model"

import { main } from "../../drivers/cli/main.ts"
import { createProjectSource, extractionFor } from "../../drivers/wiring.ts"
import { ConfigError } from "../config/config.model.ts"
import type { ResolvedConfig } from "../config/config.service.ts"
import { resolveConfig } from "../config/config.service.ts"
import { STOCK_FLAVORS } from "../extraction/adapters/ts-suffixes-factories-flavor.adapter.ts"
import type { ImportGraph, ModuleNode } from "../extraction/graph.model.ts"
import { createMemoryChannel } from "./adapters/memory-channel.adapter.ts"
import { createMemoryProjectSource } from "./adapters/memory-project-source.adapter.ts"
import { createMemoryReport } from "./adapters/memory-report.adapter.ts"
import { createSnapshotService, serveSnapshots } from "./snapshot.service.ts"

/** Real resolved configs over a fake flavor registry — the shape, not a cast. */
const configAt = (root: string, raw: unknown = {}): ResolvedConfig =>
  resolveConfig(raw, {
    root,
    configPath: null,
    localPath: null,
    flavors: STOCK_FLAVORS,
    readers: {},
  })

const FAKE_CONFIG = configAt("/FAKE_ROOT")

/** A monorepo root whose viewer lists two projects, one of them nameless. */
const FAKE_MONO_CONFIG = configAt("/FAKE_MONO", {
  view: { projects: ["/FAKE_ROOT", "/FAKE_B"] },
})

const node = (path: string): ModuleNode => ({
  path,
  layer: "blob",
  serviceRoot: null,
  isPrivate: false,
  parsed: true,
  runtimeContent: [],
  reading: null,
  readings: [],
})

/** One project at `/FAKE_ROOT`, files in filesystem order; nothing at `/FAKE_B`. */
const memorySource = createMemoryProjectSource({
  projects: {
    "/FAKE_ROOT": {
      config: FAKE_CONFIG,
      files: ["src/z.ts", "src/a.ts"],
      sizes: { "src/z.ts": 10, "src/a.ts": 10 },
      name: "FAKE_PKG",
    },
    "/FAKE_MONO": {
      config: FAKE_MONO_CONFIG,
      files: [],
      sizes: {},
      name: "FAKE_MONO",
    },
  },
  now: "1999-12-31T23:59:59.000Z",
})

const graphOf = async (files: readonly string[]): Promise<ImportGraph> => ({
  root: "/FAKE_ROOT",
  modules: new Map(files.map((path) => [path, node(path)])),
  edges: [],
  unresolved: [],
  broken: [],
})

describe("createSnapshotService", () => {
  test("snapshotOf: load, scan, extract over the sorted files, fold", async () => {
    const seen: { config: ResolvedConfig; files: readonly string[] }[] = []
    const { snapshotOf } = createSnapshotService({
      source: memorySource,
      extractionFor: (config) => (files) => {
        seen.push({ config, files })
        return graphOf(files)
      },
    })
    const snapshot = await snapshotOf("/FAKE_ROOT")
    expect(seen).toEqual([
      { config: FAKE_CONFIG, files: ["src/a.ts", "src/z.ts"] },
    ])
    expect(snapshot).toEqual({
      generatedAt: "1999-12-31T23:59:59.000Z",
      project: {
        root: "/FAKE_ROOT",
        name: "FAKE_PKG",
        provenance: "no config (defaults)",
      },
      stats: { files: 2, bytes: 20, blobPercent: 100, services: 0 },
      modules: [
        {
          path: "src/a.ts",
          layer: "blob",
          serviceRoot: null,
          isPrivate: false,
          parsed: true,
        },
        {
          path: "src/z.ts",
          layer: "blob",
          serviceRoot: null,
          isPrivate: false,
          parsed: true,
        },
      ],
      edges: [],
      unresolved: [],
    })
  })

  test("projectsOf: the config's view.projects, or the project alone; names, null without one", async () => {
    const { projectsOf } = createSnapshotService({
      source: memorySource,
      extractionFor: () => graphOf,
    })
    expect(await projectsOf("/FAKE_ROOT")).toEqual([
      { root: "/FAKE_ROOT", name: "FAKE_PKG" },
    ])
    expect(await projectsOf("/FAKE_MONO")).toEqual([
      { root: "/FAKE_ROOT", name: "FAKE_PKG" },
      { root: "/FAKE_B", name: null },
    ])
  })
})

const FAKE_PROJECTS = [
  { root: "/FAKE_A", name: "FAKE_A" },
  { root: "/FAKE_B", name: null },
]

const FAKE_BUG = new Error("FAKE_BUG")

const fakeSnapshotOf = async (dir: string): Promise<Snapshot> => {
  if (dir === "/FAKE_B") throw new ConfigError("FAKE_CONFIG_FAILURE")
  if (dir === "/FAKE_BROKEN") throw FAKE_BUG
  return {
    generatedAt: "1999-12-31T23:59:59.000Z",
    project: { root: dir, name: null, provenance: "FAKE_PROV" },
    stats: { files: 0, bytes: 0, blobPercent: 0, services: 0 },
    modules: [],
    edges: [],
    unresolved: [],
  }
}

/** A client connected to a server over the fake projects. */
const connectServed = async () => {
  const { channel, connect } = createMemoryChannel()
  const { report, reported } = createMemoryReport()
  serveSnapshots({
    channel,
    projects: FAKE_PROJECTS,
    snapshotOf: fakeSnapshotOf,
    report,
  })
  return { ...(await connect()), reported }
}

describe("serveSnapshots", () => {
  test("on connect: projects, then the first project's snapshot", async () => {
    const { sent } = await connectServed()
    expect(sent.map((message) => message.type)).toEqual([
      "projects",
      "snapshot",
    ])
    expect(sent[0]).toEqual({ type: "projects", projects: FAKE_PROJECTS })
    expect((sent[1] as { snapshot: Snapshot }).snapshot.project.root).toBe(
      "/FAKE_A",
    )
  })

  test("select: that project's snapshot; its config failing answers error, the connection lives on", async () => {
    const { sent, send } = await connectServed()
    await send({ type: "select", project: "/FAKE_B" })
    expect(sent[2]).toEqual({
      type: "error",
      project: "/FAKE_B",
      message: "FAKE_CONFIG_FAILURE",
    })
    await send({ type: "select", project: "/FAKE_A" })
    expect((sent[3] as { snapshot: Snapshot }).snapshot.project.root).toBe(
      "/FAKE_A",
    )
    expect(sent).toHaveLength(4)
  })

  test("a failure that is not the project's is a bug: reported in full, the client told, the connection lives on", async () => {
    const { sent, send, reported } = await connectServed()
    await send({ type: "select", project: "/FAKE_BROKEN" })
    expect(reported).toEqual([FAKE_BUG])
    expect(sent[2]).toEqual({
      type: "error",
      project: "/FAKE_BROKEN",
      message: "the server failed on this project — see its log",
    })
    await send({ type: "select", project: "/FAKE_A" })
    expect((sent[3] as { snapshot: Snapshot }).snapshot.project.root).toBe(
      "/FAKE_A",
    )
  })

  test("nothing to serve is a caller error, raised before any client", () => {
    const { channel } = createMemoryChannel()
    const { report } = createMemoryReport()
    expect(() =>
      serveSnapshots({
        channel,
        projects: [],
        snapshotOf: fakeSnapshotOf,
        report,
      }),
    ).toThrow("no project to serve")
  })
})

/** The driver's own wiring over this very package. */
const deblobRoot = fileURLToPath(new URL("../../../", import.meta.url))

describe("self-extract", () => {
  test("snapshots this package with the numbers `deblob check` reports", async () => {
    const { snapshotOf } = createSnapshotService({
      source: createProjectSource(),
      extractionFor,
    })
    const snapshot = await snapshotOf(deblobRoot)

    let out = ""
    await main({
      argv: ["check"],
      cwd: deblobRoot,
      stdout: { write: (chunk: string) => (out += chunk) },
      stderr: { write: () => {} },
      env: {},
    })
    const headline = /(\d+) files? · \S+ · (\d+)% blob/.exec(out)
    const coverage = /(\d+) services? · (\d+) imports?/.exec(out)
    expect(headline).not.toBeNull()
    expect(coverage).not.toBeNull()
    const [, files, blobPercent] = headline as RegExpExecArray
    const [, services, imports] = coverage as RegExpExecArray

    expect(snapshot.project.name).toBe("deblob")
    expect(snapshot.project.provenance).toBe(
      "deblob.config.ts (flavor: ts-suffixes-factories)",
    )
    expect(snapshot.stats.files).toBe(Number(files))
    expect(snapshot.stats.blobPercent).toBe(Number(blobPercent))
    expect(snapshot.stats.services).toBe(Number(services))
    expect(snapshot.edges).toHaveLength(Number(imports))
    expect(snapshot.modules.map((module) => module.path)).toContain(
      "src/lib/snapshot/snapshot.service.ts",
    )
    // the config loader's non-literal `import()` is informational by design;
    // a literal one is what the check refuses to certify
    expect(snapshot.unresolved.filter((entry) => entry.literal)).toEqual([])
  })
})
