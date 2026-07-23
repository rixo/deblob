/**
 * `check dag` — rules 13 and 14, the acyclic rule at both levels. Service
 * cycles count every import kind (extraction independence holds for types);
 * module cycles count runtime edges only (the ESM hazard). One finding per
 * strongly connected component, carrying the full membership and a
 * deterministic shortest witness cycle. Pure: classified graph in, violation
 * set out — no IO, no formatting, no ordering beyond determinism.
 */

import type { ImportGraph, ModuleNode } from "../extraction/graph.model.ts"
import type { DagGroup, DagViolation, ServiceHop } from "./violation.model.ts"

const moduleOf = (graph: ImportGraph, path: string): ModuleNode => {
  const node = graph.modules.get(path)
  if (!node) {
    throw new Error(
      `extraction broke its contract: edge references ${path}, absent from the graph`,
    )
  }
  return node
}

type Digraph = ReadonlyMap<string, readonly string[]>

/**
 * Tarjan's strongly connected components, iterative (module graphs can chain
 * thousands deep — no recursion). Returns each SCC as its sorted node list.
 */
const stronglyConnected = (digraph: Digraph): string[][] => {
  const index = new Map<string, number>()
  const low = new Map<string, number>()
  const onStack = new Set<string>()
  const stack: string[] = []
  const components: string[][] = []
  let counter = 0

  for (const start of [...digraph.keys()].sort()) {
    if (index.has(start)) continue
    // frame: [node, next-neighbor position]
    const frames: [string, number][] = [[start, 0]]
    while (frames.length > 0) {
      const frame = frames[frames.length - 1] as [string, number]
      const [node, position] = frame
      if (position === 0) {
        index.set(node, counter)
        low.set(node, counter)
        counter++
        stack.push(node)
        onStack.add(node)
      }
      const neighbors = digraph.get(node) as readonly string[]
      if (position < neighbors.length) {
        frame[1]++
        const next = neighbors[position] as string
        if (!index.has(next)) {
          frames.push([next, 0])
        } else if (onStack.has(next)) {
          low.set(
            node,
            Math.min(low.get(node) as number, index.get(next) as number),
          )
        }
        continue
      }
      frames.pop()
      const parent = frames[frames.length - 1]
      if (parent) {
        low.set(
          parent[0],
          Math.min(low.get(parent[0]) as number, low.get(node) as number),
        )
      }
      if (low.get(node) === index.get(node)) {
        const component: string[] = []
        for (;;) {
          const member = stack.pop() as string
          onStack.delete(member)
          component.push(member)
          if (member === node) break
        }
        components.push(component.sort())
      }
    }
  }
  return components
}

/**
 * Shortest cycle through the SCC's smallest member: BFS from it, restricted to
 * the SCC, neighbors in sorted order; close through the predecessor nearest the
 * start — deterministic by construction. `null` when no edge closes the loop (a
 * single node without a self-edge — no cycle).
 */
const witnessCycle = (
  digraph: Digraph,
  members: readonly string[],
): string[] | null => {
  const inComponent = new Set(members)
  const start = members[0] as string
  const parent = new Map<string, string>()
  const distance = new Map<string, number>([[start, 0]])
  const queue = [start]
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head] as string
    for (const next of digraph.get(node) as readonly string[]) {
      if (!inComponent.has(next) || distance.has(next)) continue
      distance.set(next, (distance.get(node) as number) + 1)
      parent.set(next, node)
      queue.push(next)
    }
  }

  let closer: string | null = null
  for (const node of members) {
    // strong connectivity: every member is BFS-reachable — distance is total
    if (!(digraph.get(node) as readonly string[]).includes(start)) continue
    if (
      closer === null ||
      (distance.get(node) as number) < (distance.get(closer) as number)
    ) {
      closer = node
    }
  }
  if (closer === null) return null

  const cycle: string[] = []
  for (let node = closer; node !== start; node = parent.get(node) as string) {
    cycle.push(node)
  }
  cycle.push(start)
  return cycle.reverse()
}

