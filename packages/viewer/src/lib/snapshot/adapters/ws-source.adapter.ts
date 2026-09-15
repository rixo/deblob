/**
 * Live delivery over the browser `WebSocket`, speaking the protocol of
 * `snapshot.model.ts`. The socket opens on the first subscriber and closes
 * after the last (`readable`'s start/stop); a new subscription reconnects from
 * scratch. A socket lost while subscribed — the server restarted, or gone —
 * puts the source back in the loading arm, the last snapshot kept, and reopens
 * after `retryMs`, again and again until it opens or the last subscriber
 * leaves. After a reopen the server sends `projects` and its first snapshot as
 * on any connect; a project selected meanwhile is asked for again right after
 * the open.
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

export const createWsSource = (
  url: string,
  { retryMs = 1000 }: { retryMs?: number } = {},
): SnapshotSource => {
  // the connection, while subscribed — selecting without one is a caller bug
  let send = (message: ClientMessage): void => {
    throw new Error(`ws source: select before subscribe: ${message.project}`)
  }
  const { subscribe } = readable<SourceState>(CONNECTING, (_set, update) => {
    let stopped = false
    let retry: ReturnType<typeof setTimeout> | null = null
    // the project asked for on this connection, re-asked after a reopen
    let selected: string | null = null
    const open = (): WebSocket => {
      const ws = new WebSocket(url)
      ws.addEventListener("open", () => {
        if (selected !== null) {
          ws.send(JSON.stringify({ type: "select", project: selected }))
        }
      })
      ws.addEventListener("message", (event: MessageEvent<string>) => {
        const message = JSON.parse(event.data) as ServerMessage
        update((state) => receive(state, message))
      })
      ws.addEventListener("close", () => {
        if (stopped) return
        update(loadingFrom)
        retry = setTimeout(() => {
          retry = null
          socket = open()
        }, retryMs)
      })
      return ws
    }
    let socket = open()
    send = (message) => {
      selected = message.project
      update(loadingFrom)
      // not open — lost, or reopening: the open handler asks for it
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message))
      }
    }
    return () => {
      stopped = true
      if (retry !== null) clearTimeout(retry)
      socket.close()
    }
  })
  return {
    subscribe,
    select: (project) => send({ type: "select", project }),
  }
}
