import { writable } from "svelte/store"
import { describe, expect, it, vi } from "vitest"

import { createMemoryLastProject } from "./adapters/memory-last-project.adapter.ts"
import { openOnLastProject } from "./last-project.service.ts"
import type { Snapshot } from "./snapshot.model.ts"
import type { SnapshotSource, SourceState } from "./snapshot-source.port.ts"

const PROJECTS = [
  { root: "/work/app", name: "app" },
  { root: "/work/lib", name: null },
] as const

const snapshotOf = (root: string): Snapshot => ({
  generatedAt: "1999-12-31T23:59:59.000Z",
  project: { root, name: null, provenance: "defaults" },
  stats: { files: 0, bytes: 0, blobPercent: 0, services: 0 },
  modules: [],
  edges: [],
  unresolved: [],
  verdicts: [],
  map: {
    modules: [],
    edges: [],
    sequence: null,
    sequenceMissing: "no tracer for this tree",
    readmes: {},
  },
})

const connecting = (): SourceState => ({
  projects: [],
  loading: true,
  error: null,
  snapshot: null,
})

const listed = (): SourceState => ({
  projects: PROJECTS,
  loading: true,
  error: null,
  snapshot: null,
})

const shown = (root: string): SourceState => ({
  projects: PROJECTS,
  loading: false,
  error: null,
  snapshot: snapshotOf(root),
})

/** A source whose states the row pushes, its selects recorded. */
const sourceFrom = (initial: SourceState) => {
  const states = writable(initial)
  const select = vi.fn()
  const source: SnapshotSource = { subscribe: states.subscribe, select }
  return { source, push: states.set, select }
}

describe("openOnLastProject", () => {
  it("asks for the project shown last once the server lists it, and only once", () => {
    const { source, push, select } = sourceFrom(connecting())
    const last = createMemoryLastProject()
    last.save("/work/lib")
    const unsubscribe = openOnLastProject(source, last).subscribe(() => {})

    expect(select).not.toHaveBeenCalled()
    push(listed())
    push(listed())

    expect(select.mock.calls).toEqual([["/work/lib"]])
    unsubscribe()
  })

  it("asks for the first project listed when none is kept, or the one kept is no longer listed", () => {
    for (const kept of [null, "/work/gone"]) {
      const { source, push, select } = sourceFrom(connecting())
      const last = createMemoryLastProject()
      if (kept !== null) last.save(kept)
      const unsubscribe = openOnLastProject(source, last).subscribe(() => {})

      push(listed())

      expect(select.mock.calls).toEqual([["/work/app"]])
      unsubscribe()
    }
  })

  it("keeps the project of each snapshot it passes on", () => {
    const { source, push } = sourceFrom(connecting())
    const last = createMemoryLastProject()
    const unsubscribe = openOnLastProject(source, last).subscribe(() => {})

    push(listed())
    push(shown("/work/app"))
    expect(last.load()).toBe("/work/app")
    push(shown("/work/lib"))

    expect(last.load()).toBe("/work/lib")
    unsubscribe()
  })

  it("asks for nothing when the state it starts on already names a project: a snapshot up, or an error", () => {
    const handedOver: SourceState[] = [
      shown("/work/app"),
      {
        projects: PROJECTS,
        loading: false,
        error: { project: "/work/lib", message: "broken config" },
        snapshot: null,
      },
    ]
    for (const state of handedOver) {
      const { source, select } = sourceFrom(state)
      const unsubscribe = openOnLastProject(
        source,
        createMemoryLastProject(),
      ).subscribe(() => {})

      expect(select).not.toHaveBeenCalled()
      unsubscribe()
    }
  })

  it("passes every state on as it is, and the page's own select through", () => {
    const { source, push, select } = sourceFrom(connecting())
    const opened = openOnLastProject(source, createMemoryLastProject())
    const seen: SourceState[] = []
    const unsubscribe = opened.subscribe((state) => seen.push(state))

    push(shown("/work/app"))
    opened.select("/work/lib")

    expect(seen).toEqual([connecting(), shown("/work/app")])
    expect(select).toHaveBeenLastCalledWith("/work/lib")
    unsubscribe()
  })
})
