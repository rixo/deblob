/**
 * SPIKE (step 09) — delete with fine.ts and readmes.ts. The parity row: the
 * product's map rows on deblob's own tree equal the spike's, the oracle they
 * were rebuilt from.
 *
 * One ruled difference: an edge's names are sorted by code unit in the product
 * (the same bytes on every machine), by `localeCompare` in the spike. Names are
 * compared as sets.
 */

import { fileURLToPath } from "node:url"
import { expect, test } from "vitest"

import { createProjectSource, extractionFor } from "../../drivers/wiring.ts"
import { createSnapshotService } from "../../lib/snapshot/snapshot.service.ts"
import { fineSnapshot } from "./fine.ts"

const deblobRoot = fileURLToPath(new URL("../../../", import.meta.url))

const sorted = (names: readonly string[]) => [...names].sort()

test("the product's symbol level equals the spike's on deblob's own tree", async () => {
  const { snapshotOf } = createSnapshotService({
    source: createProjectSource(),
    extractionFor,
    feed: {
      sequenceOf: async () => {
        throw new Error("not traced here")
      },
      readmesOf: async () => ({}),
    },
  })
  const snapshot = await snapshotOf(deblobRoot)
  const fine = await fineSnapshot(deblobRoot, {
    modules: snapshot.modules,
    edges: snapshot.edges,
  })

  const spikeModules = fine.modules.map((module: any) => ({
    path: module.path,
    symbols: (module.symbols ?? []).map((symbol: any) => ({
      name: symbol.name,
      form: symbol.form,
      typeOnly: symbol.typeOnly,
      members: symbol.members,
      doc: symbol.doc,
    })),
    internalDeclarations: module.internalDeclarations ?? 0,
  }))
  const productModules = snapshot.map.modules.map(
    ({ path, symbols, internalDeclarations }) => ({
      path,
      symbols,
      internalDeclarations,
    }),
  )
  expect(productModules).toEqual(spikeModules)

  const spikeEdges = fine.edges.map((edge: any) => ({
    from: edge.from,
    to: edge.to,
    names: sorted((edge.symbols ?? []).map(({ name }: any) => name)),
  }))
  const productEdges = snapshot.map.edges.map(({ from, to, symbols }) => ({
    from,
    to,
    names: sorted(symbols.map(({ name }) => name)),
  }))
  expect(productEdges).toEqual(spikeEdges)
})
