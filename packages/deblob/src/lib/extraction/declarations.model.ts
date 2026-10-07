/**
 * Declarations — what a type name stands for, across the project's files. A
 * name is resolved where it is written, the way TypeScript resolves it: a
 * declaration in the file, then an import, the target's export of that name
 * followed through renames and re-exports to the declaration it lands on. Type
 * declarations only: an alias, an interface (every declaration of it, merged),
 * an enum; a class is declared and not followed. A name the project's files
 * pass on and that lands on no declaration is lost — the code is broken, and
 * the answer says how. What a name stands for says nothing of readonly — the
 * reading judges that.
 *
 * Pure: each file's program and where its imports landed in, a lookup out. The
 * table is built once, before any file is read; the reading asks it one name at
 * a time.
 */

import type { Node, Program } from "@oxc-project/types"

type AstNode = Record<string, unknown> & { type: string }

const isNode = (value: unknown): value is AstNode =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { type?: unknown }).type === "string"

/** A type parameter of a declaration: its name, its default when it has one. */
export type TypeParameter = { name: string; default: Node | null }

/**
 * The declaration a type name lands on, with the file that declares it — where
 * the names its body writes resolve.
 */
export type TypeDeclaration = { file: string; name: string } & (
  | { kind: "alias"; parameters: readonly TypeParameter[]; body: Node }
  | {
      kind: "interface"
      parameters: readonly TypeParameter[]
      /** The members of every declaration of it, merged. */
      members: readonly Node[]
      /** What it extends, as written: resolved in its own file. */
      extends: readonly Node[]
    }
  | { kind: "enum" }
  /** Declared, and not followed: a class. */
  | { kind: "opaque" }
)

/**
 * A name the project's files pass on, that lands on no declaration: the file it
 * leads to does not parse, or exports no such name, or exports it as a value
 * and nothing else, or the re-exports come back to where they started. `file`
 * is where the following stopped.
 */
export type LostType = {
  kind: "lost"
  file: string
  name: string
  how: "unparsed" | "missing" | "value" | "loop"
}

export type Declarations = {
  /**
   * What `name` stands for, written in `file`: a declaration, a lost name, or
   * `null` for a name the project's files do not say — a package's, the
   * standard library's, one the table does not follow.
   */
  typeOf(file: string, name: string): TypeDeclaration | LostType | null
}

/** One file as the table reads it. */
export type DeclaringFile = {
  /** `null` for a file that does not parse. */
  program: Program | null
  /** The project file a literal specifier landed on; `null` for anything else. */
  fileOf: (specifier: string) => string | null
}

type Reference = { file: string; name: string }

type FileTable = {
  declared: Map<string, TypeDeclaration>
  /** A local name bound by an import: the target file and the name there. */
  imported: Map<string, Reference>
  /** The variables and functions of its top level: values, and no types. */
  values: Set<string>
  /**
   * An exported name: the local it exports, another file's export, or `null`
   * for one re-exported from outside the project.
   */
  exported: Map<string, { local: string } | Reference | null>
  /** The files whose every export this one re-exports (`export *`). */
  starred: string[]
  /** It re-exports all of a package, or of a file no engine reads. */
  starredOutside: boolean
}

/**
 * The names a statement binds as values and nothing else: a function's, a
 * variable's — those written plainly, a destructuring's are not listed.
 */
const valueNamesOf = (statement: AstNode): string[] => {
  if (statement.type === "FunctionDeclaration")
    return [(statement["id"] as AstNode)["name"] as string]
  if (statement.type !== "VariableDeclaration") return []
  return (statement["declarations"] as AstNode[]).flatMap((declarator) => {
    const id = declarator["id"] as AstNode
    return id.type === "Identifier" ? [id["name"] as string] : []
  })
}

const parametersOf = (declaration: AstNode): TypeParameter[] => {
  const list = declaration["typeParameters"]
  if (!isNode(list)) return []
  return (list["params"] as AstNode[]).map((parameter) => ({
    name: (parameter["name"] as AstNode)["name"] as string,
    default: (parameter["default"] ?? null) as Node | null,
  }))
}

