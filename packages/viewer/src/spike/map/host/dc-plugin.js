// SPIKE — delete with src/spike. The design's pages (../design, their files
// verbatim) in a Vite app: `x.dc.html` compiles to a Svelte component on our
// DC runtime, and their engine scripts — the `.js` files their pages load by a
// <script src> relative to the page — are answered at the app's root, in dev
// and in the build. Only those files: never their data, docs or tests, which a
// local pull may hold (see ../.gitignore).
import { readFileSync, readdirSync } from "node:fs"
import { basename, resolve } from "node:path"
import { compileDc } from "./dc-compile.js"

export const DESIGN = resolve(import.meta.dirname, "../design")

const engineScripts = () =>
  readdirSync(DESIGN).filter(
    (name) => name.endsWith(".js") && !name.endsWith(".test.js"),
  )

export function dc() {
  return {
    name: "dc-html",
    enforce: "pre",
    // `x.dc.html` resolves to `x.dc.html.svelte`: Vite's html plugin would claim a `.html` id.
    // The dep scan reads a `.svelte` id from disk: it skips the page (svelte,
    // all a page imports, is found through our own code).
    async resolveId(source, importer, options) {
      if (!source.split("?")[0].endsWith(".dc.html")) return null
      if (options?.scan) return { id: source, external: true }
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
    configureServer(server) {
      const scripts = new Set(engineScripts())
      server.middlewares.use((req, res, next) => {
        const name = decodeURIComponent(req.url.split("?")[0]).slice(1)
        if (!scripts.has(name)) return next()
        res.setHeader("content-type", "text/javascript")
        res.end(readFileSync(resolve(DESIGN, name)))
      })
    },
    generateBundle() {
      for (const name of engineScripts())
        this.emitFile({
          type: "asset",
          fileName: name,
          source: readFileSync(resolve(DESIGN, name)),
        })
    },
  }
}
