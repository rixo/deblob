import { describe, expect, it } from "vitest"

import type { ArgValue, InstanceOrigin, ModuleNode } from "./graph.model.ts"
import { createTrace } from "./trace.model.ts"

/**
 * The corpus (`cases/reader-receiving.spec.ts`) is what pins where a value is
 * followed; this file covers what no tree of well-formed files reaches: two
 * assemblies that return each other's result, a member read off a result that
 * has none of that name, an assembly no reader read.
 */

const SPAN = { start: 0, end: 1, line: 1, column: 1 } as const

const originOf = (path: string, name: string): InstanceOrigin => ({
  path,
  name,
  layer: "assembly",
})

/** An instance as returned: what `origin` built, nothing read off it. */
const instanceOf = (origin: InstanceOrigin): ArgValue => ({
  kind: "instance",
  origin,
  path: [],
  entries: null,
  from: null,
  received: false,
  host: false,
  span: SPAN,
})

/** A record as returned: its entries, in the order written. */
const recordOf = (entries: ArgValue["entries"]): ArgValue => ({
  ...instanceOf(originOf("", "")),
  origin: null,
  entries,
})

/** An assembly file whose one function returns `returned`; `null`, nothing. */
const assemblyOf = (name: string, returned: ArgValue | null): ModuleNode =>
  ({
    layer: "assembly",
    readings: [],
    reading: {
      functions: [
        {
          name,
          body: [
            {
              kind: "return",
              value: "instance",
              record: null,
              returned,
              span: SPAN,
            },
          ],
        },
      ],
    },
  }) as unknown as ModuleNode

describe("createTrace", () => {
  it("follows two assemblies that return each other's result nowhere, and does not loop", () => {
    const first = originOf("src/first.assembly.ts", "createFirst")
    const second = originOf("src/second.assembly.ts", "createSecond")
    const { trace } = createTrace(
      new Map([
        [first.path, assemblyOf(first.name, instanceOf(second))],
        [second.path, assemblyOf(second.name, instanceOf(first))],
      ]),
    )
    expect(trace(first, ["router"])).toBeNull()
  })

  it("follows an assembly's result to the factory behind it, the members read off it kept", () => {
    const assembly = originOf("src/app.assembly.ts", "createApp")
    const service: InstanceOrigin = {
      path: "src/lib/app/app.service.ts",
      name: "createAppService",
      layer: "service",
    }
    const { trace } = createTrace(
      new Map([
        [assembly.path, assemblyOf(assembly.name, instanceOf(service))],
      ]),
    )
    expect(trace(assembly, ["check"])).toEqual({
      origin: service,
      path: ["check"],
    })
  })

  it("follows a record to the entry read off it, and nowhere when no entry has that name", () => {
    const assembly = originOf("src/app.assembly.ts", "createApp")
    const service: InstanceOrigin = {
      path: "src/lib/app/app.service.ts",
      name: "createAppService",
      layer: "service",
    }
    const { trace } = createTrace(
      new Map([
        [
          assembly.path,
          assemblyOf(
            assembly.name,
            recordOf([{ key: "app", value: instanceOf(service) }]),
          ),
        ],
      ]),
    )
    expect(trace(assembly, ["app", "check"])).toEqual({
      origin: service,
      path: ["check"],
    })
    expect(trace(assembly, ["other", "check"])).toBeNull()
  })

  it("follows nowhere an assembly function that returns nothing, and an assembly no reader read", () => {
    const empty = originOf("src/empty.assembly.ts", "createEmpty")
    const unread = originOf("src/unread.assembly.ts", "createUnread")
    const { trace } = createTrace(
      new Map([
        [empty.path, assemblyOf(empty.name, null)],
        [
          unread.path,
          {
            layer: "assembly",
            readings: [],
            reading: null,
          } as unknown as ModuleNode,
        ],
      ]),
    )
    expect(trace(empty, ["check"])).toBeNull()
    expect(trace(unread, ["check"])).toBeNull()
  })
})
