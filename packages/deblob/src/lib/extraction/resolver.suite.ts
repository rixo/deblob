/**
 * The resolver port's own suite: what every adapter of `Resolver` promises,
 * stated once, knowing no adapter. An adapter's spec materializes
 * `RESOLVER_TREE` where its adapter reads (strings in memory, files in a temp
 * dir) and calls `describeResolver` with a function that makes the adapter: the
 * sentences register under the adapter's name. A suite: a file of the test kind
 * the runner does not collect.
 */

import { join } from "node:path"

import { describe, expect, it } from "vitest"

import type { Resolver } from "./ports/resolver.port.ts"

/** Root-relative path → content: the tree every sentence below resolves in. */
export const RESOLVER_TREE: Readonly<Record<string, string>> = {
  "src/a.ts": "",
  "src/b.model.ts": "",
  "src/dir/index.ts": "",
  "src/data.json": "{}",
  "node_modules/made-up-pkg/package.json": JSON.stringify({
    name: "made-up-pkg",
    main: "./lib/entry.js",
  }),
  "node_modules/made-up-pkg/lib/entry.js": "",
  "node_modules/made-up-pkg/sub.js": "",
  "node_modules/mainless-pkg/package.json": JSON.stringify({
    name: "mainless-pkg",
  }),
  "node_modules/mainless-pkg/index.js": "",
  "node_modules/manifestless-pkg/index.js": "",
}

export const describeResolver = (
  /** The unit under test — the adapter's factory name. */
  name: string,
  /** The adapter over `RESOLVER_TREE` materialized under `root`. */
  make: () => Promise<{ resolver: Resolver; root: string }>,
): void => {
  describe(name, () => {
    const at = async () => {
      const { resolver, root } = await make()
      return {
        resolve: resolver.resolve,
        from: (path: string) => join(root, path),
        file: (path: string) => ({ kind: "file", path: join(root, path) }),
      }
    }
    const unresolved = { kind: "unresolved" } as const

    it("lands a relative specifier written with its extension", async () => {
      const { resolve, from, file } = await at()
      expect(await resolve(from("src/a.ts"), "./b.model.ts")).toEqual(
        file("src/b.model.ts"),
      )
    })

    it("lands a relative specifier written without its extension", async () => {
      const { resolve, from, file } = await at()
      expect(await resolve(from("src/a.ts"), "./b.model")).toEqual(
        file("src/b.model.ts"),
      )
    })

    it("lands a .js specifier on the .ts source next to it", async () => {
      const { resolve, from, file } = await at()
      expect(await resolve(from("src/a.ts"), "./b.model.js")).toEqual(
        file("src/b.model.ts"),
      )
    })

    it("lands a directory on its index", async () => {
      const { resolve, from, file } = await at()
      expect(await resolve(from("src/a.ts"), "./dir")).toEqual(
        file("src/dir/index.ts"),
      )
    })

    it("lands a json file", async () => {
      const { resolve, from, file } = await at()
      expect(await resolve(from("src/a.ts"), "../src/data.json")).toEqual(
        file("src/data.json"),
      )
    })

    it("lands a builtin under its node: name, whether written with the prefix or without", async () => {
      const { resolve, from } = await at()
      const builtin = { kind: "builtin", specifier: "node:path" }
      expect(await resolve(from("src/a.ts"), "node:path")).toEqual(builtin)
      expect(await resolve(from("src/a.ts"), "path")).toEqual(builtin)
    })

    it("lands a bare specifier on its package's main in the nearest node_modules", async () => {
      const { resolve, from, file } = await at()
      expect(await resolve(from("src/dir/index.ts"), "made-up-pkg")).toEqual(
        file("node_modules/made-up-pkg/lib/entry.js"),
      )
    })

    it("lands a bare specifier on index when its package declares no main", async () => {
      const { resolve, from, file } = await at()
      expect(await resolve(from("src/dir/index.ts"), "mainless-pkg")).toEqual(
        file("node_modules/mainless-pkg/index.js"),
      )
    })

    it("lands a bare specifier on index when its package has no manifest at all", async () => {
      const { resolve, from, file } = await at()
      expect(
        await resolve(from("src/dir/index.ts"), "manifestless-pkg"),
      ).toEqual(file("node_modules/manifestless-pkg/index.js"))
    })

    it("lands a package subpath as a path under the package", async () => {
      const { resolve, from, file } = await at()
      expect(
        await resolve(from("src/dir/index.ts"), "made-up-pkg/sub"),
      ).toEqual(file("node_modules/made-up-pkg/sub.js"))
    })

    it("leaves a relative specifier naming no file unresolved, with a reason", async () => {
      const { resolve, from } = await at()
      expect(
        await resolve(from("src/a.ts"), "./SOME_MISSING.ts"),
      ).toMatchObject(unresolved)
    })

    it("leaves a package absent from the tree unresolved, with a reason", async () => {
      const { resolve, from } = await at()
      expect(await resolve(from("src/a.ts"), "made-up-ghost")).toMatchObject(
        unresolved,
      )
      expect(await resolve(from("src/a.ts"), "@scope-only")).toMatchObject(
        unresolved,
      )
    })

    it("leaves a subpath its package does not have unresolved, with a reason", async () => {
      const { resolve, from } = await at()
      expect(
        await resolve(from("src/a.ts"), "made-up-pkg/SOME_MISSING"),
      ).toMatchObject(unresolved)
    })
  })
}
