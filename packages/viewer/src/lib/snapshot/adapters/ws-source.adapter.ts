/**
 * Live delivery over the browser `WebSocket`, speaking the protocol of
 * `snapshot.model.ts`. The socket opens on the first subscriber and closes
 * after the last (`readable`'s start/stop); a new subscription reconnects from
 * scratch. Reconnecting on a lost socket is the watcher step's concern.
 *
 * Answers are taken as they come: a `snapshot` or `error` ends the current
 * load, whichever request it answers.
 */

import { readable } from "svelte/store"

import type { ClientMessage, ServerMessage } from "../snapshot.model.ts"
import type { SnapshotSource, SourceState } from "../snapshot-source.port.ts"

const CONNECTING: SourceState = {
  projects: [],
  loading: true,
  error: null,
  snapshot: null,
}

const loadingFrom = (state: SourceState): SourceState => ({
  projects: state.projects,
  loading: true,
  error: null,
  snapshot: state.snapshot,
})

const receive = (state: SourceState, message: ServerMessage): SourceState => {
  switch (message.type) {
    case "projects":
      return { ...state, projects: message.projects }
    case "snapshot":
      return {
        projects: state.projects,
        loading: false,
        error: null,
        snapshot: message.snapshot,
      }
    case "error":
      return {
        projects: state.projects,
        loading: false,
        error: { project: message.project, message: message.message },
        snapshot: state.snapshot,
      }
  }
}

export const createWsSource = (url: string): SnapshotSource => {
  // the open socket, while subscribed — selecting without one is a caller bug
  let send = (message: ClientMessage): void => {
    throw new Error(`ws source: select before subscribe: ${message.project}`)
  }
  const { subscribe } = readable<SourceState>(CONNECTING, (_set, update) => {
    const socket = new WebSocket(url)
    socket.addEventListener("message", (event: MessageEvent<string>) => {
      const message = JSON.parse(event.data) as ServerMessage
      update((state) => receive(state, message))
    })
    send = (message) => {
      update(loadingFrom)
      socket.send(JSON.stringify(message))
    }
    return () => socket.close()
  })
  return {
    subscribe,
    select: (project) => send({ type: "select", project }),
  }
}
