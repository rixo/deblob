/**
 * The channel in memory: the caller connects clients and reads what they were
 * sent. Misuse is loud — connecting before anything serves, or sending before
 * the server listens, is a harness bug, never a silent no-op.
 */

import type {
  ClientMessage,
  ServerMessage,
} from "@deblob/viewer/snapshot.model"

import type { Channel, ChannelClient } from "../ports/channel.port.ts"

export type MemoryConnection = {
  /** Every server message so far, in order. */
  readonly sent: readonly ServerMessage[]
  /** Deliver a client message; resolves when the server's handler has. */
  send(message: ClientMessage): Promise<void>
}

export const createMemoryChannel = () => {
  let onClient: ((client: ChannelClient) => Promise<void>) | null = null
  const channel: Channel = {
    onClient: (handler) => {
      onClient = handler
    },
  }
  const connect = async (): Promise<MemoryConnection> => {
    if (onClient === null) {
      throw new Error(
        "memory channel: nothing is serving, connect after onClient",
      )
    }
    const sent: ServerMessage[] = []
    let onMessage: ((message: ClientMessage) => Promise<void>) | null = null
    const client: ChannelClient = {
      send: (message) => {
        sent.push(message)
      },
      onMessage: (handler) => {
        onMessage = handler
      },
    }
    await onClient(client)
    return {
      sent,
      send: (message) => {
        if (onMessage === null) {
          throw new Error("memory channel: the server is not listening")
        }
        return onMessage(message)
      },
    }
  }
  return { channel, connect }
}
