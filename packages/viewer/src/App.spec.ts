import { flushSync, mount, unmount } from "svelte"
import { expect, test } from "vitest"

import App from "./App.svelte"
import type { Snapshot } from "./lib/snapshot/snapshot.model.ts"

// a hand-rolled source: the test owns the push
const sourceOf = (first: Snapshot) => {
  let current = first
  const listeners = new Set<(snapshot: Snapshot) => void>()
  return {
    subscribe: (listener: (snapshot: Snapshot) => void) => {
      listeners.add(listener)
      listener(current)
      return () => listeners.delete(listener)
    },
    push: (next: Snapshot) => {
      current = next
      for (const listener of listeners) listener(current)
    },
  }
}

test("renders the current snapshot and follows the next one", () => {
  const source = sourceOf({ generatedAt: "2000-01-01T00:00:00.000Z" })
  const target = document.createElement("div")
  const app = mount(App, { target, props: { source } })

  expect(target.querySelector("time")?.textContent).toBe(
    "2000-01-01T00:00:00.000Z",
  )

  source.push({ generatedAt: "2000-01-02T00:00:00.000Z" })
  flushSync()

  expect(target.querySelector("time")?.textContent).toBe(
    "2000-01-02T00:00:00.000Z",
  )

  unmount(app)
})
