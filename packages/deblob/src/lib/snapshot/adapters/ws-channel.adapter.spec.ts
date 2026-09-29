import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, test } from "vitest"
import WebSocket from "ws"

import type { ServerMessage } from "@deblob/viewer/snapshot.model"

import { createMemoryReport } from "./memory-report.adapter.ts"
import { createWsChannel } from "./ws-channel.adapter.ts"

describe("createWsChannel", () => {
  const FAKE_PROJECTS: ServerMessage = { type: "projects", projects: [] }

  /** A real client: every text frame collected, awaited by count. */
  const connect = (url: string, options: { origin?: string } = {}) => {
    const ws = new WebSocket(url, options)
    const received: unknown[] = []
    const closed = new Promise<void>((resolve) =>
      ws.on("close", () => resolve()),
    )
    // swallowed, and kept: a refused handshake arrives here, not as a frame
    let failure = ""
    ws.on("error", (error: Error) => {
      failure = error.message
    })
    ws.on("message", (data) => {
      received.push(JSON.parse(String(data)))
    })
    const opened = new Promise<void>((resolve) => ws.on("open", resolve))
    const until = async (count: number) => {
      while (received.length < count) await new Promise((r) => setTimeout(r, 5))
      return received
    }
    return {
      opened,
      closed,
      until,
      failure: () => failure,
      send: (text: string) => ws.send(text),
      close: () => ws.close(),
    }
  }

  const cleanups: (() => Promise<void>)[] = []
  afterEach(async () => {
    for (const cleanup of cleanups.splice(0)) await cleanup()
  })

  // the rule is `handshake.model.ts`'s and tested there; here it is a value, so
  // these tests say what the adapter does with each answer and nothing more
  const serverOn = async (path: string, allows: () => boolean = () => true) => {
    const server = createServer()
    const { report, reported } = createMemoryReport()
    const { channel, close } = createWsChannel({ server, path, report, allows })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const { port } = server.address() as AddressInfo
    const closeAll = async () => {
      await close()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
    cleanups.push(closeAll)
    return {
      channel,
      reported,
      close: closeAll,
      host: `127.0.0.1:${port}`,
      url: (p: string) => `ws://127.0.0.1:${port}${p}`,
    }
  }

  test("a client at the path reaches the handler; frames go both ways as JSON", async () => {
    const { channel, url } = await serverOn("/FAKE_WS")
    channel.onClient(async (client) => {
      client.send(FAKE_PROJECTS)
      client.onMessage(async (message) => {
        client.send({
          type: "error",
          project: message.project,
          message: "echo",
        })
      })
    })
    const client = connect(url("/FAKE_WS"))
    await client.opened
    expect(await client.until(1)).toEqual([FAKE_PROJECTS])
    client.send(JSON.stringify({ type: "select", project: "/FAKE_ROOT" }))
    expect(await client.until(2)).toEqual([
      FAKE_PROJECTS,
      { type: "error", project: "/FAKE_ROOT", message: "echo" },
    ])
    client.close()
    await client.closed
  })

  test("another path is refused at the upgrade", async () => {
    const { channel, url } = await serverOn("/FAKE_WS")
    let clients = 0
    channel.onClient(async () => {
      clients += 1
    })
    const client = connect(url("/FAKE_OTHER"))
    await client.closed
    expect(clients).toBe(0)
  })

  test("malformed frames and rejecting handlers are reported; the socket lives on", async () => {
    const { channel, reported, url } = await serverOn("/FAKE_WS")
    const FAKE_HANDLER_BUG = new Error("FAKE_HANDLER_BUG")
    channel.onClient(async (client) => {
      client.onMessage(async (message) => {
        if (message.project === "/FAKE_BROKEN") throw FAKE_HANDLER_BUG
        client.send({ type: "projects", projects: [] })
      })
      throw new Error("FAKE_CONNECT_BUG")
    })
    const client = connect(url("/FAKE_WS"))
    await client.opened
    client.send("{ not json")
    client.send(JSON.stringify({ type: "select" }))
    client.send(JSON.stringify({ type: "select", project: "/FAKE_BROKEN" }))
    client.send(JSON.stringify({ type: "select", project: "/FAKE_ROOT" }))
    expect(await client.until(1)).toEqual([FAKE_PROJECTS])
    expect(reported.map((error) => (error as Error).message)).toEqual([
      "FAKE_CONNECT_BUG",
      "ws channel: malformed client frame: { not json",
      'ws channel: not a client message: {"type":"select"}',
      "FAKE_HANDLER_BUG",
    ])
    client.close()
    await client.closed
  })

  test("a client closing, or terminated by close, reaches the handler", async () => {
    const { channel, close, url } = await serverOn("/FAKE_WS")
    let closed = 0
    channel.onClient(async (client) => {
      client.onClose(async () => {
        closed += 1
      })
    })
    const leaving = connect(url("/FAKE_WS"))
    await leaving.opened
    leaving.close()
    await leaving.closed
    while (closed < 1) await new Promise((r) => setTimeout(r, 5))

    const terminated = connect(url("/FAKE_WS"))
    await terminated.opened
    await close()
    await terminated.closed
    while (closed < 2) await new Promise((r) => setTimeout(r, 5))
    expect(closed).toBe(2)
  })

  test("the handshake's headers are what the rule is asked about", async () => {
    const seen: unknown[] = []
    const server = createServer()
    const { report } = createMemoryReport()
    createWsChannel({
      server,
      path: "/FAKE_WS",
      report,
      allows: (handshake) => {
        seen.push(handshake)
        return true
      },
    })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const { port } = server.address() as AddressInfo
    cleanups.push(
      () => new Promise<void>((resolve) => server.close(() => resolve())),
    )
    const client = connect(`ws://127.0.0.1:${port}/FAKE_WS`, {
      origin: "http://SOME_OTHER_SITE.example",
    })
    await client.opened
    expect(seen).toEqual([
      { origin: "http://SOME_OTHER_SITE.example", host: `127.0.0.1:${port}` },
    ])
    client.close()
    await client.closed
  })

  test("a handshake the rule refuses: no client reaches the handler", async () => {
    const { channel, url } = await serverOn("/FAKE_WS", () => false)
    let clients = 0
    channel.onClient(async () => {
      clients += 1
    })
    const client = connect(url("/FAKE_WS"))
    await client.closed
    expect(client.failure()).toContain("403")
    expect(clients).toBe(0)
  })

  test("close terminates the clients still connected", async () => {
    const { channel, close, url } = await serverOn("/FAKE_WS")
    channel.onClient(async () => {})
    const client = connect(url("/FAKE_WS"))
    await client.opened
    await close()
    await client.closed
  })
})
