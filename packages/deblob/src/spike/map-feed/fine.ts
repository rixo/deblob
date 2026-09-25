/**
 * SPIKE (2026-09-25, map feed) — rewritten 100% before anything ships; delete
 * with src/spike. The 2026-09-19 fine probe (tmp/fine-snapshot.probe.ts), moved
 * in near-verbatim: the script body is now `fineSnapshot(root)`.
 *
 * Produces the standard snapshot of a project, then a SECOND pass over the same
 * files that adds the symbol level the viewer contract drops today:
 *
 * - Every module gains `symbols`: its exported declarations, with form,
 *   signature, first doc line, and members for interfaces / type aliases
 * - Every edge gains `symbols`: the binding names actually imported over it
 */

import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import { dirname, relative, resolve as resolvePath } from "node:path"

import { createSnapshotService } from "../../lib/snapshot/snapshot.service.ts"
import { createProjectSource, extractionFor } from "../../drivers/wiring.ts"
import { createNodeFs } from "../../lib/fs/adapters/node-fs.adapter.ts"
import { createConfigLoader } from "../../lib/config/adapters/loader.adapter.ts"

const require_ = createRequire(import.meta.url)
const { parseSync } = require_("oxc-parser")
const { ResolverFactory } = require_("oxc-resolver")

