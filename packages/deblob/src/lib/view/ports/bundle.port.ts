/**
 * The built bundle as the view server sees it: files read by name, where a name
 * is root-relative and `/`-separated. A file the bundle does not hold is `null`
 * — a miss is an answer, not a failure. Where the files sit (a directory, a
 * copy inside `dist`, a map in a test) is the adapter's business.
 */

export type BundleFiles = {
  read(file: string): Promise<Uint8Array | null>
}
