/**
 * The view server — assembly: the projects a viewer at `cwd` shows, an HTTP
 * server with the ws channel at `/deblob/ws`, a watcher, the protocol served,
 * and the built bundle at `/` when there is one to serve. Takes its world as a
 * value (cwd, port, bundle, streams) so the whole thing runs in-process; the
 * bin shim owns the only `process` glue. Two callers: the package script
 * `serve` (the dev cycle, data half only) and the CLI's `view` verb.
 */

import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import { inspect } from "node:util"

import { createChokidarWatcher } from "../../lib/snapshot/adapters/chokidar-watcher.adapter.ts"
import { createWsChannel } from "../../lib/snapshot/adapters/ws-channel.adapter.ts"
import { allowsHandshake } from "../../lib/snapshot/handshake.model.ts"
import type { Report } from "../../lib/snapshot/ports/report.port.ts"
import {
  createSnapshotService,
  serveSnapshots,
} from "../../lib/snapshot/snapshot.service.ts"
import { createFsBundle } from "../../lib/view/adapters/fs-bundle.adapter.ts"
import { createViewService } from "../../lib/view/view.service.ts"
import { createProjectSource, extractionFor } from "../wiring.ts"

export const WS_PATH = "/deblob/ws"
const HOST = "127.0.0.1"

type Writer = { write(chunk: string): unknown }

export type ServeIo = {
  cwd: string
  /** `0` binds a free port — the tests' way in. */
  port: number
  /**
   * The built viewer to serve at `/`, or `null` for the dev cycle, where Vite
   * serves the page and this server is only the data half.
   */
  bundle: string | null
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
    // a refusal is not a bug, so it does not go through `report` — but a
    // server that turns clients away without a word cannot be debugged
    allows: (handshake) => {
      if (allowsHandshake(handshake)) return true
      // the origin alone: the host is this server's own address, already on
      // the line it printed when it started
      io.stderr.write(
        `deblob: refused a handshake: origin ${handshake.origin ?? "(none)"}\n`,
      )
      return false
    },
  })
  const watcher = createChokidarWatcher({ quietMs: 100, report })
  serveSnapshots({ channel, projects, runOf, watcher, report })
  // no bundle: the channel is all this server has, and every plain request is
  // a 404 — the listener is attached either way, or a stray GET is answered by
  // nobody and hangs until node times the request out
  const view =
    io.bundle === null
      ? null
      : createViewService({
          files: createFsBundle({ root: io.bundle }),
          reserved: [WS_PATH],
        })
  // the whole translation: node's request in, node's response out — what to
  // answer was decided by the service, a request that is not its own included
  server.on("request", (request, response) => {
    if (view === null) {
      response.writeHead(404).end()
      return
    }
    void view
      .respondTo({
        // a served request always has both — node's types are looser than its
        // runtime, and a `??` arm here would be unreachable by construction
        method: request.method as string,
        path: request.url as string,
      })
      .then((answer) => {
        if (answer === null) {
          response.writeHead(404).end()
          return
        }
        response
          .writeHead(answer.status, {
            "content-type": answer.contentType,
            "content-length": answer.body.byteLength,
          })
          .end(answer.body)
      })
      .catch((error: unknown) => {
        // a server does not die for one request: say it in full, answer 500
        report(error)
        response.writeHead(500).end()
      })
  })
  await new Promise<void>((resolve) => server.listen(io.port, HOST, resolve))
  const { port } = server.address() as AddressInfo
  io.stdout.write(
    io.bundle === null
      ? `deblob serve: ws://${HOST}:${port}${WS_PATH} — ${projects.length} project(s)\n`
      : `deblob view: http://${HOST}:${port} — ${projects.length} project(s), ctrl-c to stop\n`,
  )
  return {
    port,
    close: async () => {
      await closeChannel()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    },
  }
}
