// The design's map (../design, their pages verbatim) on our DC runtime, fed
// live. Run from packages/viewer: `pnpm spike:map`, then /dc.html (5188).
import { defineConfig } from "vite"
import { svelte } from "@sveltejs/vite-plugin-svelte"
import { readFileSync } from "node:fs"
import { resolve, basename, relative } from "node:path"
import { compileDc } from "./dc-compile.js"

const DESIGN = resolve(import.meta.dirname, "../design")

function dc() {
  return {
    name: "dc-html",
    enforce: "pre",
    // `x.dc.html` resolves to `x.dc.html.svelte`: Vite's html plugin would claim a `.html` id.
    async resolveId(source, importer) {
      if (!source.split("?")[0].endsWith(".dc.html")) return null
      const r = await this.resolve(source, importer, { skipSelf: true })
      return r && r.id.split("?")[0] + ".svelte"
    },
    load(id) {
      if (!id.endsWith(".dc.html.svelte")) return null
      const file = id.slice(0, -".svelte".length)
      this.addWatchFile(file)
      const code = compileDc(readFileSync(file, "utf8"), {
        name: basename(file, ".dc.html"),
      })
      if (process.env.DC_DUMP) console.log(code)
      return code
    },
    configurePreviewServer: (server) => serveData(server),
    configureServer: (server) => serveData(server),
  }
}

// live feed (packages/deblob/src/spike/map-feed) through their gen-graph
const DEBLOB = resolve(import.meta.dirname, "../../../../../deblob")
const FEED = resolve(DEBLOB, "src/spike/map-feed/feed.ts")
const READMES = resolve(DEBLOB, "src/spike/map-feed/readmes.ts")
// live trees, by id: the viewer's projects as `deblob view` reads them
// (view.projects + deblob.local.json, a checkout elsewhere goes there), the
// ones the tracer cannot read skipped (it reads deblob's CLI only)
const VIEWER = resolve(import.meta.dirname, "../../../..")
const { mapProjects } = await import(
  resolve(DEBLOB, "src/spike/map-feed/projects.ts")
)
const LIVE = {}
const LABEL = {}
for (const [i, { root, name }] of (await mapProjects(VIEWER)).entries()) {
  const at = relative(VIEWER, root) || "."
  try {
    await (await import(FEED)).mapFeed(root)
  } catch (e) {
    console.error(
      `[map-feed] skipped ${name} (${at}): ${(e && e.message) || e}`,
    )
    continue
  }
  LIVE[`${name}-${i}`] = root
  LABEL[`${name}-${i}`] = `${name} (${at}, live)`
}
const liveProject = (id) => ({
  id,
  label: LABEL[id],
  graph: `./live/${id}/graph.js`,
  sequence: `./live/${id}/sequence.json`,
})
const PROJECTS = { projects: Object.keys(LIVE).map(liveProject) }
const cached = new Map()
const live = (id) => {
  // one extraction serves the page's two requests (graph + sequence)
  const c = cached.get(id)
  if (c && Date.now() - c.at < 2000) return c.p
  const p = (async () => {
    const t0 = performance.now()
    const { mapFeed } = await import(FEED)
    const S = await mapFeed(LIVE[id])
    globalThis.GenGraph || (await import(resolve(DESIGN, "data/gen-graph.js")))
    const opts = {
      hooks: true,
      initialCollapsed: ["src/lib/snapshot", "src/lib/view"],
      header: [`// live ${id}, deblob spike map-feed`],
    }
    const graph = globalThis.GenGraph.genGraph(S, opts)
    const { readmesOf } = await import(READMES)
    const readmes = readmesOf(
      LIVE[id],
      globalThis.GenGraph.buildGraph(S, opts).containers.map((c) => c.id),
    )
    console.log(
      `[map-feed ${id}] ${S.modules.length} modules, ${Object.keys(S.callables).length} callables, ${Object.keys(readmes).length} readmes, ${Math.round(performance.now() - t0)} ms`,
    )
    return { json: JSON.stringify(S), graph, readmes }
  })()
  cached.set(id, { at: Date.now(), p })
  p.catch(() => cached.delete(id))
  return p
}

