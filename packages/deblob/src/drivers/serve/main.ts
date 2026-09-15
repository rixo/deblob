/**
 * The data server — assembly: the projects a viewer at `cwd` shows, an HTTP
 * server with the ws channel at `/deblob/ws`, a watcher, the protocol served.
 * Takes its world as a value (cwd, port, streams) so the whole thing runs
 * in-process; the bin shim owns the only `process` glue. No CLI verb until step
 * 05: the package script `serve`, run from source.
 */

import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import { inspect } from "node:util"

import { createChokidarWatcher } from "../../lib/snapshot/adapters/chokidar-watcher.adapter.ts"
import { createWsChannel } from "../../lib/snapshot/adapters/ws-channel.adapter.ts"
import type { Report } from "../../lib/snapshot/ports/report.port.ts"
import {
  createSnapshotService,
  serveSnapshots,
} from "../../lib/snapshot/snapshot.service.ts"
import { createProjectSource, extractionFor } from "../wiring.ts"

export const WS_PATH = "/deblob/ws"
const HOST = "127.0.0.1"

type Writer = { write(chunk: string): unknown }

export type ServeIo = {
  cwd: string
  /** `0` binds a free port — the tests' way in. */
  port: number
  stdout: Writer
  stderr: Writer
}

export const main = async (io: ServeIo) => {
  // the server's own failures, in full, where a dev server's user looks
  const report: Report = (error) => {
    io.stderr.write(`${inspect(error)}\n`)
  }
  const { runOf, projectsOf } = createSnapshotService({
    source: createProjectSource(),
    extractionFor,
  })
  const projects = await projectsOf(io.cwd)
  const server = createServer()
  const { channel, close: closeChannel } = createWsChannel({
    server,
    path: WS_PATH,
    report,
  })
  const watcher = createChokidarWatcher({ quietMs: 100, report })
  serveSnapshots({ channel, projects, runOf, watcher, report })
  await new Promise<void>((resolve) => server.listen(io.port, HOST, resolve))
  const { port } = server.address() as AddressInfo
  io.stdout.write(
    `deblob serve: ws://${HOST}:${port}${WS_PATH} — ${projects.length} project(s)\n`,
  )
  return {
    port,
    close: async () => {
      await closeChannel()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    },
  }
}
