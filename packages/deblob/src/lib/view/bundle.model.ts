/**
 * What a request means inside a built bundle: a request target in, the file it
 * names and the content type it is served with out — or nothing, for a target
 * no bundle may answer. Pure string work, no path operations: a bundle's own
 * paths are POSIX whatever built it, and the root is the adapter's business.
 *
 * Stated over any bundle a build can produce, not over the files today's build
 * emits: the extension table is a census, the default is the rule.
 */

export type Asset = {
  /**
   * The request path the target resolved to, decoded and answerable — what a
   * caller compares against the paths it keeps for itself.
   */
  path: string
  /** Root-relative, `/`-separated — what the bundle port is asked to read. */
  file: string
  contentType: string
}

/** The document every extensionless target resolves to — the SPA's one page. */
export const INDEX = "index.html"

const HTML = "text/html; charset=utf-8"

/**
 * Today's census. A bundler emits fonts, images, source maps and formats not
 * invented yet; an extension missing here is served, not refused.
 */
const CONTENT_TYPES: Readonly<Record<string, string>> = {
  html: HTML,
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  json: "application/json; charset=utf-8",
  map: "application/json; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  txt: "text/plain; charset=utf-8",
  wasm: "application/wasm",
}

const DEFAULT_CONTENT_TYPE = "application/octet-stream"

/**
 * The extension of a bundle file, lowercased, or `null` for a name with none —
 * a leading dot is not one (`.gitkeep` has no extension).
 */
const extensionOf = (name: string): string | null => {
  const dot = name.lastIndexOf(".")
  return dot <= 0 ? null : name.slice(dot + 1).toLowerCase()
}

const contentTypeFor = (extension: string): string =>
  CONTENT_TYPES[extension] ?? DEFAULT_CONTENT_TYPE

/**
 * The decoded path of a request target — query and fragment dropped, `%xx`
 * resolved. `null` when the target is not one the bundle can answer: not
 * rooted, undecodable, or carrying what a filesystem must never be handed.
 *
 * The refusals are not guesses about hostile clients: the bundle root is a
 * directory on someone's machine and the server binds a port, so a target that
 * can name a file outside the root never reaches the adapter.
 */
const pathOf = (target: string): string | null => {
  const cut = target.search(/[?#]/u)
  const raw = cut === -1 ? target : target.slice(0, cut)
  if (!raw.startsWith("/")) return null
  let decoded: string
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    // a malformed escape (`%zz`) — a target, not a file
    return null
  }
  // a NUL truncates the name a filesystem call sees; a backslash is a
  // separator on one of the platforms this runs on
  if (decoded.includes("\0") || decoded.includes("\\")) return null
  return decoded
}

/**
 * The bundle file a request target names, or `null` for a target the server
 * answers 404 to. A target with no extension — `/`, `/services/FAKE`, anything
 * a client-side router owns — is the index: that is what makes the page
 * reachable at more than one URL without the server learning its routes.
 */
export const assetFor = (target: string): Asset | null => {
  const path = pathOf(target)
  if (path === null) return null
  const segments = path.split("/").filter((segment) => segment !== "")
  // `.` and `..` are the two that walk; every other segment is a name
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return null
  }
  const last = segments.at(-1)
  const extension = last === undefined ? null : extensionOf(last)
  if (extension === null) return { path, file: INDEX, contentType: HTML }
  return {
    path,
    file: segments.join("/"),
    contentType: contentTypeFor(extension),
  }
}
