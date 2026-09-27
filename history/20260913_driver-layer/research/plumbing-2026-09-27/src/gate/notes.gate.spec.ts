import { describe, expect, it } from "vitest"

import { fronts, type Inputs } from "./fronts.ts"
import { defineGate } from "./gate.ts"
import type { Gate } from "./gate.assembly.ts"

const milkAndRent = async (g: Gate) => {
  await g.app.notes.add({ text: "milk", pinned: false })
  await g.app.notes.add({ text: "rent", pinned: true })
}

describe("notes", () => {
  const { gate, deadUseCases } = defineGate<Inputs>(fronts, async (g) =>
    (await g.store.all()).map(({ text, pinned }) => ({ text, pinned })),
  )

  gate("add", [
    {
      name: "adds an unpinned note",
      input: { text: "milk", pinned: false },
      stored: [{ text: "milk", pinned: false }],
    },
    {
      name: "adds a pinned note",
      input: { text: "rent", pinned: true },
      stored: [{ text: "rent", pinned: true }],
    },
    {
      name: "rejects an empty note, storing nothing",
      input: { text: "  ", pinned: false },
      returned: { rejected: "empty-text" },
      stored: [],
    },
  ])

  gate("list", [
    {
      name: "lists every note",
      given: milkAndRent,
      input: { pinnedOnly: false },
      returned: ["milk", "rent"],
    },
    {
      name: "lists the pinned notes only",
      given: milkAndRent,
      input: { pinnedOnly: true },
      returned: ["rent"],
    },
  ])

  gate("purge", [
    { name: "forgets every note", given: milkAndRent, input: {}, stored: [] },
  ])

  it("every use case is reached by a front", () => {
    expect(deadUseCases()).toEqual([])
  })
})
