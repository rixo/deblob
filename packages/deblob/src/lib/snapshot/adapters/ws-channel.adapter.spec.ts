import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, expect, test } from "vitest"
import WebSocket from "ws"

import type { ServerMessage } from "@deblob/viewer/snapshot.model"

import { createMemoryReport } from "./memory-report.adapter.ts"
import { createWsChannel } from "./ws-channel.adapter.ts"

const FAKE_PROJECTS: ServerMessage = { type: "projects", projects: [] }

/** A real client: every text frame collected, awaited by count. */
const connect = (url: string) => {
  const ws = new WebSocket(url)
  const received: unknown[] = []
  const closed = new Promise<void>((resolve) => ws.on("close", () => resolve()))
  ws.on("error", () => {})
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
    send: (text: string) => ws.send(text),
    close: () => ws.close(),
  }
}

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

const serverOn = async (path: string) => {
  const server = createServer()
  const { report, reported } = createMemoryReport()
  const { channel, close } = createWsChannel({ server, path, report })
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
    url: (p: string) => `ws://127.0.0.1:${port}${p}`,
  }
}

test("a client at the path reaches the handler; frames go both ways as JSON", async () => {
  const { channel, url } = await serverOn("/FAKE_WS")
  channel.onClient(async (client) => {
    client.send(FAKE_PROJECTS)
    client.onMessage(async (message) => {
      client.send({ type: "error", project: message.project, message: "echo" })
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

test("close terminates the clients still connected", async () => {
  const { channel, close, url } = await serverOn("/FAKE_WS")
  channel.onClient(async () => {})
  const client = connect(url("/FAKE_WS"))
  await client.opened
  await close()
  await client.closed
})
