import { expect, test } from "vitest"

import { assetFor, INDEX } from "./bundle.model.ts"

const HTML = "text/html; charset=utf-8"

test("an asset path names its file and its type", () => {
  expect(assetFor("/assets/index-FAKEHASH.js")).toEqual({
    path: "/assets/index-FAKEHASH.js",
    file: "assets/index-FAKEHASH.js",
    contentType: "text/javascript; charset=utf-8",
  })
})

test("the root is the index", () => {
  expect(assetFor("/")).toEqual({ path: "/", file: INDEX, contentType: HTML })
})

test("a path with no extension is the index — the router's, not the server's", () => {
  expect(assetFor("/services/FAKE_SERVICE/use-cases")).toEqual({
    path: "/services/FAKE_SERVICE/use-cases",
    file: INDEX,
    contentType: HTML,
  })
})

test("a trailing slash is a directory, so the index", () => {
  expect(assetFor("/assets/")).toEqual({
    path: "/assets/",
    file: INDEX,
    contentType: HTML,
  })
})

test("a dotfile has no extension either", () => {
  expect(assetFor("/.gitkeep")).toEqual({
    path: "/.gitkeep",
    file: INDEX,
    contentType: HTML,
  })
})

test("the query and the fragment are not part of the name", () => {
  expect(assetFor("/assets/app-FAKEHASH.css?v=1")?.file).toBe(
    "assets/app-FAKEHASH.css",
  )
  expect(assetFor("/assets/app-FAKEHASH.css#top")?.file).toBe(
    "assets/app-FAKEHASH.css",
  )
})

test("an escaped name is decoded, in the path and in the file", () => {
  expect(assetFor("/assets/some%20name.css")).toMatchObject({
    path: "/assets/some name.css",
    file: "assets/some name.css",
  })
})

test("the extension is read case-insensitively", () => {
  expect(assetFor("/FAKE_LOGO.PNG")?.contentType).toBe("image/png")
})

// the tripwire: the table is a census of what builds emit today, the default is
// the rule — a bundle carrying a format nobody listed is still served
test("an extension the table does not know is served, not refused", () => {
  expect(assetFor("/assets/FAKE_ASSET.madeupext")).toEqual({
    path: "/assets/FAKE_ASSET.madeupext",
    file: "assets/FAKE_ASSET.madeupext",
    contentType: "application/octet-stream",
  })
})

test.each([
  ["a walk out of the root", "/../package.json"],
  ["a walk from inside", "/assets/../../package.json"],
  ["an escaped walk", "/%2e%2e%2fpackage.json"],
  ["a current-directory segment", "/./assets/FAKE.js"],
  ["a target that is not rooted", "https://FAKE_HOST/assets/FAKE.js"],
  ["a windows separator", "/assets\\FAKE.js"],
  ["a NUL byte", "/assets/FAKE.js%00.png"],
  ["a malformed escape", "/assets/%zz.js"],
])("%s is answered by nothing", (_case, target) => {
  expect(assetFor(target)).toBeNull()
})
