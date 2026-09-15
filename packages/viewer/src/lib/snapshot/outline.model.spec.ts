import { expect, test } from "vitest"

import { outlineOf } from "./outline.model.ts"
import type { Layer, ModuleRef } from "./snapshot.model.ts"

const file = (
  path: string,
  layer: Layer,
  serviceRoot: string | null,
): ModuleRef => ({ path, layer, serviceRoot, isPrivate: false, parsed: true })

test("services by root, top-level last; layers in order, empty ones omitted; files in snapshot order", () => {
  const modules = [
    file("FAKE_TOP.ts", "blob", null),
    file("z/FAKE_B.service.ts", "service", "z"),
    file("a/FAKE_Y.model.ts", "model", "a"),
    file("z/FAKE_A.model.ts", "model", "z"),
    file("a/adapters/FAKE_X.adapter.ts", "adapters", "a"),
    file("a/FAKE_Z.model.ts", "model", "a"),
  ]
  expect(outlineOf(modules)).toEqual([
    {
      root: "a",
      layers: [
        { layer: "model", files: [modules[2], modules[5]] },
        { layer: "adapters", files: [modules[4]] },
      ],
    },
    {
      root: "z",
      layers: [
        { layer: "model", files: [modules[3]] },
        { layer: "service", files: [modules[1]] },
      ],
    },
    { root: null, layers: [{ layer: "blob", files: [modules[0]] }] },
  ])
})

test("no top-level files: no null service", () => {
  expect(outlineOf([file("a/FAKE.model.ts", "model", "a")])).toEqual([
    {
      root: "a",
      layers: [
        { layer: "model", files: [file("a/FAKE.model.ts", "model", "a")] },
      ],
    },
  ])
})

test("nothing: nothing", () => {
  expect(outlineOf([])).toEqual([])
})
