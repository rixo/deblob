/**
 * The serve app's front service: the package script `serve`, the data half
 * alone — in the dev cycle Vite serves the page — until the user stops it. The
 * port is `PORT`'s, or the dev cycle's default. A config it cannot read is the
 * line `check` prints, exit 2, nothing listening.
 */

import { asConfigErrorOrRethrow } from "../../lib/config/config.model.ts"
import type { Terminal } from "../../lib/terminal/terminal.port.ts"
import type { Viewer } from "../../lib/view/ports/viewer.port.ts"

/** The port the Vite dev config proxies the channel to. */
const DEV_PORT = 5175

export const createServeApp = ({
  terminal,
  viewer,
}: {
  terminal: Terminal
  viewer: Viewer
}) => {
  const runServe = async (): Promise<number> => {
    let close: () => Promise<void>
    try {
      ;({ close } = await viewer.serve({
        cwd: terminal.cwd,
        port: Number(terminal.env("PORT") ?? DEV_PORT),
        bundle: null,
        stdout: { write: terminal.out },
        stderr: { write: terminal.err },
      }))
    } catch (error) {
      terminal.err(`${asConfigErrorOrRethrow(error).message}\n`)
      return 2
    }
    await terminal.stopped()
    await close()
    return 0
  }

  return {
    run: async (): Promise<void> => {
      terminal.exit(await runServe())
    },
  }
}

export type ServeApp = ReturnType<typeof createServeApp>
