/**
 * Registrars — which import a file's export stands for, when the export is a
 * registering function passed on under a name: what a fixture declaration gave
 * back (`export const test = base.extend({ … })`), another name for it (`export
 * const it = test`), a re-export. The name is followed from file to file, as
 * the reading follows it inside one, down to the import it started from; whose
 * that import is, and whether a declaration on the way is a fixture's, is the
 * asking file's reader's to say.
 *
 * Read off the syntax of each file's root: a `const` whose initializer is a
 * name or a member called on a name through members and calls, an import by
 * name, an export by name. A namespace, a default export, `export *` and a name
 * declared anywhere but the root are not followed: the answer is `null`, the
 * export stands for nothing known.
 *
 * Pure: each file's program and where its imports landed in, a lookup out.
 */

import type { Node, Program } from "@oxc-project/types"

import { unwrapNode } from "./cut.model.ts"

type AstNode = Record<string, unknown> & { type: string }

const isNode = (value: unknown): value is AstNode =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { type?: unknown }).type === "string"

const unwrap = (node: AstNode): AstNode =>
  unwrapNode(node as unknown as Node) as unknown as AstNode

/** The import an export stands for, and the declarations made on the way. */
export type RegistrarOrigin = {
  /** The file that writes the import. */
  file: string
  specifier: string
  imported: string
  /**
   * The calls made on the way, innermost first, each by the members it was
   * called through: `extend` for `export const test = base.extend({ … })`,
   * `skip`, `each` for `test.skip.each(rows)`. Each must be a call that gives a
   * registering function back, by the asking reader's word.
   */
  derived: readonly (readonly string[])[]
}

/** A file whose exports are asked: its program, where its imports landed. */
export type RegistrarFile = {
  /** `null` for a file that does not parse. */
  program: Program | null
  /** The project file a specifier lands on; `null` for anything else. */
  fileOf: (specifier: string) => string | null
}

export type Registrars = {
  /** The import a file's export stands for; `null` when it stands for none. */
  originOf(file: string, name: string): RegistrarOrigin | null
}

/** What a name written at a file's root is, as far as a registrar goes. */
type Local =
  | { kind: "import"; specifier: string; imported: string }
  /** Another name for `of`, or what a call through `members` of it gave. */
  | { kind: "const"; of: string; members: readonly string[] | null }

type FileTable = {
  locals: Map<string, Local>
  /** An export by name: the local it exports, or the re-export it passes on. */
  exported: Map<string, { local: string } | { specifier: string; name: string }>
}

/** A specifier's name: an identifier, or a string (`export { a as "b" }`). */
const nameOf = (node: AstNode): string =>
  (node.type === "Literal" ? node["value"] : node["name"]) as string

