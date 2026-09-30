/**
 * What a program started from a terminal sees of it: two streams, the directory
 * and the environment it was started in, its exit code, and the user's stop.
 * Every app deblob ships runs there, so the port is the genre's, not one
 * app's.
 */

export interface Terminal {
  /** Where the program's answer goes. */
  out(chunk: string): void
  /** Where what went wrong goes. */
  err(chunk: string): void
  /** The answer's stream is a terminal a human reads (styling welcome). */
  readonly interactive: boolean
  /** The working directory the program was started in. */
  readonly cwd: string
  /** An environment variable; `undefined` when unset. */
  env(name: string): string | undefined
  /** The code the program exits with, once it is done. */
  exit(code: number): void
  /** Settles when the user stops the program (ctrl-c, a kill). */
  stopped(): Promise<void>
}
