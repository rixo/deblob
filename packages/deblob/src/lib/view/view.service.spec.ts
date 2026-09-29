import { expect, test } from "vitest"

import { createMemoryBundle } from "./adapters/memory-bundle.adapter.ts"
import type { ViewRequest } from "./view.service.ts"
import { createViewService } from "./view.service.ts"

const FAKE_CHANNEL_PATH = "/FAKE_CHANNEL/ws"
const FAKE_INDEX = "<!doctype html>FAKE INDEX"
const FAKE_SCRIPT = "export const FAKE_VALUE = 1"

const textOf = (body: Uint8Array): string => new TextDecoder().decode(body)

const serviceOver = (
  contents: Readonly<Record<string, string>> = {
    "index.html": FAKE_INDEX,
    "assets/app-FAKEHASH.js": FAKE_SCRIPT,
  },
) => {
  const bundle = createMemoryBundle(contents)
  const { respondTo } = createViewService({
    files: bundle.files,
    reserved: [FAKE_CHANNEL_PATH],
  })
  return { respondTo, reads: () => bundle.reads }
}

const get = (path: string): ViewRequest => ({ method: "GET", path })

test("the root answers the index", async () => {
  const { respondTo } = serviceOver()
  const response = await respondTo(get("/"))
  expect(response?.status).toBe(200)
  expect(response?.contentType).toBe("text/html; charset=utf-8")
  expect(textOf(response?.body as Uint8Array)).toBe(FAKE_INDEX)
})

test("a path only the page knows answers the index too", async () => {
  const { respondTo } = serviceOver()
  const response = await respondTo(get("/services/FAKE_SERVICE"))
  expect(textOf(response?.body as Uint8Array)).toBe(FAKE_INDEX)
})

test("an asset answers its own bytes and type", async () => {
  const { respondTo } = serviceOver()
  const response = await respondTo(get("/assets/app-FAKEHASH.js?v=FAKE"))
  expect(response?.status).toBe(200)
  expect(response?.contentType).toBe("text/javascript; charset=utf-8")
  expect(textOf(response?.body as Uint8Array)).toBe(FAKE_SCRIPT)
})

test("an asset the bundle does not hold is a 404", async () => {
  const { respondTo } = serviceOver()
  const response = await respondTo(get("/assets/gone-FAKEHASH.js"))
  expect(response?.status).toBe(404)
  expect(response?.contentType).toBe("text/plain; charset=utf-8")
})

test("a refused target is a 404 the bundle never hears about", async () => {
  const { respondTo, reads } = serviceOver()
  const response = await respondTo(get("/../package.json"))
  expect(response?.status).toBe(404)
  expect(reads()).toEqual([])
})

test("the channel's path is not the view's to answer", async () => {
  const { respondTo, reads } = serviceOver()
  expect(await respondTo(get(FAKE_CHANNEL_PATH))).toBeNull()
  expect(reads()).toEqual([])
})

test("anything but a GET is not the view's to answer", async () => {
  const { respondTo, reads } = serviceOver()
  expect(await respondTo({ method: "POST", path: "/" })).toBeNull()
  expect(reads()).toEqual([])
})

test("a bundle without an index still answers, with a 404", async () => {
  const { respondTo } = serviceOver({})
  expect((await respondTo(get("/")))?.status).toBe(404)
})
