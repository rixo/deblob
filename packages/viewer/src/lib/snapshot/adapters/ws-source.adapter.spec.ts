// @vitest-environment node — jsdom would pull `ws` through the browser
// condition (svelte's client build needs it, vite.config.ts); here `ws`
// resolves natively and Node's own `WebSocket` global is the client.

import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, expect, test } from "vitest"
import { WebSocketServer } from "ws"

import type {
  ClientMessage,
  ServerMessage,
  Snapshot,
} from "../snapshot.model.ts"
import type { SourceState } from "../snapshot-source.port.ts"
import { createWsSource } from "./ws-source.adapter.ts"

const FAKE_PROJECTS = [
  { root: "/FAKE_ROOT", name: "FAKE_PKG" },
  { root: "/FAKE_OTHER", name: null },
]

const snapshotOf = (root: string): Snapshot => ({
  generatedAt: "1999-12-31T23:59:59.000Z",
  project: { root, name: null, provenance: "FAKE_PROV" },
  stats: { files: 0, bytes: 0, blobPercent: 0, services: 0 },
  modules: [],
  edges: [],
  unresolved: [],
})

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

/** A real server: every connection's frames collected, a `send` per client. */
const serverUp = async () => {
  const server = createServer()
  const wss = new WebSocketServer({ server })
  const connections: {
    received: ClientMessage[]
    send: (m: ServerMessage) => void
  }[] = []
  wss.on("connection", (ws) => {
    const received: ClientMessage[] = []
    ws.on("message", (data) => {
      received.push(JSON.parse(String(data)) as ClientMessage)
    })
    connections.push({
      received,
      send: (message) => ws.send(JSON.stringify(message)),
    })
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const { port } = server.address() as AddressInfo
  cleanups.push(async () => {
    for (const ws of wss.clients) ws.terminate()
    await new Promise<void>((resolve) => wss.close(() => resolve()))
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })
  const connection = async (index: number) => {
    while (connections.length <= index) await tick()
    return connections[index] as (typeof connections)[number]
  }
  return { url: `ws://127.0.0.1:${port}/FAKE_WS`, connection, wss }
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 5))

const settle = async (seen: unknown[], count: number) => {
  while (seen.length < count) await tick()
}

test("connects on the first subscriber: connecting, then projects, then the snapshot", async () => {
  const { url, connection } = await serverUp()
  const source = createWsSource(url)
  const seen: SourceState[] = []
  const unsubscribe = source.subscribe((state) => seen.push(state))
  const client = await connection(0)
  client.send({ type: "projects", projects: FAKE_PROJECTS })
  client.send({ type: "snapshot", snapshot: snapshotOf("/FAKE_ROOT") })
  await settle(seen, 3)
  expect(seen).toEqual([
    { projects: [], loading: true, error: null, snapshot: null },
    { projects: FAKE_PROJECTS, loading: true, error: null, snapshot: null },
    {
      projects: FAKE_PROJECTS,
      loading: false,
      error: null,
      snapshot: snapshotOf("/FAKE_ROOT"),
    },
  ])
  unsubscribe()
})

test("select: loading with the previous snapshot up, the frame sent; an error answers, the snapshot stays", async () => {
  const { url, connection } = await serverUp()
  const source = createWsSource(url)
  const seen: SourceState[] = []
  const unsubscribe = source.subscribe((state) => seen.push(state))
  const client = await connection(0)
  client.send({ type: "projects", projects: FAKE_PROJECTS })
  client.send({ type: "snapshot", snapshot: snapshotOf("/FAKE_ROOT") })
  await settle(seen, 3)

  source.select("/FAKE_OTHER")
  await settle(client.received, 1)
  expect(client.received).toEqual([{ type: "select", project: "/FAKE_OTHER" }])
  expect(seen[3]).toEqual({
    projects: FAKE_PROJECTS,
    loading: true,
    error: null,
    snapshot: snapshotOf("/FAKE_ROOT"),
  })

  client.send({
    type: "error",
    project: "/FAKE_OTHER",
    message: "FAKE_FAILURE",
  })
  await settle(seen, 5)
  expect(seen[4]).toEqual({
    projects: FAKE_PROJECTS,
    loading: false,
    error: { project: "/FAKE_OTHER", message: "FAKE_FAILURE" },
    snapshot: snapshotOf("/FAKE_ROOT"),
  })

  // the next select clears the error
  source.select("/FAKE_ROOT")
  await settle(seen, 6)
  expect(seen[5]?.error).toBeNull()
  expect(seen[5]?.loading).toBe(true)
  unsubscribe()
})

test("the socket closes after the last subscriber, and a new one reconnects", async () => {
  const { url, connection, wss } = await serverUp()
  const source = createWsSource(url)
  const unsubscribe = source.subscribe(() => {})
  await connection(0)
  expect(wss.clients.size).toBe(1)
  unsubscribe()
  while (wss.clients.size > 0) await tick()

  const again = source.subscribe(() => {})
  await connection(1)
  expect(wss.clients.size).toBe(1)
  again()
})

test("select before subscribe is a bug: it throws", () => {
  const source = createWsSource("ws://127.0.0.1:1/FAKE_WS")
  expect(() => source.select("/FAKE_ROOT")).toThrow(
    "ws source: select before subscribe: /FAKE_ROOT",
  )
})
