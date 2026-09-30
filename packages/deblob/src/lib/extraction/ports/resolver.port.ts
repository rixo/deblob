/**
 * Resolution — where a specifier lands as imported from a file. Split off the
 * engine: parsing reads a string, resolution reads a tree, and the tree the
 * node run reads is the disk while a case's is the fs port's. Promise-only,
 * like the port underneath.
 */

export type Resolution =
  | { kind: "file"; path: string }
  | { kind: "builtin"; specifier: string }
  | { kind: "unresolved"; reason: string }

export interface Resolver {
  /**
   * Resolve a specifier as imported from the given file: an absolute file path,
   * a builtin under its `node:` name, or the reason it did not resolve.
   */
  resolve(fromAbsolutePath: string, specifier: string): Promise<Resolution>
}

/**
 * A resolver per config: its tsconfig (declared, disabled, or discovered at the
 * root — whether one exists is the adapter's fs fact) and its aliases. A
 * declared tsconfig that does not exist is a `ConfigError`: declared means
 * load-bearing.
 */
export interface Resolvers {
  resolverFor(options: {
    root: string
    tsconfig: string | false | undefined
    alias: Readonly<Record<string, readonly string[]>>
  }): Promise<Resolver>
}
