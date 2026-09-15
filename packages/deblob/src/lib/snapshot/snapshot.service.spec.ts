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
import { createMemoryWatcher } from "./adapters/memory-watcher.adapter.ts"
import { createMemoryReport } from "./adapters/memory-report.adapter.ts"
import type { ProjectRun } from "./snapshot.service.ts"
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
      dirs: ["src"],
      sizes: { "src/z.ts": 10, "src/a.ts": 10 },
      name: "FAKE_PKG",
    },
    "/FAKE_MONO": {
      config: FAKE_MONO_CONFIG,
      files: [],
      dirs: [],
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

/** A deferred run: the test resolves it. */
const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

/** Runs counted, so a re-run shows in `generatedAt`; a slow project on demand. */
const fakeRuns = () => {
  let runs = 0
  const slow: { resolve: (run: ProjectRun) => void }[] = []
  const failing = new Set<string>()
  const runAt = (root: string): ProjectRun => ({
    snapshot: {
      generatedAt: `FAKE_RUN_${runs}`,
      project: { root, name: null, provenance: "FAKE_PROV" },
      stats: { files: 0, bytes: 0, blobPercent: 0, services: 0 },
      modules: [],
      edges: [],
      unresolved: [],
    },
    watchSet: [root, `${root}/src`],
  })
  const runOf = async (root: string): Promise<ProjectRun> => {
    runs += 1
    if (root === "/FAKE_B" || failing.has(root)) {
      throw new ConfigError("FAKE_CONFIG_FAILURE")
    }
    if (root === "/FAKE_BROKEN") throw FAKE_BUG
    if (root === "/FAKE_SLOW") {
      const { promise, resolve } = deferred<ProjectRun>()
      slow.push({ resolve })
      return promise
    }
    return runAt(root)
  }
  return {
    runOf,
    /** Let the oldest pending slow run answer. */
    release: () => {
      const pending = slow.shift()
      if (pending === undefined) throw new Error("no slow run pending")
      pending.resolve(runAt("/FAKE_SLOW"))
    },
    /** Every later run of `root` fails on its config. */
    fail: (root: string) => {
      failing.add(root)
    },
  }
}

/** A client connected to a server over the fake projects. */
const connectServed = async () => {
  const { channel, connect } = createMemoryChannel()
  const { report, reported } = createMemoryReport()
  const { watcher, change, watching } = createMemoryWatcher()
  const runs = fakeRuns()
  serveSnapshots({
    channel,
    projects: FAKE_PROJECTS,
    runOf: runs.runOf,
    watcher,
    report,
  })
  const connection = await connect()
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0))
  return {
    ...connection,
    reported,
    change,
    watching,
    release: runs.release,
    fail: runs.fail,
    settle,
    generatedAtOf: (index: number) =>
      (connection.sent[index] as { snapshot: Snapshot }).snapshot.generatedAt,
    rootOf: (index: number) =>
      (connection.sent[index] as { snapshot: Snapshot }).snapshot.project.root,
  }
}

