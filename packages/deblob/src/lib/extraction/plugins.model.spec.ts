import type { Node } from "@oxc-project/types"
import { describe, expect, it, test } from "vitest"

import type { CutContext } from "./cut.model.ts"
import { bindPlugins } from "./plugins.model.ts"
import type { FlavorResolver } from "./flavor.model.ts"
import type { ReaderGroups } from "./readers.model.ts"

const CLI = "src/cli.driver.ts"
const SPEC = "src/tool.spec.ts"
const SERVICE = "src/tool.service.ts"
const NOTES = "notes.ts"

/** A flavor naming files by their suffix, anything else blob. */
const bySuffix = (): FlavorResolver => ({
  classify: ({ files }) =>
    new Map(
      files.map((file) => [
        file,
        {
          layer: file.endsWith(".driver.ts")
            ? ("driver" as const)
            : file.endsWith(".spec.ts")
              ? ("test" as const)
              : file.endsWith(".service.ts")
                ? ("service" as const)
                : ("blob" as const),
          serviceRoot: file.endsWith(".service.ts") ? "src" : null,
          isPrivate: false,
        },
      ]),
    ),
})

const FILES = [CLI, SPEC, SERVICE, NOTES] as const

const bind = (
  readers: Partial<ReaderGroups> = {},
  flavor: FlavorResolver = bySuffix(),
) =>
  bindPlugins(
    {
      flavor,
      readers: { language: [], host: [], test: [], driver: [], ...readers },
    },
    FILES,
  )

/** A context saying of any call: its callee is the tech's. */
const aboutTech = (): CutContext => ({
  calleeOf: () => ({ kind: "tech", package: "made-up-tech" }),
})

