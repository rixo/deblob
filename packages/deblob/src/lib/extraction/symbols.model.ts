/**
 * The symbol level — what a module exports, as a map box reads it, and how many
 * top-level declarations it keeps to itself. Pure over ESTree: the engine's
 * tree, the text it was parsed from and its comments.
 *
 * An exported name is every name the module's own exports give out: a
 * declaration exported in place, a local binding exported by a clause (under
 * its exported name) or as the default. Each resolves to the declaration that
 * binds it, which gives its form, members and doc. A name the module imports
 * and exports again is a re-export — an edge fact, never a symbol here.
 */

import type {
  BindingPattern,
  ClassElement,
  Declaration,
  Expression,
  BigIntLiteral,
  IdentifierName,
  ModuleExportName,
  NumericLiteral,
  PrivateIdentifier,
  Program,
  PropertyKey,
  StringLiteral,
  TSEnumMember,
  TSSignature,
} from "@oxc-project/types"

import type { DeclaredSymbol } from "./graph.model.ts"

/** A comment as the parser reports it: its text between the delimiters. */
export type SourceComment = {
  type: "Line" | "Block"
  value: string
  start: number
  end: number
}

/** What a declaration binds, one entry per name, before its doc. */
type Bound = Omit<DeclaredSymbol, "doc">

const DOC_MAX = 200

/**
 * The first sentence of the JSDoc block that ends right before `start` — only
 * whitespace between — on one line, capped. `null` when the nearest comment is
 * not a JSDoc block, or is not right above.
 */
const docAt = (
  comments: readonly SourceComment[],
  source: string,
  start: number,
): string | null => {
  let nearest: SourceComment | null = null
  for (const comment of comments) {
    if (comment.end > start) break
    nearest = comment
  }
  if (nearest === null || nearest.type !== "Block") return null
  if (!nearest.value.startsWith("*")) return null
  if (source.slice(nearest.end, start).trim() !== "") return null
  const body = nearest.value
    .slice(1)
    .split("\n")
    .map((line) => line.replace(/^\s*\*?\s?/, ""))
    .join("\n")
    .trim()
  if (body === "") return null
  const sentence = /^[\s\S]*?[.!?](?:\s|$)/.exec(body)
  const flat = (sentence === null ? body : sentence[0]).replace(/\s+/g, " ")
  const line = flat.trim()
  return line.length > DOC_MAX ? `${line.slice(0, DOC_MAX - 1)}…` : line
}

/**
 * A property key as written; `null` for a computed one. A key that is not
 * computed is an identifier, a private name or a literal — the grammar has no
 * other — and a literal key is a string or a number (a bigint reads as one).
 */
const keyName = (key: PropertyKey, computed: boolean): string | null => {
  if (computed) return null
  const written = key as
    | IdentifierName
    | PrivateIdentifier
    | StringLiteral
    | NumericLiteral
    | BigIntLiteral
  return written.type === "PrivateIdentifier"
    ? `#${written.name}`
    : written.type === "Identifier"
      ? written.name
      : String(written.value)
}

const isFunctionValue = (value: Expression | null | undefined): boolean =>
  value !== null &&
  value !== undefined &&
  (value.type === "ArrowFunctionExpression" ||
    value.type === "FunctionExpression")

const signatureMembers = (members: readonly TSSignature[]): string[] =>
  members.flatMap((member): string[] => {
    switch (member.type) {
      case "TSPropertySignature": {
        const name = keyName(member.key, member.computed)
        if (name === null) return []
        const callable =
          member.typeAnnotation?.typeAnnotation.type === "TSFunctionType"
        return [callable ? `${name}()` : name]
      }
      case "TSMethodSignature": {
        const name = keyName(member.key, member.computed)
        return name === null ? [] : [`${name}()`]
      }
      case "TSIndexSignature":
        return ["[index]"]
      case "TSCallSignatureDeclaration":
        return ["()"]
      case "TSConstructSignatureDeclaration":
        return ["new()"]
    }
  })

