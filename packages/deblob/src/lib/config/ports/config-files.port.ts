/**
 * The config files on disk, as the load use cases need them: where they are (a
 * walk up, one directory exactly, a file named on the command line) and what
 * each exports. The platform's half of loading; resolving is the service's.
 */

/** What discovery found in one directory: at least one of the two files. */
export type DiscoveredConfig = {
  /** The directory holding the files — the config root. */
  root: string
  configPath: string | null
  localPath: string | null
}

export interface ConfigFiles {
  /**
   * Upward walk from `dir`, nearest wins; `null` when nothing is found anywhere
   * above.
   */
  discoverConfig(dir: string): Promise<DiscoveredConfig | null>
  /** The config in `dir` exactly — no walk; `null` when it holds none. */
  configAt(dir: string): Promise<DiscoveredConfig | null>
  /**
   * The file at `path` (`-c`), resolved from `cwd`; the overlay looked up
   * beside it. Missing is a `ConfigError`.
   */
  explicitConfigPath(cwd: string, path: string): Promise<DiscoveredConfig>
  /** A config or local file's default export, raw. */
  importConfigDefault(path: string): Promise<unknown>
}
