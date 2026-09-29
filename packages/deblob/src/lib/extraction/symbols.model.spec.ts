import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { createNodeFs } from "../fs/adapters/node-fs.adapter.ts"
import { createOxcEngine } from "./adapters/oxc-extraction.adapter.ts"
import type { FileExtraction } from "./ports/extraction.port.ts"
import { symbolLevelOf } from "./symbols.model.ts"

/** A fixture file through the real engine: its tree, text and comments. */
const levelOf = async (name: string) => {
  const path = fileURLToPath(
    new URL(`./__fixtures__/symbols/${name}`, import.meta.url),
  )
  const extracted = (await createOxcEngine({ fs: createNodeFs() }).extract(
    path,
  )) as FileExtraction
  return symbolLevelOf(extracted)
}

const bySymbol = async (name: string) =>
  new Map((await levelOf(name)).symbols.map((symbol) => [symbol.name, symbol]))

describe("symbolLevelOf", () => {
  it("lists every exported name once, in the order the module exports them", async () => {
    const { symbols } = await levelOf("exports.ts")
    expect(symbols.map((symbol) => symbol.name)).toEqual([
      "Shape",
      "Literal",
      "Alias",
      "declared",
      "arrow",
      "plainValue",
      "counter",
      "first",
      "renamed",
      "head",
      "rest",
      "Thing",
      "Mode",
      "Space",
      "ambient",
      "afterGap",
      "clauseConst",
      "renamedExport",
      "default",
    ])
  })

  it("names each declaration's form, and marks the erased ones type-only", async () => {
    const symbols = await bySymbol("exports.ts")
    const formOf = (name: string) => {
      const symbol = symbols.get(name)
      return [symbol?.form, symbol?.typeOnly]
    }
    expect(
      Object.fromEntries(
        [
          "Shape",
          "Literal",
          "Alias",
          "declared",
          "arrow",
          "plainValue",
          "counter",
          "first",
          "Thing",
          "Mode",
          "Space",
          "ambient",
        ].map((name) => [name, formOf(name)]),
      ),
    ).toEqual({
      Shape: ["interface", true],
      Literal: ["type", true],
      Alias: ["type", true],
      declared: ["function", false],
      // a variable bound to a function expression is a function
      arrow: ["function", false],
      plainValue: ["const", false],
      counter: ["let", false],
      first: ["const", false],
      Thing: ["class", false],
      Mode: ["enum", false],
      Space: ["namespace", false],
      ambient: ["function", false],
    })
  })

  it("lists the members of interfaces, object types, classes and enums, a callable one with ()", async () => {
    const symbols = await bySymbol("exports.ts")
    expect(symbols.get("Shape")?.members).toEqual([
      "plain",
      "method()",
      "callback()",
      "[index]",
      "()",
      "new()",
      "quoted-key",
    ])
    expect(symbols.get("Literal")?.members).toEqual(["one", "two()"])
    // a computed key has no name to show: left out
    expect(symbols.get("Thing")?.members).toEqual([
      "field",
      "#hidden",
      "action()",
      "handler()",
      "make()",
      "constructor()",
    ])
    expect(symbols.get("Mode")?.members).toEqual(["On", "Off-ish"])
    expect(symbols.get("Alias")?.members).toBeNull()
    expect(symbols.get("declared")?.members).toBeNull()
  })

  it("takes the first sentence of the JSDoc block right above, on one line", async () => {
    const symbols = await bySymbol("exports.ts")
    const docOf = (name: string) => symbols.get(name)?.doc
    expect(docOf("Shape")).toBe("A shape with every member kind.")
    // no sentence end: the whole block, flattened
    expect(docOf("arrow")).toBe("Spread over lines, one sentence all the same")
    // blank lines between the block and the declaration keep it
    expect(docOf("afterGap")).toBe("A doc that stops here.")
    // a line comment is not a doc; neither is nothing
    expect(docOf("declared")).toBeNull()
    expect(docOf("plainValue")).toBeNull()
    // a declaration statement's doc is every name's it binds
    expect(docOf("first")).toBe("Destructured: one symbol per name.")
    expect(docOf("renamed")).toBe("Destructured: one symbol per name.")
  })

  it("resolves a name exported by a clause or as the default to its declaration, and leaves an imported one to the edges", async () => {
    const symbols = await bySymbol("exports.ts")
    expect(symbols.get("renamedExport")).toEqual({
      name: "renamedExport",
      form: "function",
      typeOnly: false,
      members: null,
      doc: "Exported by a clause, under another name.",
    })
    expect(symbols.get("default")).toEqual({
      name: "default",
      form: "function",
      typeOnly: false,
      members: null,
      doc: "Exported as the default, by name.",
    })
    expect(symbols.has("made")).toBe(false)
  })

  it("names a default declared in place by its form, a default expression by `default`", async () => {
    expect((await levelOf("default-declared.ts")).symbols).toEqual([
      {
        name: "default",
        form: "class",
        typeOnly: false,
        members: ["run()"],
        doc: "The default, declared in place.",
      },
    ])
    expect((await levelOf("default-expression.ts")).symbols).toEqual([
      {
        name: "default",
        form: "default",
        typeOnly: false,
        members: null,
        doc: null,
      },
    ])
  })

  it("leaves computed keys out, and reads index signatures, accessors, abstract members and literal keys", async () => {
    const symbols = await bySymbol("shapes.ts")
    expect(symbols.get("Keys")?.members).toEqual(["1"])
    expect(symbols.get("Holder")?.members).toEqual([
      "[index]",
      "size",
      "weight",
      "run()",
      "field",
      "2",
    ])
  })

  it("binds every name a destructuring binds, a default or a rest included, a hole skipped", async () => {
    const symbols = await bySymbol("shapes.ts")
    expect(
      ["withDefault", "others", "second"].map(
        (name) => symbols.get(name)?.form,
      ),
    ).toEqual(["const", "const", "const"])
  })

  it("names a dotted namespace by its path, an import alias and a string export name as written, an anonymous default by its form", async () => {
    const symbols = await bySymbol("shapes.ts")
    expect(symbols.get("Outer.Inner")?.form).toBe("namespace")
    expect(symbols.get("Alias")?.form).toBe("import")
    expect(symbols.get("quoted name")?.form).toBe("const")
    expect(symbols.get("default")).toEqual({
      name: "default",
      form: "function",
      typeOnly: false,
      members: null,
      doc: null,
    })
  })

  it("takes no doc from a plain block comment, nor from an empty JSDoc", async () => {
    const symbols = await bySymbol("shapes.ts")
    expect(symbols.get("notDocumented")?.doc).toBeNull()
    expect(symbols.get("emptyDoc")?.doc).toBeNull()
  })

  it("counts the top-level declarations the module does not export", async () => {
    // InternalClass, InternalInterface, InternalType, InternalEnum; the ones
    // exported by a clause or as the default are not internal
    expect((await levelOf("exports.ts")).internalDeclarations).toBe(4)
    expect((await levelOf("default-expression.ts")).internalDeclarations).toBe(
      0,
    )
    // an ambient module and a global augmentation are declarations too
    expect((await levelOf("shapes.ts")).internalDeclarations).toBe(2)
  })
})