describe("bindPlugins", () => {
  describe("the flavor's word", () => {
    it("gives a file's kind, and what the flavor said of its service", () => {
      const plugins = bind()
      expect(plugins.kindOf(SERVICE)).toBe("service")
      expect(plugins.kindOf(NOTES)).toBe("blob")
      expect(plugins.classificationOf(SERVICE).serviceRoot).toBe("src")
    })

    it("gives a blob file the kind a reader's written binding claims", () => {
      const plugins = bind({
        driver: [{ name: "made-up", tech: [], include: [NOTES] }],
      })
      expect(plugins.kindOf(NOTES)).toBe("driver")
    })

    it("is loud on a flavor that names no kind for a covered file", () => {
      const plugins = bind({}, { classify: () => new Map() })
      expect(() => plugins.kindOf(SERVICE)).toThrow(
        `flavor broke its contract: no classification for ${SERVICE} (classify must be total)`,
      )
    })

    it("asks the flavor what a factory is, and takes none for a flavor that does not say", () => {
      expect(bind().isFactory("createTool")).toBe(false)
      const naming = bind(
        {},
        { ...bySuffix(), isFactory: ({ name }) => name.startsWith("create") },
      )
      expect(naming.isFactory("createTool")).toBe(true)
      expect(naming.isFactory("makeTool")).toBe(false)
    })
  })

  describe("the readers bound to a file", () => {
    it("says a driver no reader reads is unread, and one a reader counts as blob is blob", () => {
      expect(bind().of(CLI).unread).toBe(true)
      const blob = bind({ driver: [{ name: "blob", tech: [], blob: true }] })
      expect(blob.of(CLI)).toMatchObject({ unread: false, asBlob: true })
      const read = bind({ driver: [{ name: "made-up", tech: [] }] })
      expect(read.of(CLI)).toMatchObject({ unread: false, asBlob: false })
    })

    it("stacks the readers of a file, names joined", () => {
      const plugins = bind({
        driver: [
          { name: "one", tech: [] },
          { name: "two", tech: [] },
        ],
      })
      expect(plugins.of(CLI).tech.name).toBe("one+two")
    })

    it("relaxes the four driver rules a test file does not take for a test file, none for a driver, whatever a reader writes", () => {
      const plugins = bind({
        driver: [
          { name: "made-up", tech: [], exempts: ["call-count"] } as never,
        ],
        test: [{ name: "made-up-runner", tech: [], roleOf: () => null }],
      })
      expect(plugins.of(CLI).tech.exempts).toEqual([])
      expect(plugins.of(SPEC).tech.exempts).toEqual([
        "registration",
        "call-count",
        "services-only",
        "definitions",
      ])
    })

    it("takes the first role a test reader gives", () => {
      const plugins = bind({
        test: [
          { name: "silent", tech: [], roleOf: () => null },
          { name: "first", tech: [], roleOf: () => ({ kind: "group" }) },
          { name: "second", tech: [], roleOf: () => ({ kind: "mock" }) },
        ],
      })
      expect(plugins.of(SPEC).tech.roleOf(["describe"])).toEqual({
        kind: "group",
      })
    })

    it("hears every reader's cut that answers, each with what its reader claims, the default cut last", () => {
      const fn = { type: "ArrowFunctionExpression" } as unknown as Node
      const handed = {
        type: "CallExpression",
        arguments: [fn],
      } as unknown as Node
      const plugins = bind({
        driver: [
          { name: "silent", tech: ["other"], cut: () => null },
          {
            name: "pointing",
            tech: ["made-up-tech", "./src/tool.service.ts"],
            cut: ({ node, context }) =>
              context.calleeOf(node).kind === "tech" ? [{ fn }] : null,
          },
        ],
      })
      const answers = plugins.of(CLI).tech.cut(handed, aboutTech())
      expect(answers.map(({ cut }) => cut)).toEqual([[{ fn }], [{ fn }]])
      const [own, fallback] = answers
      expect(own?.claims("made-up-tech")).toBe(true)
      expect(own?.claims(SERVICE)).toBe(true)
      expect(own?.claims("other")).toBe(false)
      expect(fallback?.claims("made-up-tech")).toBe(false)
    })

    it("answers nothing on a node no cut points at", () => {
      const plugins = bind({ driver: [{ name: "made-up", tech: [] }] })
      expect(
        plugins
          .of(CLI)
          .tech.cut({ type: "EmptyStatement" } as unknown as Node, aboutTech()),
      ).toEqual([])
      const call = { type: "CallExpression", arguments: [] } as unknown as Node
      expect(plugins.of(CLI).tech.cut(call, aboutTech())).toEqual([])
    })

    test("a package or a project file is the file's own tech when one of its readers lists it", () => {
      const bound = bind({
        driver: [{ name: "made-up", tech: ["cac", "./src/tool.service.ts"] }],
      }).of(CLI)
      expect(bound.claimsPackage("cac")).toBe(true)
      expect(bound.claimsPackage("cac/deep")).toBe(true)
      expect(bound.claimsPackage("other")).toBe(false)
      expect(bound.claimsFile(SERVICE)).toBe(true)
      expect(bound.claimsFile(NOTES)).toBe(false)
      expect(bound.claimsSomeFile).toBe(true)
      expect(
        bind({ driver: [{ name: "made-up", tech: ["cac"] }] }).of(CLI)
          .claimsSomeFile,
      ).toBe(false)
    })

    test("a host reader bound to the file claims the modules it lists as its tech, subpaths included", () => {
      const bound = bind({
        host: [{ name: "made-up-host", tech: ["node:fs", "fs"] }],
      }).of(SERVICE)
      expect(bound.hostClaims("node:fs")).toBe(true)
      expect(bound.hostClaims("node:fs/promises")).toBe(true)
      expect(bound.hostClaims("fs")).toBe(true)
      expect(bound.hostClaims("node:path")).toBe(false)
      expect(bind().of(SERVICE).hostClaims("node:fs")).toBe(false)
    })

    it("reads a file that is no driver and no test with no reader of its own", () => {
      const plugins = bind({ driver: [{ name: "made-up", tech: ["cac"] }] })
      expect(plugins.of(SERVICE).claimsPackage("cac")).toBe(false)
    })
  })
})
