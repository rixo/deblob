// SPIKE (step 09) — delete with src/spike. The product's map: the design's Map
// Host, their page as sent, mounted in our app and fed by the snapshot source.
// Their page reads its data from URLs; this bridge answers them, and never
// edits their files:
// - `./data/projects.json`, by fetch: every project the server offers, so
//   their own picker is the project switch (two or more → picker)
// - the current project's graph (by import()), sequence and behavior (by
//   fetch): blob: URLs made from the snapshot's `map`
// - any other project's graph: an empty graph module whose import says the
//   project was picked — their picker's only word today (design ask 3: the pick
//   calls back). The bridge asks the server for it; its snapshot remounts the
//   page, which opens on the project their picker stored.
// Each new snapshot remounts the page: their view (pan, zoom, selection) is
// saved per graph URL, and a new URL has none, so each redraw starts from
// their default view (design ask 2 removes that cost). Above the page, a strip
// of ours: the server's word (loading, an error), the tracer's miss, and the
// map's status: experimental.
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

// a project's name in their picker, which shows its id (the root) beside it
const labelOf = ({ root, name }) => name ?? root

// a project not shown: an empty graph whose import is the pick
const pickEntryOf = (project) => {
  const label = labelOf(project)
  const graph = URL.createObjectURL(
    new Blob(
      [
        `globalThis.__deblobMapPick?.(${JSON.stringify(project.root)})
export const meta = ${JSON.stringify({ project: label, breadcrumb: label })}
export const initialCollapsed = []
export const containers = ${JSON.stringify([{ id: ".", label, type: "dir" }])}
export const items = []
export const edges = []
`,
      ],
      { type: "text/javascript" },
    ),
  )
  return {
    project: { id: project.root, label, graph, sequence: null, behavior: null },
    urls: [graph],
  }
}

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
  return {
    project: {
      id: snapshot.project.root,
      label: labelOf(snapshot.project),
      graph,
      sequence,
      behavior,
    },
    urls: [graph, sequence, behavior].filter((url) => url !== null),
  }
}

// their palette (Map Host, `schemeBg` and the chrome's greys)
const STYLE = `
.dbm-frame{display:flex;flex-direction:column;height:100%}
/* their page's root is position:fixed, inset:0 — contained, it fills ours */
.dbm-frame>#dc-root{flex:1 1 0;min-height:0;height:auto;contain:layout}
.dbm-strip{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 12px;
  background:#141518;border-bottom:1px solid #2a2b30;color:#c4c2bc;
  font:12px/1.4 'IBM Plex Sans',system-ui,sans-serif}
.dbm-strip code{font-family:'IBM Plex Mono',ui-monospace,monospace;color:#8a8883}
.dbm-note{color:#8a8883}
.dbm-error{color:#e0806a}
.dbm-tag{margin-left:auto;color:#e0c05a;border:1px solid #5a4d24;border-radius:4px;padding:1px 6px}
`

const el = (tag, props = {}, ...kids) => {
  const node = Object.assign(document.createElement(tag), props)
  node.append(...kids)
  return node
}

// the strip, drawn again from each state: a handful of nodes
const drawStrip = (strip, state) => {
  strip.replaceChildren(
    ...(state.loading
      ? [el("span", { className: "dbm-note" }, "loading…")]
      : []),
    ...(state.error
      ? [
          el(
            "span",
            { className: "dbm-error" },
            el("code", {}, state.error.project),
            " ",
            state.error.message,
          ),
        ]
      : []),
    ...(state.snapshot?.map.sequence === null
      ? [
          el(
            "span",
            { className: "dbm-note" },
            "no call stacks for this project: ",
            state.snapshot.map.sequenceMissing,
          ),
        ]
      : []),
    el("span", { className: "dbm-tag" }, "experimental map"),
  )
}

export function mountMap(target, source) {
  const projectsUrl = new URL("./data/projects.json", location.href).href
  const realFetch = window.fetch
  const style = el("style", { textContent: STYLE })
  const strip = el("div", { className: "dbm-strip" })
  const frame = el("div", { className: "dbm-frame" }, strip)
  document.head.append(style)
  target.style.height = "100%"
  target.append(frame)

  let entries = null // what projects.json lists, and the URLs to revoke
  let shown = null // the snapshot it was made from
  let page = null
  let root = null
  let generation = 0

  window.fetch = (input, init) => {
    const url = new URL(
      typeof input === "string" || input instanceof URL ? input : input.url,
      location.href,
    ).href
    if (url !== projectsUrl) return realFetch(input, init)
    return Promise.resolve(
      new Response(
        JSON.stringify({
          projects: (entries ?? []).map(({ project }) => project),
        }),
        { headers: { "content-type": "application/json" } },
      ),
    )
  }

  const unmountPage = () => {
    if (page !== null) void unmount(page)
    root?.remove()
    page = null
    root = null
  }

  // their picker, picking: the server is asked, its snapshot remounts the page
  globalThis.__deblobMapPick = (project) => source.select(project)

  // a new snapshot: new project entries, the page mounted afresh on them
  const remount = async (snapshot, projects) => {
    const mine = ++generation
    const mod = await import("../design/Deblob Map Host.dc.html")
    if (mine !== generation) return
    const previous = entries
    entries = projects.map((project) =>
      project.root === snapshot.project.root
        ? projectOf(snapshot)
        : pickEntryOf(project),
    )
    unmountPage()
    root = el("div", { id: "dc-root" })
    frame.append(root)
    page = bootPage(mod.default, mod.dcDef, root, mount)
    for (const url of (previous ?? []).flatMap(({ urls }) => urls))
      URL.revokeObjectURL(url)
  }

  const unsubscribe = source.subscribe((state) => {
    drawStrip(strip, state)
    if (state.snapshot === null || state.snapshot === shown) return
    shown = state.snapshot
    void remount(state.snapshot, state.projects)
  })

  return () => {
    generation++
    unsubscribe()
    unmountPage()
    for (const url of (entries ?? []).flatMap(({ urls }) => urls))
      URL.revokeObjectURL(url)
    delete globalThis.__deblobMapPick
    frame.remove()
    style.remove()
    target.style.height = ""
    window.fetch = realFetch
  }
}
