import { flushSync, mount, unmount } from "svelte"
import { writable } from "svelte/store"
import { expect, test } from "vitest"

import App from "./App.svelte"
import type { ModuleRef, Snapshot } from "./lib/snapshot/snapshot.model.ts"
import type { SourceState } from "./lib/snapshot/snapshot-source.port.ts"

const FAKE_MODULES: ModuleRef[] = [
  {
    path: "src/FAKE_TOP.ts",
    layer: "blob",
    serviceRoot: null,
    isPrivate: false,
    parsed: true,
  },
  {
    path: "src/lib/fake/FAKE.model.ts",
    layer: "model",
    serviceRoot: "src/lib/fake",
    isPrivate: false,
    parsed: true,
  },
  {
    path: "src/lib/fake/FAKE.service.ts",
    layer: "service",
    serviceRoot: "src/lib/fake",
    isPrivate: false,
    parsed: true,
  },
]

const snapshotAt = (
  generatedAt: string,
  name: string | null = null,
): Snapshot => ({
  generatedAt,
  project: { root: "/FAKE_ROOT", name, provenance: "FAKE_PROV" },
  stats: { files: 3, bytes: 42, blobPercent: 33, services: 1 },
  modules: FAKE_MODULES,
  edges: [],
  unresolved: [],
  map: {
    modules: [],
    edges: [],
    sequence: null,
    sequenceMissing: "FAKE_NO_TRACE",
    readmes: {},
  },
})

const loaded = (snapshot: Snapshot): SourceState => ({
  projects: [snapshot.project],
  loading: false,
  error: null,
  snapshot,
})

// a writable source: the test owns the push, and sees the selects
const sourceOf = (first: SourceState) => {
  const store = writable(first)
  const selected: string[] = []
  return {
    subscribe: store.subscribe,
    select: (project: string) => selected.push(project),
    push: store.set,
    selected,
  }
}

const timeOf = (target: Element) =>
  target.querySelector("time")?.textContent?.trim()

const textsOf = (target: Element, selector: string) =>
  [...target.querySelectorAll(selector)].map((el) => el.textContent?.trim())

test("renders the current snapshot and follows the next one", () => {
  const source = sourceOf(loaded(snapshotAt("2000-01-01T00:00:00.000Z")))
  const target = document.createElement("div")
  const app = mount(App, { target, props: { source } })

  expect(timeOf(target)).toBe("2000-01-01T00:00:00.000Z")
  expect(target.textContent).not.toContain("loading")

  source.push(loaded(snapshotAt("2000-01-02T00:00:00.000Z")))
  flushSync()

  expect(timeOf(target)).toBe("2000-01-02T00:00:00.000Z")

  unmount(app)
})

test("the snapshot's project, provenance, counts, and the services with their files by layer", () => {
  const source = sourceOf(
    loaded(snapshotAt("2000-01-01T00:00:00.000Z", "FAKE_PKG")),
  )
  const target = document.createElement("div")
  const app = mount(App, { target, props: { source } })

  expect(
    target.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim(),
  ).toBe("FAKE_PKG /FAKE_ROOT")
  expect(target.textContent).toContain("FAKE_PROV")
  expect(textsOf(target, "dd")).toEqual(["3", "42", "33", "1"])
  expect(textsOf(target, "h2")).toEqual(["src/lib/fake", "top level"])
  expect(textsOf(target, "h3")).toEqual(["model", "service", "blob"])
  expect(textsOf(target, "li")).toEqual([
    "src/lib/fake/FAKE.model.ts",
    "src/lib/fake/FAKE.service.ts",
    "src/FAKE_TOP.ts",
  ])

  unmount(app)
})

test("a project without a manifest name shows its root alone", () => {
  const source = sourceOf(loaded(snapshotAt("2000-01-01T00:00:00.000Z")))
  const target = document.createElement("div")
  const app = mount(App, { target, props: { source } })
  expect(target.querySelector("h1 strong")).toBeNull()
  expect(target.querySelector("h1 code")?.textContent).toBe("/FAKE_ROOT")
  unmount(app)
})

test("says it is loading while no snapshot has arrived; no switch without projects", () => {
  const target = document.createElement("div")
  const source = sourceOf({
    projects: [],
    loading: true,
    error: null,
    snapshot: null,
  })
  const app = mount(App, { target, props: { source } })
  expect(target.textContent).toContain("loading")
  expect(target.querySelector("time")).toBeNull()
  expect(target.querySelector("nav")).toBeNull()
  unmount(app)
})

test("the project switch lists the projects and selects by root", () => {
  const target = document.createElement("div")
  const source = sourceOf({
    projects: [
      { root: "/FAKE_ROOT", name: "FAKE_PKG" },
      { root: "/FAKE_OTHER", name: null },
    ],
    loading: true,
    error: null,
    snapshot: null,
  })
  const app = mount(App, { target, props: { source } })

  const buttons = [...target.querySelectorAll("nav button")]
  expect(
    buttons.map((b) => b.textContent?.replace(/\s+/g, " ").trim()),
  ).toEqual(["FAKE_PKG /FAKE_ROOT", "/FAKE_OTHER"])
  expect(buttons[0]?.querySelector("strong")?.textContent).toBe("FAKE_PKG")
  expect(buttons[1]?.querySelector("strong")).toBeNull()

  ;(buttons[1] as HTMLButtonElement).click()
  expect(source.selected).toEqual(["/FAKE_OTHER"])

  unmount(app)
})

test("keeps the previous snapshot up while the next loads, and under an error", () => {
  const snapshot = snapshotAt("2000-01-01T00:00:00.000Z")
  const source = sourceOf(loaded(snapshot))
  const target = document.createElement("div")
  const app = mount(App, { target, props: { source } })

  source.push({ projects: [], loading: true, error: null, snapshot })
  flushSync()
  expect(target.textContent).toContain("loading")
  expect(timeOf(target)).toBe("2000-01-01T00:00:00.000Z")

  source.push({
    projects: [],
    loading: false,
    error: { project: "/FAKE_OTHER", message: "FAKE_FAILURE" },
    snapshot,
  })
  flushSync()
  expect(target.textContent).not.toContain("loading")
  expect(target.querySelector("p > code")?.textContent).toBe("/FAKE_OTHER")
  expect(target.textContent).toContain("FAKE_FAILURE")
  expect(timeOf(target)).toBe("2000-01-01T00:00:00.000Z")

  unmount(app)
})
