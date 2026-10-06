/**
 * Use-case levels — the annotation, never a violation: a use case reached from
 * a driver's hook is primary on that channel; everything else on a service's
 * API is instrumental by complement. Pure over the graph's readings. A use case
 * traces to its service through the instance's origin: a service factory
 * directly, or out of an assembly as `trace.model.ts` follows it. Test hooks
 * never label (canon: test edges never count for use-case level).
 */

import type {
  ArgValue,
  ImportGraph,
  InstanceOrigin,
  ModuleNode,
  ReadCall,
  ReadFunction,
  ReadHook,
  ReadStatement,
  Span,
} from "./graph.model.ts"
import { createTrace } from "./trace.model.ts"

export type PrimaryUseCase = {
  /** The service file whose factory built the instance. */
  service: string
  /** The member called on it, as a path when the API nests. */
  member: string
  /** The driver whose hook made the call. */
  driver: string
  span: Span
}

/** A use case a hook calls on an instance the reading cannot trace. */
export type UnresolvedUseCase = { driver: string; member: string; span: Span }

export type UseCaseLevels = {
  primary: readonly PrimaryUseCase[]
  unresolved: readonly UnresolvedUseCase[]
}

const callsOf = (statements: readonly ReadStatement[]): ReadCall[] =>
  statements.flatMap((statement) =>
    statement.kind === "call"
      ? [statement.call]
      : statement.kind === "control"
        ? statement.arms.flatMap(callsOf)
        : [],
  )

/** Every hook, nested ones included. */
const hooksOf = (hooks: readonly ReadHook[]): ReadHook[] =>
  hooks.flatMap((hook) => [hook, ...hooksOf(hook.hooks)])

export const useCaseLevels = (graph: ImportGraph): UseCaseLevels => {
  const primary: PrimaryUseCase[] = []
  const unresolved: UnresolvedUseCase[] = []

  const { trace: follow } = createTrace(graph.modules)

  /**
   * Follow the origin down the member path: to a service (primary), to an
   * adapter, blob or model instance (not a use case — the driver rules'
   * business, skipped here), or nowhere (unresolved).
   */
  const trace = (
    origin: InstanceOrigin,
    path: readonly string[],
  ): { service: string; member: string } | "not-a-service" | null => {
    const traced = follow(origin, path)
    if (traced === null) return null
    if (traced.origin.layer !== "service") return "not-a-service"
    return traced.path.length === 0
      ? null
      : { service: traced.origin.path, member: traced.path.join(".") }
  }

  for (const node of graph.modules.values()) {
    if (node.layer !== "driver" || node.reading === null) continue
    // every world resolves: a function bound at two sites with different
    // instances is primary for both; a function with no world reads once
    const { reading } = node
    const hooks = hooksOf([
      ...reading.hooks,
      ...reading.functions.flatMap((fn) => {
        const name = fn.name ?? "default"
        const worlds = node.readings.filter(({ world }) => world.name === name)
        return worlds.length === 0
          ? fn.hooks
          : worlds.flatMap(
              // the same file read again: the function is there by name
              (bound) =>
                (
                  bound.reading.functions.find(
                    (candidate) => (candidate.name ?? "default") === name,
                  ) as ReadFunction
                ).hooks,
            )
      }),
    ])
    for (const hook of hooks) {
      for (const call of callsOf(hook.body)) {
        if (call.callee.kind !== "use-case") continue
        // a use case is a member called on an instance, and an instance always
        // has the factory call it came from
        const traced = trace(
          call.callee.origin as InstanceOrigin,
          call.callee.member.split("."),
        )
        if (traced === "not-a-service") continue
        if (traced === null) {
          unresolved.push({
            driver: node.path,
            member: call.callee.member,
            span: call.span,
          })
        } else {
          primary.push({ ...traced, driver: node.path, span: call.span })
        }
      }
    }
  }

  return { primary, unresolved }
}
