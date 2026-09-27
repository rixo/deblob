import { describe, expect, it, vi } from "vitest"

import type { MapSequence, Snapshot } from "../snapshot/snapshot.model.ts"
import type { SourceState } from "../snapshot/snapshot-source.port.ts"
import { buildViewerProps } from "./viewer-props.model.ts"

const sequence = (): MapSequence => ({
  callables: {},
  participants: [],
  drivers: [{ name: "cli", module: "src/cli.ts", entry: [], hooks: [] }],
})

const snapshotOf = (
  generatedAt: string,
  calls: MapSequence | null = sequence(),
): Snapshot => ({
  generatedAt,
  project: { root: "/work/app", name: "app", provenance: "defaults" },
  stats: { files: 1, bytes: 10, blobPercent: 0, services: 1 },
  modules: [],
  edges: [],
  unresolved: [],
  map: {
    modules: [
      {
        path: "src/cli.ts",
        layer: "driver",
        serviceRoot: null,
        isPrivate: false,
        parsed: true,
        symbols: [],
        internalDeclarations: 0,
      },
    ],
    edges: [],
    sequence: calls,
    sequenceMissing: calls === null ? "no tracer for this tree" : null,
    readmes: { ".": [{ p: "An app." }] },
  },
})

const PROJECTS = [
  { root: "/work/app", name: "app" },
  { root: "/work/lib", name: null },
] as const

const stateOf = (
  snapshot: Snapshot | null,
  extra: Partial<SourceState> = {},
): SourceState =>
  ({
    projects: PROJECTS,
    loading: snapshot === null,
    error: null,
    snapshot,
    ...extra,
  }) as SourceState

// their buildGraph stands in: a fresh object per call, the input kept
const graphBuilder = () =>
  vi.fn((snapshot: unknown, options: unknown) => ({ snapshot, options }))

describe("buildViewerProps", () => {
  it("lists every project the source knows, labelled by name, else by root", () => {
    const { props } = buildViewerProps(stateOf(null), null, graphBuilder())

    expect(props.projects).toEqual([
      {
        id: "/work/app",
        label: "app",
        graph: null,
        sequence: null,
        behavior: null,
      },
      {
        id: "/work/lib",
        label: "/work/lib",
        graph: null,
        sequence: null,
        behavior: null,
      },
    ])
  })

  it("gives no project and no data before the first snapshot, only the loading", () => {
    const buildGraph = graphBuilder()

    const { props } = buildViewerProps(stateOf(null), null, buildGraph)

    expect(props).toMatchObject({
      project: null,
      graphData: null,
      sequence: null,
      behavior: null,
      loading: true,
      error: null,
    })
    expect(buildGraph).not.toHaveBeenCalled()
  })

  it("feeds the snapshot's project: its graph, its call stacks and its READMEs", () => {
    const snapshot = snapshotOf("2026-09-27T20:00:00.000Z")
    const buildGraph = graphBuilder()

    const { props } = buildViewerProps(stateOf(snapshot), null, buildGraph)

    const design = {
      generatedAt: snapshot.generatedAt,
      project: snapshot.project,
      stats: snapshot.stats,
      unresolved: snapshot.unresolved,
      modules: snapshot.map.modules,
      edges: snapshot.map.edges,
      ...sequence(),
    }
    expect(buildGraph).toHaveBeenCalledWith(design, { hooks: true })
    expect(props).toMatchObject({
      project: "/work/app",
      graphData: { snapshot: design, options: { hooks: true } },
      sequence: design,
      behavior: { readmes: { ".": [{ p: "An app." }] } },
      loading: false,
      error: null,
    })
  })

  it("sends no call stacks for a project the tracer could not read", () => {
    const snapshot = snapshotOf("2026-09-27T20:00:00.000Z", null)

    const { props } = buildViewerProps(stateOf(snapshot), null, graphBuilder())

    expect(props.sequence).toBeNull()
    expect(props.graphData).not.toBeNull()
  })

  it("keeps the last snapshot's data under a loading and under an error", () => {
    const snapshot = snapshotOf("2026-09-27T20:00:00.000Z")
    const error = { project: "/work/lib", message: "the config is broken" }

    const loading = buildViewerProps(
      stateOf(snapshot, { loading: true }),
      null,
      graphBuilder(),
    )
    const failed = buildViewerProps(
      stateOf(snapshot, { loading: false, error }),
      null,
      graphBuilder(),
    )

    expect(loading.props).toMatchObject({ project: "/work/app", loading: true })
    expect(failed.props).toMatchObject({
      project: "/work/app",
      loading: false,
      error: "the config is broken",
    })
  })

  it("keeps the same graph object while the snapshot is the same, and builds a new one for a new snapshot", () => {
    const first = snapshotOf("2026-09-27T20:00:00.000Z")
    const buildGraph = graphBuilder()

    const shown = buildViewerProps(stateOf(first), null, buildGraph)
    const reloading = buildViewerProps(
      stateOf(first, { loading: true }),
      shown,
      buildGraph,
    )
    const saved = buildViewerProps(
      stateOf(snapshotOf("2026-09-27T20:01:00.000Z")),
      reloading,
      buildGraph,
    )

    expect(reloading.props.graphData).toBe(shown.props.graphData)
    expect(saved.props.graphData).not.toBe(shown.props.graphData)
    expect(buildGraph).toHaveBeenCalledTimes(2)
  })
})