const classMembers = (members: readonly ClassElement[]): string[] =>
  members.flatMap((member): string[] => {
    switch (member.type) {
      case "StaticBlock":
        return []
      case "TSIndexSignature":
        return ["[index]"]
      case "MethodDefinition":
      case "TSAbstractMethodDefinition": {
        const name = keyName(member.key, member.computed)
        return name === null ? [] : [`${name}()`]
      }
      case "PropertyDefinition":
      case "TSAbstractPropertyDefinition": {
        const name = keyName(member.key, member.computed)
        if (name === null) return []
        const callable =
          member.typeAnnotation?.typeAnnotation.type === "TSFunctionType" ||
          isFunctionValue(member.value)
        return [callable ? `${name}()` : name]
      }
      case "AccessorProperty":
      case "TSAbstractAccessorProperty": {
        const name = keyName(member.key, member.computed)
        return name === null ? [] : [name]
      }
    }
  })

/**
 * An enum member's name: an identifier or a string. A template literal is in
 * the type but never parses ("computed property names are not allowed in
 * enums"), and an unparsed file is never read.
 */
const enumMemberName = (member: TSEnumMember): string => {
  const id = member.id as IdentifierName | StringLiteral
  return id.type === "Identifier" ? id.name : id.value
}

/** Every name a binding pattern binds, in source order. */
const boundNames = (pattern: BindingPattern): string[] => {
  switch (pattern.type) {
    case "Identifier":
      return [pattern.name]
    case "AssignmentPattern":
      return boundNames(pattern.left)
    case "ObjectPattern":
      return pattern.properties.flatMap((property) =>
        property.type === "RestElement"
          ? boundNames(property.argument)
          : boundNames(property.value),
      )
    case "ArrayPattern":
      return pattern.elements.flatMap((element) =>
        element === null
          ? []
          : element.type === "RestElement"
            ? boundNames(element.argument)
            : boundNames(element),
      )
  }
}

/** What a declaration binds: one entry per name. */
const boundBy = (declaration: Declaration, source: string): Bound[] => {
  switch (declaration.type) {
    case "VariableDeclaration":
      return declaration.declarations.flatMap((declarator) => {
        const callable =
          declarator.id.type === "Identifier" &&
          isFunctionValue(declarator.init)
        return boundNames(declarator.id).map((name) => ({
          name,
          form: callable ? "function" : declaration.kind,
          typeOnly: false,
          members: null,
        }))
      })
    case "FunctionDeclaration":
    case "FunctionExpression":
    case "TSDeclareFunction":
    case "TSEmptyBodyFunctionExpression":
      return declaration.id === null
        ? []
        : [
            {
              name: declaration.id.name,
              form: "function",
              typeOnly: false,
              members: null,
            },
          ]
    case "ClassDeclaration":
    case "ClassExpression":
      return declaration.id === null
        ? []
        : [
            {
              name: declaration.id.name,
              form: "class",
              typeOnly: false,
              members: classMembers(declaration.body.body),
            },
          ]
    case "TSTypeAliasDeclaration":
      return [
        {
          name: declaration.id.name,
          form: "type",
          typeOnly: true,
          members:
            declaration.typeAnnotation.type === "TSTypeLiteral"
              ? signatureMembers(declaration.typeAnnotation.members)
              : null,
        },
      ]
    case "TSInterfaceDeclaration":
      return [
        {
          name: declaration.id.name,
          form: "interface",
          typeOnly: true,
          members: signatureMembers(declaration.body.body),
        },
      ]
    case "TSEnumDeclaration":
      return [
        {
          name: declaration.id.name,
          form: "enum",
          typeOnly: false,
          members: declaration.body.members.map(enumMemberName),
        },
      ]
    case "TSModuleDeclaration":
      return [
        {
          name:
            declaration.id.type === "Identifier"
              ? declaration.id.name
              : declaration.id.type === "Literal"
                ? declaration.id.value
                : source.slice(declaration.id.start, declaration.id.end),
          // `declare global` is a module declaration of kind global
          form: declaration.kind === "global" ? "global" : "namespace",
          typeOnly: false,
          members: null,
        },
      ]
    case "TSImportEqualsDeclaration":
      return [
        {
          name: declaration.id.name,
          form: "import",
          typeOnly: false,
          members: null,
        },
      ]
  }
}

