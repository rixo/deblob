import { mount, unmount } from "svelte"
import { get } from "svelte/store"

import App from "./App.svelte"
import { createWsSource } from "./lib/snapshot/adapters/ws-source.adapter.ts"
import type { SourceState } from "./lib/snapshot/snapshot-source.port.ts"
import { mountMap } from "./spike/map/host/map.js"

const target = document.getElementById("app")
if (target === null) throw new Error("viewer: no #app element to mount on")

// what the previous instance of this module was showing, in dev after an
// update — nothing in the build, nothing on a first load, and nothing under
// vitest, whose `import.meta.hot` stub carries no `data`
const restored = (import.meta.hot?.data?.state ?? null) as SourceState | null

// the data server, behind Vite's proxy in dev (vite.config.ts)
const source = createWsSource(`ws://${location.host}/deblob/ws`, {
  initial: restored,
})
// `#debug`: the outline (steps 01–06); anything else: the design's map
const outline =
  location.hash === "#debug" ? mount(App, { target, props: { source } }) : null
const unmountMap: (() => void) | null =
  outline === null ? mountMap(target, source) : null

/* v8 ignore start -- dev glue: only a running Vite dev server drives an update */
if (import.meta.hot) {
  // this module is the boundary for everything under it that is not a
  // component: an update tears the app down and builds it again, because the
  // source is a live socket and there is nothing in it to patch. The state
  // crosses over, so the new one starts on the snapshot that was up.
  import.meta.hot.accept()
  import.meta.hot.dispose((data) => {
    data.state = get(source)
    if (outline !== null) void unmount(outline)
    unmountMap?.()
  })
}
/* v8 ignore stop */
