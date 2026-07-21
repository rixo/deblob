import { readFileSync } from "node:fs"
import { dirname } from "node:path"

import { parseSync } from "oxc-parser"
import { ResolverFactory } from "oxc-resolver"

import type { RuntimeEntry } from "../graph.model.ts"
import type {
  ExtractionEngine,
  FileExtraction,
  ImportRecord,
  Resolution,
} from "../ports/extraction.port.ts"

const PARSEABLE = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/

/**
 * Cheap gate before the AST walk — full-AST traversal on every file costs 3–20×
 * the parse; only files that can contain `require(` pay it.
 */
const REQUIRE_HINT = /\brequire\s*\(/

const STRING_LITERAL = /^(['"`])(.*)\1$/s

/**
 * Walk the AST for `require(...)` calls — CJS is absent from oxc's ESM-only
 * module record, forever. A non-literal argument is collected as its raw
 * expression text, marked non-literal; argument-less `require()` is not an
 * import at all and is skipped.
 */
const collectRequires = (
  node: unknown,
  source: string,
  out: { specifier: string; literal: boolean }[],
): void => {
  if (Array.isArray(node)) {
    for (const item of node) collectRequires(item, source, out)
    return
  }
  if (typeof node !== "object" || node === null) return
  const record = node as Record<string, unknown>
  if (
    record["type"] === "CallExpression" &&
    typeof record["callee"] === "object" &&
    record["callee"] !== null &&
    (record["callee"] as Record<string, unknown>)["name"] === "require"
  ) {
    const [arg] = record["arguments"] as Record<string, unknown>[]
    if (arg) {
      if (typeof arg["value"] === "string") {
        out.push({ specifier: arg["value"], literal: true })
      } else {
        out.push({
          specifier: source.slice(arg["start"] as number, arg["end"] as number),
          literal: false,
        })
      }
    }
  }
  for (const value of Object.values(record)) collectRequires(value, source, out)
}

type AstNode = Record<string, unknown>

const ERASABLE_DECLARATIONS = new Set([
  "TSInterfaceDeclaration",
  "TSTypeAliasDeclaration",
])

/** `name` of an Identifier id; `null` for patterns and absent ids. */
const nameOf = (id: unknown): string | null => {
  if (typeof id !== "object" || id === null) return null
  const name = (id as AstNode)["name"]
  return typeof name === "string" ? name : null
}

/**
 * Entries for one declaration or plain statement. Erasable forms yield none —
 * the erasable side is the listed one (interfaces, type aliases, ambient
 * `declare`); everything else is runtime content, unknown syntax included.
 */
const declarationEntries = (
  node: AstNode,
  exported: boolean,
): RuntimeEntry[] => {
  const type = node["type"]
  if (typeof type === "string" && ERASABLE_DECLARATIONS.has(type)) return []
  if (node["declare"] === true) return []
  switch (type) {
    case "VariableDeclaration":
      return (node["declarations"] as AstNode[]).map((declarator) => ({
        form: node["kind"] as string,
        name: nameOf(declarator["id"]),
        exported,
      }))
    case "FunctionDeclaration":
      return [{ form: "function", name: nameOf(node["id"]), exported }]
    case "ClassDeclaration":
      return [{ form: "class", name: nameOf(node["id"]), exported }]
    case "TSEnumDeclaration":
      // const enum included — still a value binding
      return [{ form: "enum", name: nameOf(node["id"]), exported }]
    case "TSModuleDeclaration":
      return [{ form: "namespace", name: nameOf(node["id"]), exported }]
    default:
      return [{ form: "statement", name: null, exported }]
  }
}

/**
 * Non-erasable top-level entries, statement order. Import and re-export
 * statements are edge facts — never listed here.
 */
const collectRuntimeContent = (program: AstNode): RuntimeEntry[] => {
  const entries: RuntimeEntry[] = []
  for (const statement of program["body"] as AstNode[]) {
    switch (statement["type"]) {
      case "ImportDeclaration":
      case "ExportAllDeclaration":
        continue
      case "ExportNamedDeclaration": {
        const declaration = statement["declaration"]
        // sourced = re-export (edge fact); a bare clause re-exports or marks
        // declarations already counted where they stand
        if (statement["source"] != null || declaration == null) continue
        entries.push(...declarationEntries(declaration as AstNode, true))
        continue
      }
      case "ExportDefaultDeclaration": {
        const declaration = statement["declaration"] as AstNode
        switch (declaration["type"]) {
          case "TSInterfaceDeclaration":
            continue
          case "FunctionDeclaration":
          case "ClassDeclaration":
            entries.push(...declarationEntries(declaration, true))
            continue
          default:
            entries.push({ form: "default", name: null, exported: true })
            continue
        }
      }
      default:
        entries.push(...declarationEntries(statement, false))
    }
  }
  return entries
}

export const createOxcEngine = ({
  tsconfigPath,
}: { tsconfigPath?: string } = {}): ExtractionEngine => {
  // JS-oriented defaults silently misresolve TS — conditionNames and
  // extensionAlias are always set, never left to the resolver's defaults.
  const resolver = new ResolverFactory({
    conditionNames: ["import", "require", "node", "default"],
    extensions: [
      ".ts",
      ".tsx",
      ".mts",
      ".cts",
      ".js",
      ".jsx",
      ".mjs",
      ".cjs",
      ".json",
    ],
    extensionAlias: {
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    },
    builtinModules: true,
    tsconfig: tsconfigPath
      ? { configFile: tsconfigPath, references: "auto" }
      : "auto",
  })

  const extract = (absolutePath: string): FileExtraction | null => {
    if (!PARSEABLE.test(absolutePath)) return null

    const source = readFileSync(absolutePath, "utf8")
    const result = parseSync(absolutePath, source)

    if (result.errors.length > 0) {
      throw new Error(
        `parse failed: ${absolutePath}: ${result.errors.map((error) => error.message).join("; ")}`,
      )
    }

    const imports: ImportRecord[] = []

    for (const staticImport of result.module.staticImports) {
      const specifier = staticImport.moduleRequest.value
      if (staticImport.entries.length === 0) {
        // side-effect `import "mod"` — runtime by definition
        imports.push({
          specifier,
          typeOnly: false,
          form: "static",
          reExport: false,
          literal: true,
        })
        continue
      }
      for (const entry of staticImport.entries) {
        imports.push({
          specifier,
          typeOnly: entry.isType,
          form: "static",
          reExport: false,
          literal: true,
        })
      }
    }

    for (const staticExport of result.module.staticExports) {
      for (const entry of staticExport.entries) {
        if (entry.moduleRequest === null) continue
        imports.push({
          specifier: entry.moduleRequest.value,
          typeOnly: entry.isType,
          form: "static",
          reExport: true,
          literal: true,
        })
      }
    }

    for (const dynamicImport of result.module.dynamicImports) {
      // moduleRequest is a span, not a string — slice the source. A
      // non-literal request stays as its raw expression and surfaces
      // downstream as an unresolved diagnostic.
      const raw = source.slice(
        dynamicImport.moduleRequest.start,
        dynamicImport.moduleRequest.end,
      )
      const literal = STRING_LITERAL.exec(raw)
      imports.push(
        literal
          ? {
              specifier: literal[2] as string,
              typeOnly: false,
              form: "dynamic",
              reExport: false,
              literal: true,
            }
          : {
              specifier: raw,
              typeOnly: false,
              form: "dynamic",
              reExport: false,
              literal: false,
            },
      )
    }

    if (REQUIRE_HINT.test(source)) {
      const requires: { specifier: string; literal: boolean }[] = []
      collectRequires(result.program, source, requires)
      for (const { specifier, literal } of requires) {
        imports.push({
          specifier,
          typeOnly: false,
          form: "require",
          reExport: false,
          literal,
        })
      }
    }

    return {
      imports,
      runtimeContent: collectRuntimeContent(
        result.program as unknown as AstNode,
      ),
    }
  }

  const resolve = (fromAbsolutePath: string, specifier: string): Resolution => {
    const result = resolver.sync(dirname(fromAbsolutePath), specifier)
    if (result.builtin)
      return { kind: "builtin", specifier: result.builtin.resolved }
    if (result.path) return { kind: "file", path: result.path }
    // the resolver always sets `error` when it yields neither path nor
    // builtin — the fallback exists for the optional type only
    /* v8 ignore next */
    return { kind: "unresolved", reason: result.error ?? "unresolved" }
  }

  return { extract, resolve }
}