// The right panel's data (their `data/behavior-lorem.js` interface), live:
// READMEs only, no test extraction yet — a function's behavior is an empty
// tree, its doc the symbol's own (the panel falls back to `s.doc`), no module
// doc. Their panel loads this once per page, with no project in the url: the
// script carries every project and picks the page's the way the map does
// (`?project`, else the picker's localStorage key, else the first). Asked in
// FROM-DEBLOB: a per-project path in projects.json.
const behaviorScript = (
  byProject,
) => `// live, deblob spike map-feed (host/vite.config.js)
(function (root) {
  const R = ${JSON.stringify(byProject)};
  // the map reads ?project at load only; a pick in the picker writes the key
  const KEY = 'deblob-map.project', stored = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  let url0 = null; try { url0 = new URLSearchParams(location.search).get('project'); } catch (e) {}
  const ls0 = stored();
  const current = () => { const ls = stored(), want = ls !== ls0 ? ls : url0 || ls; return R[want] || Object.values(R)[0] || {}; };
  root.BehaviorLorem = {
    fns: {},
    get readmes() { return current(); },
    fnFor: () => ({ tree: [] }),
    readmeFor: (id) => current()[id] || null,
    docFor: () => null,
  };
})(typeof window !== 'undefined' ? window : globalThis);
`

// their data paths, served live (their data/ is never in git)
function serveData(server) {
  server.middlewares.use((req, res, next) => {
    const url = decodeURIComponent(req.url.split("?")[0])
    if (url === "/data/projects.json") {
      res.setHeader("content-type", "application/json")
      return res.end(JSON.stringify(PROJECTS))
    }
    if (url === "/data/behavior-lorem.js") {
      return Promise.all(Object.keys(LIVE).map(live)).then(
        (all) => {
          res.setHeader("content-type", "text/javascript")
          res.setHeader("cache-control", "no-store")
          const byProject = Object.fromEntries(
            Object.keys(LIVE).map((id, i) => [
              liveProject(id).id,
              all[i].readmes,
            ]),
          )
          res.end(behaviorScript(byProject))
        },
        (e) => {
          res.statusCode = 500
          res.end(String((e && e.stack) || e))
        },
      )
    }
    // their contract paths (FROM-DEBLOB ask 4), for a page with no project
    // picked yet: the first live tree
    const first = Object.keys(LIVE)[0]
    const lm =
      url === "/deblob-seq-graph.js" ||
      url === "/data/deblob.sequence.snapshot.2.json"
        ? [url, first]
        : url.match(/^\/live\/([^/]+)\/(graph\.js|sequence\.json)$/)
    if (lm && LIVE[lm[1]]) {
      return live(lm[1]).then(
        (L) => {
          const js = url.endsWith(".js")
          res.setHeader(
            "content-type",
            js ? "text/javascript" : "application/json",
          )
          res.setHeader("cache-control", "no-store")
          res.end(js ? L.graph : L.json)
        },
        (e) => {
          res.statusCode = 500
          res.end(String((e && e.stack) || e))
        },
      )
    }
    next()
  })
}

export default defineConfig({
  root: import.meta.dirname,
  publicDir: DESIGN,
  resolve: { alias: { "@design": DESIGN } },
  // the dep scan reads `.svelte` ids from disk: ours are compiled .dc.html
  optimizeDeps: { entries: [] },
  preview: { port: 5189, strictPort: true },
  build: { rollupOptions: { input: resolve(import.meta.dirname, "dc.html") } },
  server: {
    port: 5188,
    strictPort: true,
    fs: { allow: [resolve(import.meta.dirname, "..")] },
  },
  plugins: [
    dc(),
    svelte({ compilerOptions: { runes: true }, onwarn: () => {} }),
  ],
})