const tableOf = (program: Program): FileTable => {
  const table: FileTable = { locals: new Map(), exported: new Map() }

  /** A root `const`'s names, each with what its initializer makes it. */
  const declare = (declaration: AstNode): string[] => {
    if (
      declaration.type !== "VariableDeclaration" ||
      declaration["kind"] !== "const"
    )
      return []
    const names: string[] = []
    for (const declarator of declaration["declarations"] as AstNode[]) {
      const id = declarator["id"] as AstNode
      const init = declarator["init"]
      if (id.type !== "Identifier" || !isNode(init)) continue
      const name = id["name"] as string
      names.push(name)
      const value = unwrap(init)
      if (value.type === "Identifier") {
        table.locals.set(name, {
          kind: "const",
          of: value["name"] as string,
          members: null,
        })
        continue
      }
      if (value.type !== "CallExpression") continue
      // a member called, through members and calls down to a name:
      // `test.skip.each(rows)`, `test.skipIf(condition).each(rows)`
      let current = unwrap(value["callee"] as AstNode)
      if (current.type !== "MemberExpression") continue
      const members: string[] = []
      let computed = false
      while (
        current.type === "MemberExpression" ||
        current.type === "CallExpression"
      ) {
        if (current.type === "MemberExpression") {
          if (current["computed"] === true) computed = true
          else
            members.unshift((current["property"] as AstNode)["name"] as string)
          current = unwrap(current["object"] as AstNode)
        } else current = unwrap(current["callee"] as AstNode)
      }
      if (computed || current.type !== "Identifier") continue
      table.locals.set(name, {
        kind: "const",
        of: current["name"] as string,
        members,
      })
    }
    return names
  }

  for (const statement of program.body as unknown as AstNode[]) {
    switch (statement.type) {
      case "ImportDeclaration": {
        if (statement["importKind"] === "type") break
        const specifier = (statement["source"] as AstNode)["value"] as string
        for (const imported of statement["specifiers"] as AstNode[]) {
          if (
            imported.type !== "ImportSpecifier" ||
            imported["importKind"] === "type"
          )
            continue
          table.locals.set(nameOf(imported["local"] as AstNode), {
            kind: "import",
            specifier,
            imported: nameOf(imported["imported"] as AstNode),
          })
        }
        break
      }
      case "ExportNamedDeclaration": {
        const declaration = statement["declaration"]
        if (isNode(declaration)) {
          for (const name of declare(declaration))
            table.exported.set(name, { local: name })
          break
        }
        if (statement["exportKind"] === "type") break
        const source = statement["source"]
        for (const specifier of statement["specifiers"] as AstNode[]) {
          if (specifier["exportKind"] === "type") continue
          const local = nameOf(specifier["local"] as AstNode)
          table.exported.set(
            nameOf(specifier["exported"] as AstNode),
            isNode(source)
              ? { specifier: source["value"] as string, name: local }
              : { local },
          )
        }
        break
      }
      default:
        declare(statement)
    }
  }
  return table
}

export const createRegistrars = (
  files: ReadonlyMap<string, RegistrarFile>,
): Registrars => {
  const tables = new Map<string, FileTable | null>()
  const tableFor = (file: string): FileTable | null => {
    const known = tables.get(file)
    if (known !== undefined) return known
    const program = files.get(file)?.program ?? null
    const table = program === null ? null : tableOf(program)
    tables.set(file, table)
    return table
  }

  /**
   * An import written in a file: the export it lands on followed when that is a
   * project file's and stands for an import itself; the import as written
   * otherwise — a package's, or a project file's own export.
   */
  const importOf = (
    file: string,
    specifier: string,
    imported: string,
    open: ReadonlySet<string>,
  ): RegistrarOrigin | null => {
    const target = files.get(file)?.fileOf(specifier) ?? null
    const followed = target === null ? null : exportOf(target, imported, open)
    return followed ?? { file, specifier, imported, derived: [] }
  }

  /** A name written at a file's root. */
  const localOf = (
    file: string,
    name: string,
    open: ReadonlySet<string>,
  ): RegistrarOrigin | null => {
    const key = `${file}\0${name}`
    // a name bound to itself through its own initializer stands for nothing
    if (open.has(key)) return null
    const local = tableFor(file)?.locals.get(name)
    if (local === undefined) return null
    const next = new Set([...open, key])
    if (local.kind === "import")
      return importOf(file, local.specifier, local.imported, next)
    const origin = localOf(file, local.of, next)
    if (origin === null || local.members === null) return origin
    return { ...origin, derived: [...origin.derived, local.members] }
  }

  /** A file's export of a name. */
  const exportOf = (
    file: string,
    name: string,
    open: ReadonlySet<string>,
  ): RegistrarOrigin | null => {
    const key = `${file}\0export ${name}`
    // re-exports that come back to where they started
    if (open.has(key)) return null
    const exported = tableFor(file)?.exported.get(name)
    if (exported === undefined) return null
    const next = new Set([...open, key])
    return "local" in exported
      ? localOf(file, exported.local, next)
      : importOf(file, exported.specifier, exported.name, next)
  }

  return { originOf: (file, name) => exportOf(file, name, new Set()) }
}