const tableOf = (
  file: string,
  program: Program,
  fileOf: DeclaringFile["fileOf"],
): FileTable => {
  const table: FileTable = {
    declared: new Map(),
    imported: new Map(),
    values: new Set(),
    exported: new Map(),
    starred: [],
    starredOutside: false,
  }

  /** A top-level statement: the type it declares, or the values it binds. */
  const declare = (declaration: AstNode): void => {
    const values = valueNamesOf(declaration)
    for (const value of values) table.values.add(value)
    const id = declaration["id"]
    if (values.length > 0 || !isNode(id)) return
    const name = id["name"] as string
    switch (declaration.type) {
      case "TSTypeAliasDeclaration":
        table.declared.set(name, {
          kind: "alias",
          file,
          name,
          parameters: parametersOf(declaration),
          body: declaration["typeAnnotation"] as Node,
        })
        return
      case "TSInterfaceDeclaration": {
        const earlier = table.declared.get(name)
        const merged = earlier?.kind === "interface" ? earlier : null
        table.declared.set(name, {
          kind: "interface",
          file,
          name,
          parameters: merged?.parameters ?? parametersOf(declaration),
          members: [
            ...(merged?.members ?? []),
            ...((declaration["body"] as AstNode)["body"] as Node[]),
          ],
          extends: [
            ...(merged?.extends ?? []),
            ...(declaration["extends"] as Node[]),
          ],
        })
        return
      }
      case "TSEnumDeclaration":
        table.declared.set(name, { kind: "enum", file, name })
        return
      case "ClassDeclaration":
        table.declared.set(name, { kind: "opaque", file, name })
    }
  }

  for (const statement of program.body as unknown as AstNode[]) {
    switch (statement.type) {
      case "ImportDeclaration": {
        const target = fileOf(
          (statement["source"] as AstNode)["value"] as string,
        )
        if (target === null) break
        for (const specifier of statement["specifiers"] as AstNode[]) {
          // a namespace import names no type: its members are qualified names
          if (specifier.type === "ImportNamespaceSpecifier") continue
          table.imported.set(
            (specifier["local"] as AstNode)["name"] as string,
            {
              file: target,
              name:
                specifier.type === "ImportDefaultSpecifier"
                  ? "default"
                  : ((specifier["imported"] as AstNode)["name"] as string),
            },
          )
        }
        break
      }
      case "ExportDefaultDeclaration": {
        const exported = statement["declaration"] as AstNode
        const id = exported.type === "Identifier" ? exported : exported["id"]
        // a name, or a declaration that has one: asked of the file
        if (isNode(id)) {
          declare(exported)
          table.exported.set("default", { local: id["name"] as string })
        }
        // a class with no name is a type the table has nowhere to keep
        else if (exported.type === "ClassDeclaration")
          table.exported.set("default", null)
        // anything else is a value: kept under the one name no local can take
        else {
          table.values.add("default")
          table.exported.set("default", { local: "default" })
        }
        break
      }
      case "ExportNamedDeclaration": {
        const declaration = statement["declaration"]
        if (isNode(declaration)) {
          declare(declaration)
          // exported under its own name — a type, a function, a namespace,
          // an import alias — or a variable under each of its names; what
          // the name stands for is asked of the file
          const id = declaration["id"]
          const names = isNode(id)
            ? [id["name"] as string]
            : valueNamesOf(declaration)
          for (const name of names) table.exported.set(name, { local: name })
          break
        }
        const source = statement["source"]
        const target = isNode(source)
          ? fileOf(source["value"] as string)
          : undefined
        for (const specifier of statement["specifiers"] as AstNode[]) {
          const local = (specifier["local"] as AstNode)["name"] as string
          table.exported.set(
            (specifier["exported"] as AstNode)["name"] as string,
            target === undefined
              ? { local }
              : // re-exported from outside the project: nothing to follow
                target === null
                ? null
                : { file: target, name: local },
          )
        }
        break
      }
      case "ExportAllDeclaration": {
        const namespace = statement["exported"]
        // `export * as ns from` exports a namespace, not the names
        if (isNode(namespace)) {
          table.exported.set(namespace["name"] as string, null)
          break
        }
        const target = fileOf(
          (statement["source"] as AstNode)["value"] as string,
        )
        if (target === null) table.starredOutside = true
        else table.starred.push(target)
        break
      }
      default:
        declare(statement)
    }
  }
  return table
}

export const createDeclarations = (
  files: ReadonlyMap<string, DeclaringFile>,
): Declarations => {
  /** `null` for a file that does not parse. */
  const tables = new Map(
    [...files].map(([file, { program, fileOf }]) => [
      file,
      program === null ? null : tableOf(file, program, fileOf),
    ]),
  )

  /** A name as written in a file: its declaration, or what its import exports. */
  const localOf = (
    file: string,
    name: string,
    open: ReadonlySet<string>,
  ): TypeDeclaration | LostType | null => {
    // asked of a file the table read: the one being read, a declaration's
    // own, or one `exportOf` found
    const table = tables.get(file) as FileTable
    const declared = table.declared.get(name)
    if (declared !== undefined) return declared
    const imported = table.imported.get(name)
    return imported === undefined
      ? null
      : exportOf(imported.file, imported.name, open)
  }

  /** A file's export of a name, through renames, re-exports and `export *`. */
  const exportOf = (
    file: string,
    name: string,
    open: ReadonlySet<string>,
  ): TypeDeclaration | LostType | null => {
    const key = `${file}\0${name}`
    if (open.has(key)) return { kind: "lost", file, name, how: "loop" }
    const table = tables.get(file)
    // a project file no engine reads: what it exports is not known
    if (table === undefined) return null
    if (table === null) return { kind: "lost", file, name, how: "unparsed" }
    const next = new Set([...open, key])
    const exported = table.exported.get(name)
    if (exported === null) return null
    if (exported !== undefined) {
      if (!("local" in exported))
        return exportOf(exported.file, exported.name, next)
      // a name that is a value and no type lands on nothing; one the file
      // neither declares nor imports from the project is not said
      return (
        localOf(file, exported.local, next) ??
        (table.values.has(exported.local)
          ? { kind: "lost", file, name, how: "value" }
          : null)
      )
    }
    // through `export *`: the first file that has the name; a file that does
    // not parse may have it, so the name is lost there and not missing. A
    // default export is the one name `export *` does not pass on
    if (name === "default") return { kind: "lost", file, name, how: "missing" }
    let unparsed: LostType | null = null
    let unsaid = table.starredOutside
    for (const target of table.starred) {
      const found = exportOf(target, name, next)
      if (found === null) unsaid = true
      else if (found.kind !== "lost") return found
      else if (found.how === "unparsed") unparsed ??= found
    }
    if (unparsed !== null) return unparsed
    return unsaid ? null : { kind: "lost", file, name, how: "missing" }
  }

  return { typeOf: (file, name) => localOf(file, name, new Set()) }
}
