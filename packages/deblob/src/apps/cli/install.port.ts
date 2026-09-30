/**
 * This install of deblob: its version, and where its build put what it ships —
 * the explain content and the viewer bundle.
 */

export interface Install {
  version(): Promise<string>
  readonly contentRoot: string
  readonly bundleRoot: string
}