export async function fineSnapshot(root: string): Promise<any> {
  const source = createProjectSource()
  const { snapshotOf } = createSnapshotService({ source, extractionFor })
  const snapshot: any = await snapshotOf(resolvePath(root))

  const config: any = await source.loadConfigAt(resolvePath(root))
  const tsconfigPath = await createConfigLoader({
    fs: createNodeFs(),
  }).tsconfigPathOf(config)
  // the resolver adapter's settings (oxc-resolver.adapter.ts), sync for the probe
  const oxcResolver = new ResolverFactory({
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
    ...(tsconfigPath
      ? { tsconfig: { configFile: tsconfigPath, references: "auto" } }
      : {}),
    ...(config.alias
      ? {
          alias: Object.fromEntries(
            Object.entries(config.alias).map(([k, t]) => [
              k,
              [...(t as string[])],
            ]),
          ),
        }
      : {}),
  })
  const engine = {
    resolve: (fromAbs: string, specifier: string) => {
      const r = oxcResolver.sync(dirname(fromAbs), specifier)
      return r.path ? { kind: "file", path: r.path } : { kind: "unresolved" }
    },
  }

  type Node = Record<string, any>

  const PARSEABLE = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/

  const nameOf = (id: unknown): string | null => {
    if (typeof id !== "object" || id === null) return null
    const name = (id as Node)["name"]
    return typeof name === "string" ? name : null
  }

  const oneLine = (text: string, max = 200): string => {
    const flat = text.replace(/\s+/g, " ").trim()
    return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
  }

  /** The JSDoc block immediately above `start`, first sentence only. */
  const docBefore = (
    comments: Node[],
    source: string,
    start: number,
  ): string | null => {
    let best: Node | null = null
    for (const comment of comments) {
      if (
        comment["end"] <= start &&
        (best === null || comment["end"] > best["end"])
      ) {
        best = comment
      }
    }
    if (best === null) return null
    if (source.slice(best["end"], start).trim() !== "") return null
    const body = String(best["value"])
      .split("\n")
      .map((line) => line.replace(/^\s*\*?\s?/, ""))
      .join("\n")
      .trim()
    if (body === "") return null
    const sentence = /^[\s\S]*?[.!?](?:\s|$)/.exec(body)
    return oneLine(sentence === null ? body : sentence[0])
  }

  const memberNames = (members: unknown): string[] => {
    if (!Array.isArray(members)) return []
    return members
      .map((member: Node) => {
        const key = member["key"]
        const name =
          nameOf(key) ??
          (typeof key === "object" &&
          key !== null &&
          typeof key["value"] === "string"
            ? key["value"]
            : null)
        if (name === null) {
          return member["type"] === "TSIndexSignature"
            ? "[index]"
            : member["type"] === "TSCallSignatureDeclaration"
              ? "()"
              : null
        }
        const callable =
          member["type"] === "TSMethodSignature" ||
          member["type"] === "MethodDefinition" ||
          (typeof member["typeAnnotation"] === "object" &&
            member["typeAnnotation"] !== null &&
            member["typeAnnotation"]["typeAnnotation"]?.["type"] ===
              "TSFunctionType")
        return callable ? `${name}()` : name
      })
      .filter((name): name is string => name !== null)
  }

  type Symbol_ = {
    name: string | null
    form: string
    typeOnly: boolean
    signature: string | null
    doc: string | null
    members: string[] | null
  }

  /** One exported declaration, as a box row would read it. */
  const symbolsOf = (
    declaration: Node,
    text: string,
    comments: Node[],
    stmtStart: number,
  ): Symbol_[] => {
    const doc = docBefore(comments, text, stmtStart)
    const type = declaration["type"]
    switch (type) {
      case "TSInterfaceDeclaration":
        return [
          {
            name: nameOf(declaration["id"]),
            form: "interface",
            typeOnly: true,
            signature: null,
            doc,
            members: memberNames(declaration["body"]?.["body"]),
          },
        ]
      case "TSTypeAliasDeclaration": {
        const annotation = declaration["typeAnnotation"] as Node
        const isLiteral = annotation?.["type"] === "TSTypeLiteral"
        return [
          {
            name: nameOf(declaration["id"]),
            form: "type",
            typeOnly: true,
            signature: isLiteral
              ? null
              : oneLine(
                  text.slice(annotation["start"], annotation["end"]),
                  160,
                ),
            doc,
            members: isLiteral ? memberNames(annotation["members"]) : null,
          },
        ]
      }
      case "FunctionDeclaration":
        return [
          {
            name: nameOf(declaration["id"]),
            form: "function",
            typeOnly: false,
            signature: oneLine(
              text.slice(declaration["start"], declaration["body"]["start"]),
            ),
            doc,
            members: null,
          },
        ]
      case "ClassDeclaration":
        return [
          {
            name: nameOf(declaration["id"]),
            form: "class",
            typeOnly: false,
            signature: null,
            doc,
            members: memberNames(declaration["body"]?.["body"]),
          },
        ]
      case "TSEnumDeclaration":
        return [
          {
            name: nameOf(declaration["id"]),
            form: "enum",
            typeOnly: false,
            signature: null,
            doc,
            members: memberNames(
              declaration["body"]?.["members"] ?? declaration["members"],
            ),
          },
        ]
      case "VariableDeclaration":
        return (declaration["declarations"] as Node[]).map((declarator) => {
          const init = declarator["init"] as Node | null
          const callable =
            init !== null &&
            (init["type"] === "ArrowFunctionExpression" ||
              init["type"] === "FunctionExpression")
          return {
            name: nameOf(declarator["id"]),
            form: callable ? "function" : String(declaration["kind"]),
            typeOnly: false,
            signature: callable
              ? oneLine(text.slice(declarator["start"], init["body"]["start"]))
              : init === null
                ? null
                : oneLine(text.slice(init["start"], init["end"]), 80),
            doc,
            members: null,
          }
        })
      default:
        return [
          {
            name: null,
            form: String(type),
            typeOnly: false,
            signature: null,
            doc,
            members: null,
          },
        ]
    }
  }

  type Imported = { name: string; typeOnly: boolean }

  const importsOf = (program: Node): Map<string, Imported[]> => {
    const bySpecifier = new Map<string, Imported[]>()
    const add = (specifier: string, imported: Imported): void => {
      const list = bySpecifier.get(specifier)
      if (list === undefined) bySpecifier.set(specifier, [imported])
      else list.push(imported)
    }
    for (const statement of program["body"] as Node[]) {
      const source = statement["source"] as Node | undefined
      if (source === undefined || source === null) continue
      const specifier = String(source["value"])
      const statementType = statement["importKind"] ?? statement["exportKind"]
      const typeOnlyStatement = statementType === "type"
      switch (statement["type"]) {
        case "ImportDeclaration": {
          const specifiers = (statement["specifiers"] ?? []) as Node[]
          if (specifiers.length === 0)
            add(specifier, { name: "(side effect)", typeOnly: false })
          for (const entry of specifiers) {
            const typeOnly = typeOnlyStatement || entry["importKind"] === "type"
            switch (entry["type"]) {
              case "ImportDefaultSpecifier":
                add(specifier, { name: "default", typeOnly })
                break
              case "ImportNamespaceSpecifier":
                add(specifier, {
                  name: `* as ${nameOf(entry["local"]) ?? "?"}`,
                  typeOnly,
                })
                break
              default:
                add(specifier, {
                  name:
                    nameOf(entry["imported"]) ?? nameOf(entry["local"]) ?? "?",
                  typeOnly,
                })
            }
          }
          break
        }
        case "ExportNamedDeclaration":
          for (const entry of (statement["specifiers"] ?? []) as Node[]) {
            add(specifier, {
              name: nameOf(entry["local"]) ?? "?",
              typeOnly: typeOnlyStatement || entry["exportKind"] === "type",
            })
          }
          break
        case "ExportAllDeclaration":
          add(specifier, { name: "*", typeOnly: typeOnlyStatement })
          break
        default:
          break
      }
    }
    return bySpecifier
  }

  const edgeKey = (from: string, target: string): string =>
    `${from}\u0000${target}`

  const edgeSymbols = new Map<string, Imported[]>()
  const moduleSymbols = new Map<
    string,
    { symbols: Symbol_[]; internal: number }
  >()

  for (const module of snapshot.modules) {
    if (!module.parsed || !PARSEABLE.test(module.path)) continue
    const absolute = resolvePath(config.root, module.path)
    const text = readFileSync(absolute, "utf8")
    const parsed = parseSync(absolute, text)
    const comments = parsed.comments as Node[]
    const program = parsed.program as Node

    const symbols: Symbol_[] = []
    let internal = 0
    for (const statement of program["body"] as Node[]) {
      switch (statement["type"]) {
        case "ImportDeclaration":
        case "ExportAllDeclaration":
          continue
        case "ExportNamedDeclaration": {
          const declaration = statement["declaration"] as Node | null
          if (statement["source"] != null || declaration == null) continue
          symbols.push(
            ...symbolsOf(declaration, text, comments, statement["start"]),
          )
          continue
        }
        case "ExportDefaultDeclaration":
          symbols.push({
            name: "default",
            form: "default",
            typeOnly: false,
            signature: null,
            doc: docBefore(comments, text, statement["start"]),
            members: null,
          })
          continue
        default:
          if (
            statement["type"] === "VariableDeclaration" ||
            statement["type"] === "FunctionDeclaration" ||
            statement["type"] === "ClassDeclaration" ||
            statement["type"] === "TSInterfaceDeclaration" ||
            statement["type"] === "TSTypeAliasDeclaration"
          ) {
            internal += 1
          }
          continue
      }
    }
    moduleSymbols.set(module.path, { symbols, internal })

    for (const [specifier, imported] of importsOf(program)) {
      // a bare specifier can resolve to a file (workspace dep, node_modules) that
      // the graph still calls external — file under both keys, the edge picks
      const resolution = engine.resolve(absolute, specifier)
      const targets = [`x:${specifier}`]
      if (resolution.kind === "file") {
        const rel = relative(config.root, resolution.path).split("\\").join("/")
        if (!rel.startsWith("..")) targets.unshift(`m:${rel}`)
      }
      for (const target of targets) {
        const key = edgeKey(module.path, target)
        const list = edgeSymbols.get(key)
        if (list === undefined) edgeSymbols.set(key, [...imported])
        else list.push(...imported)
      }
    }
  }

  const uniqueNames = (
    imported: Imported[],
  ): { name: string; typeOnly: boolean }[] => {
    const byName = new Map<string, boolean>()
    for (const entry of imported) {
      byName.set(entry.name, (byName.get(entry.name) ?? true) && entry.typeOnly)
    }
    return [...byName]
      .map(([name, typeOnly]) => ({ name, typeOnly }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  let matched = 0
  const edges = snapshot.edges.map((edge: any) => {
    const target =
      edge.to.type === "module" ? `m:${edge.to.path}` : `x:${edge.to.specifier}`
    const imported = edgeSymbols.get(edgeKey(edge.from, target))
    if (imported === undefined) return edge
    matched += 1
    return { ...edge, symbols: uniqueNames(imported) }
  })

  const modules = snapshot.modules.map((module: any) => {
    const found = moduleSymbols.get(module.path)
    if (found === undefined) return module
    return {
      ...module,
      symbols: found.symbols,
      internalDeclarations: found.internal,
    }
  })

  return {
    ...snapshot,
    fineLevel: {
      note: "probe, 2026-09-19 — symbols added on top of the shipped snapshot shape",
      modulesWithSymbols: modules.filter((m: any) => "symbols" in m).length,
      symbols: [...moduleSymbols.values()].reduce(
        (n, m) => n + m.symbols.length,
        0,
      ),
      edgesWithSymbols: matched,
      edgesTotal: snapshot.edges.length,
    },
    modules,
    edges,
  }
}
