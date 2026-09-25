// SPIKE (step 09) — delete with src/spike. The product's map: the design's Map
// Host, their page as sent, mounted in our app and fed by the snapshot source.
// Their page reads its data from URLs; this bridge answers them, and never
// edits their files:
// - `./data/projects.json`, by fetch: one project, the current one — with one
//   project their picker stays hidden (their rule: none or one → no picker)
// - that project's graph (by import()), sequence and behavior (by fetch):
//   blob: URLs made from the snapshot's `map`
// Checkpoint 1: mounted once, on the first snapshot. The remount on each
// snapshot is checkpoint 2.
import { mount, unmount } from "svelte"

import "../design/gen-graph.js"
import { bootPage } from "./dc-runtime.svelte.js"

// the spike host's options (vite.config.js)
const GRAPH_OPTS = {
  hooks: true,
  initialCollapsed: ["src/lib/snapshot", "src/lib/view"],
}

const json = (value) =>
  URL.createObjectURL(
    new Blob([JSON.stringify(value)], { type: "application/json" }),
  )

// the design's one-object snapshot, from ours: the map's rows in place of the
// outline's, the call stacks spread in. Their gen-graph reads every module
// edge's `symbols`: an edge the symbol level did not match gets none.
const designSnapshotOf = ({ map, ...snapshot }) => ({
  ...snapshot,
  modules: map.modules,
  edges: map.edges.map((edge) =>
    edge.to.type === "module" && edge.symbols === undefined
      ? { ...edge, symbols: [] }
      : edge,
  ),
  ...(map.sequence ?? {}),
})

// what their `projects.json` lists for one snapshot, and the URLs to revoke
const projectOf = (snapshot) => {
  const S = designSnapshotOf(snapshot)
  const graph = URL.createObjectURL(
    new Blob([globalThis.GenGraph.genGraph(S, GRAPH_OPTS)], {
      type: "text/javascript",
    }),
  )
  const sequence = snapshot.map.sequence === null ? null : json(S)
  const behavior = json({ readmes: snapshot.map.readmes })
  const { root, name } = snapshot.project
  return {
    project: { id: root, label: name ?? root, graph, sequence, behavior },
    urls: [graph, sequence, behavior].filter((url) => url !== null),
  }
}

export function mountMap(target, source) {
  const projectsUrl = new URL("./data/projects.json", location.href).href
  const realFetch = window.fetch
  let current = null
  let page = null

  window.fetch = (input, init) => {
    const url = new URL(
      typeof input === "string" || input instanceof URL ? input : input.url,
      location.href,
    ).href
    if (url !== projectsUrl) return realFetch(input, init)
    return Promise.resolve(
      new Response(
        JSON.stringify({ projects: current ? [current.project] : [] }),
        { headers: { "content-type": "application/json" } },
      ),
    )
  }

  const unsubscribe = source.subscribe(async ({ snapshot }) => {
    if (snapshot === null || current !== null) return
    current = projectOf(snapshot)
    const mod = await import("../design/Deblob Map Host.dc.html")
    const root = document.createElement("div")
    root.id = "dc-root"
    target.style.height = "100%"
    target.append(root)
    page = bootPage(mod.default, mod.dcDef, root, mount)
  })

  return () => {
    unsubscribe()
    if (page !== null) void unmount(page)
    for (const url of current?.urls ?? []) URL.revokeObjectURL(url)
    window.fetch = realFetch
  }
}
