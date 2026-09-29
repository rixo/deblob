import { expect, test } from "vitest"

import { createMemoryBundle } from "./memory-bundle.adapter.ts"

const FAKE_CONTENT = "FAKE BUNDLE CONTENT"

test("a file the bundle holds reads back as its bytes", async () => {
  const { files } = createMemoryBundle({ "index.html": FAKE_CONTENT })
  const body = await files.read("index.html")
  expect(new TextDecoder().decode(body as Uint8Array)).toBe(FAKE_CONTENT)
})

test("a file the bundle does not hold is null, not a failure", async () => {
  const { files } = createMemoryBundle({})
  await expect(files.read("assets/FAKE.js")).resolves.toBeNull()
})

test("every read is logged, in order", async () => {
  const { files, reads } = createMemoryBundle({ "index.html": FAKE_CONTENT })
  await files.read("assets/FAKE.js")
  await files.read("index.html")
  expect(reads).toEqual(["assets/FAKE.js", "index.html"])
})
