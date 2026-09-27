import { describe, expect, it } from "vitest"

import { createGateAssembly, type Gate } from "./gate.assembly.ts"

// The credential every front presents, where its tech has one.
export const GATE_TOKEN = "gate-token"

// Generic: knows rows and fronts, nothing of notes. Written once per
// program — or shipped by a library.
export type Front<Inputs> = {
  readonly name: string
  // One entry per use case the front reaches; a missing key = the front declines.
  readonly run: {
    readonly [K in keyof Inputs]?: (
      gate: Gate,
      input: Inputs[K],
    ) => Promise<unknown>
  }
}

export type Row<Input> = {
  name: string
  given?: (gate: Gate) => Promise<unknown>
  input: Input
  stored?: unknown
  returned?: unknown
}

export const defineGate = <Inputs>(
  fronts: readonly Front<Inputs>[],
  observe: (gate: Gate) => Promise<unknown>,
) => {
  const gate = <K extends keyof Inputs & string>(
    useCase: K,
    rows: Row<Inputs[K]>[],
  ) =>
    describe(useCase, () => {
      for (const front of fronts) {
        describe(front.name, () => {
          const run = front.run[useCase]
          if (!run) return void it.skip(`declines ${useCase}`)
          for (const row of rows) {
            it(row.name, async () => {
              const g = createGateAssembly({ token: GATE_TOKEN })
              await row.given?.(g)
              const returned = await run(g, row.input)
              if ("stored" in row) expect(await observe(g)).toEqual(row.stored)
              if ("returned" in row) expect(returned).toEqual(row.returned)
            })
          }
        })
      }
    })

  // A use case no front but the first (identity) reaches is dead.
  const deadUseCases = () => {
    const [identity, ...others] = fronts
    return Object.keys(identity.run).filter(
      (u) => !others.some((f) => f.run[u as keyof Inputs]),
    )
  }

  return { gate, deadUseCases }
}
