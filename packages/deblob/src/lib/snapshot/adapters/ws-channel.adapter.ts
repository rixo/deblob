/**
 * The channel over the `ws` package, attached to an existing HTTP server's
 * upgrade at one path — so it coexists with another socket on the same server
 * (Vite's). JSON text frames both ways. A malformed client frame, or a handler
 * that rejects, is reported and the socket lives on; nobody listening means the
 * frame is dropped, as the port says. The socket's `close` — the client's own,
 * or `terminate` from here — is the port's close.
 */

import type { IncomingMessage, Server } from "node:http"

import type {
  ClientMessage,
  ServerMessage,
} from "@deblob/viewer/snapshot.model"
import { WebSocketServer } from "ws"

import type { Channel } from "../ports/channel.port.ts"
import type { Report } from "../ports/report.port.ts"

/** The wire's word for a client message, or a loud refusal. */
const parseClientMessage = (text: string): ClientMessage => {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch (error) {
    throw new Error(`ws channel: malformed client frame: ${text}`, {
      cause: error,
    })
  }
  const message = value as { type?: unknown; project?: unknown }
  if (message?.type !== "select" || typeof message.project !== "string") {
    throw new Error(`ws channel: not a client message: ${text}`)
  }
  return { type: "select", project: message.project }
}

const pathOf = (request: IncomingMessage): string =>
  new URL(request.url as string, "http://localhost").pathname

export const createWsChannel = ({
  server,
  path,
  report,
}: {
  server: Server
  path: string
  report: Report
}) => {
  const wss = new WebSocketServer({ noServer: true })
  server.on("upgrade", (request, socket, head) => {
    if (pathOf(request) !== path) {
      socket.destroy()
      return
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request)
    })
  })

  const channel: Channel = {
    onClient: (handler) => {
      wss.on("connection", (ws) => {
        handler({
          send: (message: ServerMessage) => {
            ws.send(JSON.stringify(message))
          },
          onMessage: (onMessage) => {
            ws.on("message", (data) => {
              let message: ClientMessage
              try {
                message = parseClientMessage(String(data))
              } catch (error) {
                report(error)
                return
              }
              onMessage(message).catch(report)
            })
          },
          onClose: (onClose) => {
            ws.on("close", () => {
              onClose().catch(report)
            })
          },
        }).catch(report)
      })
    },
  }

  const close = async (): Promise<void> => {
    for (const ws of wss.clients) ws.terminate()
    await new Promise<void>((resolve) => {
      wss.close(() => resolve())
    })
  }

  return { channel, close }
}