describe("serveSnapshots", () => {
  test("on connect: projects, then the first project's snapshot, its set watched", async () => {
    const { sent, watching, rootOf } = await connectServed()
    expect(sent.map((message) => message.type)).toEqual([
      "projects",
      "snapshot",
    ])
    expect(sent[0]).toEqual({ type: "projects", projects: FAKE_PROJECTS })
    expect(rootOf(1)).toBe("/FAKE_A")
    expect(watching()).toEqual([["/FAKE_A", "/FAKE_A/src"]])
  })

  test("a change under the watch runs the project again and pushes the snapshot; the set is refreshed", async () => {
    const { sent, change, watching, settle, generatedAtOf } =
      await connectServed()
    change("/FAKE_A/src")
    await settle()
    expect(sent.map((message) => message.type)).toEqual([
      "projects",
      "snapshot",
      "snapshot",
    ])
    expect(generatedAtOf(1)).toBe("FAKE_RUN_1")
    expect(generatedAtOf(2)).toBe("FAKE_RUN_2")
    expect(watching()).toEqual([["/FAKE_A", "/FAKE_A/src"]])
  })

  test("select: that project's snapshot, the watch moved; its config failing answers error and watches its root", async () => {
    const { sent, send, change, watching, settle, rootOf } =
      await connectServed()
    await send({ type: "select", project: "/FAKE_B" })
    expect(sent[2]).toEqual({
      type: "error",
      project: "/FAKE_B",
      message: "FAKE_CONFIG_FAILURE",
    })
    expect(watching()).toEqual([["/FAKE_B"]])
    // the old project is nobody's concern any more
    change("/FAKE_A/src")
    await settle()
    expect(sent).toHaveLength(3)

    await send({ type: "select", project: "/FAKE_A" })
    expect(rootOf(3)).toBe("/FAKE_A")
    expect(watching()).toEqual([["/FAKE_A", "/FAKE_A/src"]])
    expect(sent).toHaveLength(4)
  })

  test("a change whose run now fails answers error and keeps the set as it was", async () => {
    const { sent, change, watching, settle, fail } = await connectServed()
    fail("/FAKE_A")
    change("/FAKE_A/src")
    await settle()
    expect(sent[2]).toEqual({
      type: "error",
      project: "/FAKE_A",
      message: "FAKE_CONFIG_FAILURE",
    })
    expect(watching()).toEqual([["/FAKE_A", "/FAKE_A/src"]])
  })

  test("a failure that is not the project's is a bug: reported in full, the client told, the connection lives on", async () => {
    const { sent, send, reported, rootOf } = await connectServed()
    await send({ type: "select", project: "/FAKE_BROKEN" })
    expect(reported).toEqual([FAKE_BUG])
    expect(sent[2]).toEqual({
      type: "error",
      project: "/FAKE_BROKEN",
      message: "the server failed on this project — see its log",
    })
    await send({ type: "select", project: "/FAKE_A" })
    expect(rootOf(3)).toBe("/FAKE_A")
  })

  test("runs never overlap: changes during a run collapse into one more; a select mid-run drops the stale answer", async () => {
    const { sent, send, change, release, settle, rootOf, watching } =
      await connectServed()
    const selecting = send({ type: "select", project: "/FAKE_SLOW" })
    await settle()
    expect(watching()).toEqual([["/FAKE_SLOW"]]) // the root, before the run
    change("/FAKE_A/src") // the old watch is closed: nobody hears it
    expect(sent).toHaveLength(2)
    release()
    await selecting
    expect(rootOf(2)).toBe("/FAKE_SLOW")
    expect(watching()).toEqual([["/FAKE_SLOW", "/FAKE_SLOW/src"]])

    // three changes while the slow run is pending: one more run, one snapshot
    change("/FAKE_SLOW/src")
    await settle()
    change("/FAKE_SLOW/src")
    change("/FAKE_SLOW")
    release()
    await settle()
    release()
    await settle()
    expect(sent.map((message) => message.type)).toEqual([
      "projects",
      "snapshot",
      "snapshot",
      "snapshot",
      "snapshot",
    ])

    // a select while the slow project runs: its late answer is dropped
    change("/FAKE_SLOW/src")
    await settle()
    const switching = send({ type: "select", project: "/FAKE_A" })
    await settle()
    release()
    await switching
    expect(rootOf(sent.length - 1)).toBe("/FAKE_A")
    expect(sent.filter((m) => m.type === "snapshot")).toHaveLength(5)
  })

  test("a client gone mid-run, a change pending: nothing sent, nothing watched, no more runs", async () => {
    const { sent, send, close, release, settle, watching, change } =
      await connectServed()
    const selecting = send({ type: "select", project: "/FAKE_SLOW" })
    await settle()
    change("/FAKE_SLOW") // marks one more run — never made
    await close()
    expect(watching()).toEqual([])
    release()
    await selecting
    expect(sent).toHaveLength(2)
    expect(watching()).toEqual([])
  })

  test("a client gone right after a select, before its root is watched", async () => {
    const { sent, send, close, settle, watching } = await connectServed()
    const selecting = send({ type: "select", project: "/FAKE_A" })
    await close()
    await selecting
    await settle()
    expect(sent).toHaveLength(2)
    expect(watching()).toEqual([])
  })

  test("two selects in a row: the first never watched, the second answered", async () => {
    const { sent, send, rootOf, watching } = await connectServed()
    const first = send({ type: "select", project: "/FAKE_SLOW" })
    const second = send({ type: "select", project: "/FAKE_A" })
    await Promise.all([first, second])
    expect(rootOf(2)).toBe("/FAKE_A")
    expect(sent).toHaveLength(3)
    expect(watching()).toEqual([["/FAKE_A", "/FAKE_A/src"]])
  })

  test("nothing to serve is a caller error, raised before any client", () => {
    const { channel } = createMemoryChannel()
    const { report } = createMemoryReport()
    const { watcher } = createMemoryWatcher()
    expect(() =>
      serveSnapshots({
        channel,
        projects: [],
        runOf: fakeRuns().runOf,
        watcher,
        report,
      }),
    ).toThrow("no project to serve")
  })
})

/** The driver's own wiring over this very package. */
const deblobRoot = fileURLToPath(new URL("../../../", import.meta.url))

describe("self-extract", () => {
  test("snapshots this package with the numbers `deblob check` reports", async () => {
    const source = createProjectSource()
    const { snapshotOf } = createSnapshotService({ source, extractionFor })
    const snapshot = await snapshotOf(deblobRoot)

    // the live scan's directories span every covered file — the watch set
    const dirs = await source.scanCoverageDirs(
      await source.loadConfig(deblobRoot),
    )
    for (const { path } of snapshot.modules) {
      const dir = path.slice(0, path.lastIndexOf("/"))
      if (dir !== "") expect(dirs).toContain(dir)
    }

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
