import { expect, test } from "vitest"

import type { Snapshot } from "../snapshot.model.ts"
import type { SourceState } from "../snapshot-source.port.ts"
import { createStaticSource } from "./static-source.adapter.ts"

const FAKE_SNAPSHOT: Snapshot = {
  generatedAt: "1999-12-31T23:59:59.000Z",
  project: { root: "/FAKE_ROOT", name: "FAKE_PKG", provenance: "FAKE_PROV" },
  stats: { files: 1, bytes: 10, blobPercent: 100, services: 0 },
  modules: [
    {
      path: "FAKE_FILE.ts",
      layer: "blob",
      serviceRoot: null,
      isPrivate: false,
      parsed: true,
    },
  ],
  edges: [],
  unresolved: [],
  map: {
    modules: [],
    edges: [],
    sequence: null,
    sequenceMissing: "FAKE_NO_TRACE",
    readmes: {},
  },
}

test("delivers its one state at subscription, then nothing; select is inert", () => {
  const seen: SourceState[] = []
  const source = createStaticSource(FAKE_SNAPSHOT)
  const unsubscribe = source.subscribe((state) => seen.push(state))
  source.select("/FAKE_OTHER")
  unsubscribe()
  expect(seen).toEqual([
    {
      projects: [
        { root: "/FAKE_ROOT", name: "FAKE_PKG", provenance: "FAKE_PROV" },
      ],
      loading: false,
      error: null,
      snapshot: FAKE_SNAPSHOT,
    },
  ])
})

test("null: a load that never ends — no projects, no snapshot, no error", () => {
  const seen: SourceState[] = []
  createStaticSource(null).subscribe((state) => seen.push(state))
  expect(seen).toEqual([
    { projects: [], loading: true, error: null, snapshot: null },
  ])
})