type ServicePair = {
  via: { from: string; to: string }
  anyRuntime: boolean
  wiring: boolean
}

const groupOf = (graph: ImportGraph, members: readonly string[]): DagGroup => {
  const roots = new Set(
    members.map((path) => moduleOf(graph, path).serviceRoot),
  )
  if (roots.size === 1) {
    const root = [...roots][0] as string | null
    return root === null ? { kind: "blob" } : { kind: "service", root }
  }
  return { kind: "cross-service" }
}

export const checkDag = (graph: ImportGraph): DagViolation[] => {
  const violations: DagViolation[] = []

  // ---- rule 13: the service digraph, every edge kind, owned files only ----
  const pairs = new Map<string, Map<string, ServicePair>>()
  const serviceNodes = new Set<string>()
  for (const node of graph.modules.values()) {
    if (node.serviceRoot !== null) serviceNodes.add(node.serviceRoot)
  }
  for (const edge of graph.edges) {
    if (edge.to.type !== "module") continue
    const importer = moduleOf(graph, edge.from)
    const target = moduleOf(graph, edge.to.path)
    const from = importer.serviceRoot
    const to = target.serviceRoot
    if (from === null || to === null || from === to) continue
    const row = pairs.get(from) ?? new Map<string, ServicePair>()
    pairs.set(from, row)
    const existing = row.get(to)
    const candidate = { from: edge.from, to: edge.to.path }
    const anyRuntime =
      (existing?.anyRuntime ?? false) || edge.kind === "runtime"
    // wiring only when EVERY inducing edge is assembly-origin — a mixed hop
    // must not carry the placement remedy (parallel to typeOnly)
    const wiring = (existing?.wiring ?? true) && importer.layer === "assembly"
    if (
      existing === undefined ||
      candidate.from < existing.via.from ||
      (candidate.from === existing.via.from && candidate.to < existing.via.to)
    ) {
      row.set(to, { via: candidate, anyRuntime, wiring })
    } else {
      existing.anyRuntime = anyRuntime
      existing.wiring = wiring
    }
  }

  const serviceDigraph = new Map<string, readonly string[]>(
    [...serviceNodes].map((root) => [
      root,
      [...(pairs.get(root)?.keys() ?? [])].sort(),
    ]),
  )
  for (const members of stronglyConnected(serviceDigraph)) {
    if (members.length < 2) continue // a service cannot cycle with itself
    const services = witnessCycle(serviceDigraph, members) as string[]
    const hops: ServiceHop[] = services.map((from, position) => {
      const to = services[(position + 1) % services.length] as string
      const pair = (pairs.get(from) as Map<string, ServicePair>).get(
        to,
      ) as ServicePair
      return {
        from,
        to,
        via: pair.via,
        typeOnly: !pair.anyRuntime,
        wiring: pair.wiring,
      }
    })
    violations.push({
      check: "dag",
      ruleset: "arch",
      rules: [13],
      group: { kind: "cross-service" },
      members,
      shape: "service-cycle",
      services,
      hops,
    })
  }

  // ---- rule 14: the runtime module digraph, every parsed file ----
  const runtimeTargets = new Map<string, Set<string>>()
  for (const path of graph.modules.keys()) runtimeTargets.set(path, new Set())
  for (const edge of graph.edges) {
    if (edge.to.type !== "module" || edge.kind !== "runtime") continue
    moduleOf(graph, edge.to.path)
    ;(runtimeTargets.get(moduleOf(graph, edge.from).path) as Set<string>).add(
      edge.to.path,
    )
  }
  const moduleDigraph = new Map<string, readonly string[]>(
    [...runtimeTargets].map(([path, targets]) => [path, [...targets].sort()]),
  )
  for (const members of stronglyConnected(moduleDigraph)) {
    const files = witnessCycle(moduleDigraph, members)
    if (files === null) continue // lone node, no self-edge — no cycle
    violations.push({
      check: "dag",
      ruleset: "arch",
      rules: [14],
      group: groupOf(graph, members),
      members,
      shape: "module-cycle",
      files,
    })
  }

  return violations
}