const exportName = (name: ModuleExportName): string =>
  name.type === "Literal" ? name.value : name.name

/** The statement forms that declare (an import-equals is an import). */
const isDeclaration = (statement: { type: string }): boolean =>
  statement.type === "VariableDeclaration" ||
  statement.type === "FunctionDeclaration" ||
  statement.type === "TSDeclareFunction" ||
  statement.type === "ClassDeclaration" ||
  statement.type === "TSTypeAliasDeclaration" ||
  statement.type === "TSInterfaceDeclaration" ||
  statement.type === "TSEnumDeclaration" ||
  statement.type === "TSModuleDeclaration"

export const symbolLevelOf = ({
  program,
  source,
  comments,
}: {
  program: Program
  source: string
  comments: readonly SourceComment[]
}): { symbols: readonly DeclaredSymbol[]; internalDeclarations: number } => {
  // comments in source order: docAt stops at the first one past its point
  const ordered = [...comments].sort((a, b) => a.start - b.start)
  const docOf = (start: number) => docAt(ordered, source, start)

  /** Every top-level binding, and the doc of the statement that binds it. */
  const locals = new Map<string, DeclaredSymbol>()
  /** Non-exported declaration statements, by the names each binds. */
  const unexported: string[][] = []
  for (const statement of program.body) {
    if (statement.type === "ExportNamedDeclaration") {
      if (statement.declaration === null) continue
      const doc = docOf(statement.start)
      for (const bound of boundBy(statement.declaration, source))
        locals.set(bound.name, { ...bound, doc })
      continue
    }
    if (!isDeclaration(statement)) continue
    const bound = boundBy(statement as Declaration, source)
    const doc = docOf(statement.start)
    for (const entry of bound) locals.set(entry.name, { ...entry, doc })
    unexported.push(bound.map(({ name }) => name))
  }

  const symbols: DeclaredSymbol[] = []
  const exportedLocals = new Set<string>()
  const give = (name: string, local: string): void => {
    const declared = locals.get(local)
    // not a local binding: an import given out again — an edge fact
    if (declared === undefined) return
    exportedLocals.add(local)
    symbols.push({ ...declared, name })
  }
  for (const statement of program.body) {
    switch (statement.type) {
      case "ExportNamedDeclaration":
        if (statement.source !== null) continue
        if (statement.declaration !== null) {
          for (const { name } of boundBy(statement.declaration, source))
            give(name, name)
          continue
        }
        for (const specifier of statement.specifiers)
          give(exportName(specifier.exported), exportName(specifier.local))
        continue
      case "ExportDefaultDeclaration": {
        const declaration = statement.declaration
        if (declaration.type === "Identifier" && locals.has(declaration.name)) {
          give("default", declaration.name)
          continue
        }
        const doc = docOf(statement.start)
        switch (declaration.type) {
          case "FunctionDeclaration":
          case "ClassDeclaration":
          case "TSInterfaceDeclaration": {
            const [bound] = boundBy(declaration, source)
            symbols.push(
              bound === undefined
                ? {
                    name: "default",
                    form:
                      declaration.type === "ClassDeclaration"
                        ? "class"
                        : "function",
                    typeOnly: false,
                    members:
                      declaration.type === "ClassDeclaration"
                        ? classMembers(declaration.body.body)
                        : null,
                    doc,
                  }
                : { ...bound, name: "default", doc },
            )
            continue
          }
          default:
            symbols.push({
              name: "default",
              form: "default",
              typeOnly: false,
              members: null,
              doc,
            })
            continue
        }
      }
      default:
        continue
    }
  }

  const internalDeclarations = unexported.filter((names) =>
    names.every((name) => !exportedLocals.has(name)),
  ).length
  return { symbols, internalDeclarations }
}
