/**
 * The viewer, served: the page and its data over one port, until closed —
 * `bundle: null` serves the data half alone (the dev cycle, where Vite serves
 * the page). A config it cannot read throws before anything listens.
 */

type Writer = { write(chunk: string): unknown }

export interface Viewer {
  serve(options: {
    cwd: string
    /** `0` binds a free port. */
    port: number
    bundle: string | null
    stdout: Writer
    stderr: Writer
  }): Promise<{ port: number; close: () => Promise<void> }>
}
