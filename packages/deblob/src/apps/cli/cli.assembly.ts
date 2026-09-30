/**
 * The CLI, built: its front service over the terminal it runs in, the project
 * and the explain content read from disk, and the viewer's server. The install
 * and the terminal come in from the caller that knows them — the process, or a
 * test.
 */

import { createProjectSource } from "../../app.assembly.ts"
import { createContentReader } from "../../lib/explain/adapters/content.adapter.ts"
import { createNodeFs } from "../../lib/fs/adapters/node-fs.adapter.ts"
import { createProcessTerminal } from "../../lib/terminal/adapters/process-terminal.adapter.ts"
import type { Terminal } from "../../lib/terminal/terminal.port.ts"
import { serve } from "../serve/serve.assembly.ts"
import { createInstall } from "./adapters/install.adapter.ts"
import type { Cli } from "./cli.service.ts"
import { createCli } from "./cli.service.ts"
import type { Install } from "./install.port.ts"

/** The CLI over a terminal and an install of the caller's. */
export const createCliOver = (terminal: Terminal, install: Install): Cli => {
  const fs = createNodeFs()
  return createCli({
    terminal,
    project: createProjectSource(),
    content: createContentReader({ fs }),
    install,
    fs,
    viewer: { serve },
  })
}

/** The CLI a node process runs: its terminal, this package's install. */
export const createCliAssembly = (
  host: Parameters<typeof createProcessTerminal>[0],
): Cli =>
  createCliOver(
    createProcessTerminal(host),
    createInstall({ fs: createNodeFs() }),
  )
