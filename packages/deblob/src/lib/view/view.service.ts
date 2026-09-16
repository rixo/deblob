/**
 * What the view server answers, as values: a request in, a response out, or
 * `null` for a request that is not the view's to answer — the caller leaves
 * those alone. No sockets, no node objects, no filesystem: the driver
 * translates at the edge and the bundle arrives through its port.
 */

import { assetFor } from "./bundle.model.ts"
import type { BundleFiles } from "./ports/bundle.port.ts"

export type ViewRequest = {
  method: string
  /** The raw request target — query and fragment included, as it arrived. */
  path: string
}

export type ViewResponse = {
  status: number
  contentType: string
  body: Uint8Array
}

const NOT_FOUND: ViewResponse = {
  status: 404,
  contentType: "text/plain; charset=utf-8",
  body: new TextEncoder().encode("not found\n"),
}

export const createViewService = ({
  files,
  reserved,
}: {
  files: BundleFiles
  /**
   * Paths the view never answers, whatever the bundle holds — the channel's,
   * for one: a plain GET on it is the channel's business, not a page.
   */
  reserved: readonly string[]
}) => {
  const respondTo = async (
    request: ViewRequest,
  ): Promise<ViewResponse | null> => {
    // the bundle is a set of documents: everything else is someone else's verb
    if (request.method !== "GET") return null
    const asset = assetFor(request.path)
    // a target no bundle may answer — nothing is read, 404 is the whole reply
    if (asset === null) return NOT_FOUND
    if (reserved.includes(asset.path)) return null
    const body = await files.read(asset.file)
    // a miss is a stale hashed asset: extensionless targets became the index
    if (body === null) return NOT_FOUND
    return { status: 200, contentType: asset.contentType, body }
  }
  return { respondTo }
}
