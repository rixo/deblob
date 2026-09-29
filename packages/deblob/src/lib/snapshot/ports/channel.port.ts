/**
 * The wire, as the protocol sees it: clients arrive, each can be sent server
 * messages, reports client messages, and says when it is gone. Handlers return
 * promises so the adapter can await them — an unhandled failure in a handler is
 * the adapter's to surface, never swallowed here.
 */

import type {
  ClientMessage,
  ServerMessage,
} from "@deblob/viewer/snapshot.model"

export type ChannelClient = {
  send(message: ServerMessage): void
  onMessage(handler: (message: ClientMessage) => Promise<void>): void
  /** The client is gone, however it left; what it held is to be released. */
  onClose(handler: () => Promise<void>): void
}

export type Channel = {
  onClient(handler: (client: ChannelClient) => Promise<void>): void
}
