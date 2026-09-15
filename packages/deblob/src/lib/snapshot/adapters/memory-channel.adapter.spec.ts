import { expect, test } from "vitest"

import type { ServerMessage } from "@deblob/viewer/snapshot.model"

import { createMemoryChannel } from "./memory-channel.adapter.ts"

const FAKE_PROJECTS: ServerMessage = { type: "projects", projects: [] }

test("hands each connecting client to the server; records what it was sent", async () => {
  const { channel, connect } = createMemoryChannel()
  channel.onClient(async (client) => {
    client.send(FAKE_PROJECTS)
  })
  const first = await connect()
  const second = await connect()
  expect(first.sent).toEqual([FAKE_PROJECTS])
  expect(second.sent).toEqual([FAKE_PROJECTS])
})

test("delivers client messages to the server's handler and awaits it", async () => {
  const { channel, connect } = createMemoryChannel()
  const received: string[] = []
  channel.onClient(async (client) => {
    client.onMessage(async (message) => {
      received.push(message.project)
    })
  })
  const connection = await connect()
  await connection.send({ type: "select", project: "/FAKE_ROOT" })
  expect(received).toEqual(["/FAKE_ROOT"])
})

test("a leaving client reaches the server's close handler, or nobody", async () => {
  const { channel, connect } = createMemoryChannel()
  let closed = 0
  channel.onClient(async (client) => {
    client.onClose(async () => {
      closed += 1
    })
  })
  const connection = await connect()
  await connection.close()
  expect(closed).toBe(1)

  const careless = createMemoryChannel()
  careless.channel.onClient(async () => {})
  await expect((await careless.connect()).close()).resolves.toBeUndefined()
})

test("misuse is loud: connecting before a server, sending before it listens", async () => {
  const idle = createMemoryChannel()
  await expect(idle.connect()).rejects.toThrow("nothing is serving")

  const deaf = createMemoryChannel()
  deaf.channel.onClient(async () => {})
  const connection = await deaf.connect()
  expect(() =>
    connection.send({ type: "select", project: "/FAKE_ROOT" }),
  ).toThrow("not listening")
})
