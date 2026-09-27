// SPIKE (steps 09, 11) — delete with src/spike. The product's map: the design's
// Viewer, their page as sent, mounted once in our app and fed by value from the
// snapshot source (their data contract; step 11 SPEC). What each state means
// for their page is `buildViewerProps`, product code; this host only mounts
// the page, hands it each new value, and turns their picker's pick into the
// source's select. Their page draws the server's loading and errors. Above it,
// a strip of ours keeps what their page has no place for yet: the tracer's
// miss, and the map's status: experimental.

import { mount, unmount } from "svelte"

import { buildViewerProps } from "../../../lib/map/viewer-props.model.ts"
import "../design/gen-graph.js"
import { bootPage } from "./dc-runtime.svelte.js"

// their palette (Viewer, `schemeBg` and the chrome's greys)
const STYLE = `
.dbm-frame{display:flex;flex-direction:column;height:100%}
/* their page's root is position:fixed, inset:0 — contained, it fills ours */
.dbm-frame>#dc-root{flex:1 1 0;min-height:0;height:auto;contain:layout}
.dbm-strip{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 12px;
  background:#141518;border-bottom:1px solid #2a2b30;color:#c4c2bc;
  font:12px/1.4 'IBM Plex Sans',system-ui,sans-serif}
.dbm-note{color:#8a8883}
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

/**
 * Mounts the design's Viewer on `target`, fed by `source`; returns its
 * teardown.
 */
export function mountMap(target, source) {
  const style = el("style", { textContent: STYLE })
  const strip = el("div", { className: "dbm-strip" })
  const root = el("div", { id: "dc-root" })
  const frame = el("div", { className: "dbm-frame" }, strip, root)
  document.head.append(style)
  target.style.height = "100%"
  target.append(frame)

  let built = null // the props last built, and the snapshot behind them
  let viewer = null // the mounted page and its update
  let gone = false

  const unsubscribe = source.subscribe((state) => {
    drawStrip(strip, state)
    built = buildViewerProps(state, built, globalThis.GenGraph.buildGraph)
    viewer?.update(built.props)
  })

  // their page, mounted once, on the props built so far
  void import("../design/Viewer.dc.html").then((mod) => {
    if (gone) return
    viewer = bootPage(mod.default, mod.dcDef, root, mount, {
      ...built.props,
      onProject: (project) => source.select(project),
    })
  })

  return () => {
    gone = true
    unsubscribe()
    if (viewer !== null) void unmount(viewer.page)
    frame.remove()
    style.remove()
    target.style.height = ""
  }
}
