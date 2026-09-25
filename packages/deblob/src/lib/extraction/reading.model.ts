/**
 * The reading — the tech-agnostic walk over a module's syntax tree that yields
 * it: every call classified by what its callee is and where its result goes,
 * every definition, every branch, and the hooks a tech's calls were handed.
 * Pure over ESTree, total: a node it does not know is walked through for the
 * calls it contains and otherwise ignored, never a throw. It takes plain data —
 * the file's kind, its reader's tech name and exemptions, what each import
 * lands on — never a port; the extraction service picks the reader (a `Reader`,
 * one per technology, bound to files by glob) and hands the walk that data.
 *
 * A file is read with its reader's tech, and the result is the file's reading.
 * What varies per technology (claims, exemptions) arrives resolved; what every
 * technology shares is here: the lexical scope, the kinds table, the cut — a
 * hook is a function handed to a tech callee — and the language lists, which
 * say what is ECMAScript and leave the rest to the host, the tech by
 * complement.
 */

import type { Program } from "@oxc-project/types"

import type {
  ArgValue,
  CalleeKind,
  Exemption,
  FileReading,
  Immutability,
  InstanceOrigin,
  Layer,
  OpenPart,
  ReadCall,
  ReadFunction,
  ReadHook,
  ReadStatement,
  ResultUse,
  Span,
  UnknownCondition,
  ValueKind,
} from "./graph.model.ts"

/** What an import specifier lands on, as the graph has it, plus the claim. */
export type ImportTargetKind =
  | { kind: "module"; path: string; layer: Layer }
  | {
      kind: "external"
      package: string | null
      /**
       * Tech: `driverTech`, or a concrete builtin; `reader`: the file's own
       * reader's claim — tech too, and the one a registration calls into;
       * model: pure.
       */
      claim: "reader" | "tech" | "model" | "unclaimed"
      /**
       * The layer the package claims for this entry, when it does — a sibling's
       * `deblob` field, or the consumer's `externalLayers` patch.
       */
      layer: Layer | null
    }
  | { kind: "unresolved" }

export type ReadInput = {
  program: Program
  source: string
  /** The file's own kind. */
  layer: Layer
  /**
   * The tech reading the file: its name and exemptions. `null` for an inside
   * kind — root statements only, no functions cut.
   */
  tech: { name: string; exempts: readonly Exemption[] } | null
  importTargetOf: (specifier: string) => ImportTargetKind
  /**
   * The flavor's word on an export name — a factory or not — where the file
   * kind does not decide: a model export, a pure package's export, a local
   * function. Absent = nothing is a factory by name (step 01's reading).
   */
  isFactory?: (name: string) => boolean
  /**
   * What the file's exported functions were called with, by export name
   * (`"default"` for the default export) and by position — one world's word,
   * the graph pass's: the arguments of one production call site. A parameter
   * past the site's arguments, or of a function no entry binds, is unknown and
   * open.
   */
  paramKinds?: ReadonlyMap<string, readonly ArgValue[]>
  /** The declared config loads, `<file>#<name>` split. */
  configLoads?: readonly { file: string; name: string }[]
}

/**
 * ECMAScript's global intrinsics (ECMA-262 § 19, plus ECMA-402's `Intl`): a
 * closed set the specification defines, so enumerating it is the operation.
 * Everything a host adds — `process`, `document`, `fetch`, `Bun` — is tech by
 * complement, and needs no entry.
 */
const LANGUAGE_GLOBALS: ReadonlySet<string> = new Set([
  "globalThis",
  "Infinity",
  "NaN",
  "undefined",
  "eval",
  "isFinite",
  "isNaN",
  "parseFloat",
  "parseInt",
  "decodeURI",
  "decodeURIComponent",
  "encodeURI",
  "encodeURIComponent",
  "AggregateError",
  "Array",
  "ArrayBuffer",
  "Atomics",
  "BigInt",
  "BigInt64Array",
  "BigUint64Array",
  "Boolean",
  "DataView",
  "Date",
  "Error",
  "EvalError",
  "FinalizationRegistry",
  "Float16Array",
  "Float32Array",
  "Float64Array",
  "Function",
  "Int8Array",
  "Int16Array",
  "Int32Array",
  "Iterator",
  "JSON",
  "Map",
  "Math",
  "Number",
  "Object",
  "Promise",
  "Proxy",
  "RangeError",
  "ReferenceError",
  "Reflect",
  "RegExp",
  "Set",
  "SharedArrayBuffer",
  "String",
  "Symbol",
  "SyntaxError",
  "TypeError",
  "Uint8Array",
  "Uint8ClampedArray",
  "Uint16Array",
  "Uint32Array",
  "URIError",
  "WeakMap",
  "WeakRef",
  "WeakSet",
  "Intl",
  // the function-local pseudo-binding, language too
  "arguments",
])

/**
 * A module's own location — CommonJS's names for it, and the members of
 * `import.meta` that hold it. Canon: presumed not a read of the machine, the
 * module's identity fixed at load; what else `import.meta` carries (`env`) is.
 */
const LOCATION_GLOBALS: ReadonlySet<string> = new Set([
  "__dirname",
  "__filename",
])
const LOCATION_META: ReadonlySet<string> = new Set([
  "url",
  "dirname",
  "filename",
])

/** The intrinsics whose value is a literal, not a computation. */
const LITERAL_GLOBALS: ReadonlySet<string> = new Set([
  "undefined",
  "NaN",
  "Infinity",
])

type AstNode = Record<string, unknown> & {
  type: string
  start: number
  end: number
}

const isNode = (value: unknown): value is AstNode =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { type?: unknown }).type === "string"

const FUNCTION_TYPES = new Set([
  "ArrowFunctionExpression",
  "FunctionExpression",
])

const isFunctionNode = (node: AstNode | null): node is AstNode =>
  node !== null && FUNCTION_TYPES.has(node.type)

/** Transparent wrappers: the value is the inner expression's. */
const WRAPPERS = new Set([
  "ParenthesizedExpression",
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSNonNullExpression",
  "TSTypeAssertion",
  "TSInstantiationExpression",
  "ChainExpression",
  "AwaitExpression",
])

/** The forms that call: `import()` is a call into the host's module loader. */
const CALL_FORMS: ReadonlySet<string> = new Set([
  "CallExpression",
  "NewExpression",
  "TaggedTemplateExpression",
  "ImportExpression",
])

const unwrap = (node: AstNode): AstNode => {
  let current = node
  while (WRAPPERS.has(current.type)) {
    // every wrapper carries the one or the other
    current = (current["expression"] ?? current["argument"]) as AstNode
  }
  return current
}

// --- immutability, the syntactic fact -------------------------------------
// Immutability a type checker would know and this reader reads off the
// syntax alone: no alias resolution, no inference. A census both ways — the
// forms TypeScript types as readonly without a checker, and the forms that
// are mutable by construction; every other form is unknown, with what the
// reader could not see, never mutable by default. `stable-root` reads it
// unless config says `mutableModuleState`.

const READONLY = { proof: "readonly" } as const satisfies Immutability
/** Mutable, by the form that proves it: what the message names. */
const mutableBy = (form: string, name: string | null = null): Immutability => ({
  proof: "mutable",
  form,
  name,
})
const unknownFor = (condition: UnknownCondition): Immutability => ({
  proof: "unknown",
  condition,
})

/**
 * Parts that all hold the value — members, union arms, frozen entries: one
 * proven mutable makes the whole mutable, then the first unknown makes it
 * unknown.
 */
const allOf = (parts: readonly Immutability[]): Immutability =>
  parts.find((part) => part.proof === "broken") ??
  parts.find((part) => part.proof === "mutable") ??
  parts.find((part) => part.proof === "unknown") ??
  READONLY

/**
 * A declared type over a value: the type decides what the binding lets you do,
 * except that a value readonly by its own form (frozen, a primitive) stays
 * readonly whatever the type says — and either side broken is the answer.
 */
const typedAs = (type: Immutability, value: Immutability): Immutability => {
  if (value.proof === "broken") return value
  if (type.proof === "broken") return type
  return value.proof === "readonly" ? value : type
}

/** Type keywords whose values are primitives — immutable by nature. */
const PRIMITIVE_TYPE_KEYWORDS = new Set([
  "TSStringKeyword",
  "TSNumberKeyword",
  "TSBooleanKeyword",
  "TSBigIntKeyword",
  "TSSymbolKeyword",
  "TSNullKeyword",
  "TSUndefinedKeyword",
  "TSLiteralType",
  "TSTemplateLiteralType",
])

/** The standard readonly wrappers, by name at the type's top. */
const READONLY_TYPE_NAMES = new Set([
  "Readonly",
  "ReadonlyArray",
  "ReadonlyMap",
  "ReadonlySet",
])

/** The standard types whose values carry mutators, by name. */
const MUTABLE_TYPE_NAMES: ReadonlySet<string> = new Set([
  "Array",
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",
  "Date",
  "Record",
])

const typeArgumentsOf = (type: AstNode): AstNode[] => {
  const args = type["typeArguments"] as AstNode | undefined
  return isNode(args) ? (args["params"] as AstNode[]) : []
}

/** A type name as written: `Table`, `shapes.Table`. */
const typeNameText = (name: AstNode): string =>
  name.type === "TSQualifiedName"
    ? `${typeNameText(name["left"] as AstNode)}.${(name["right"] as AstNode)["name"] as string}`
    : (name["name"] as string)

/**
 * A type literal's members, each readonly — marked so, or under a `Readonly<…>`
 * that wraps the literal — and of a proven type. A property or method not
 * marked, outside `Readonly`, is mutable: TypeScript lets it be reassigned. A
 * call or construct signature is code.
 */
const membersImmutability = (
  literal: AstNode,
  wrapped: boolean,
): Immutability =>
  allOf(
    (literal["members"] as AstNode[]).map((member) => {
      switch (member.type) {
        case "TSPropertySignature": {
          if (!wrapped && member["readonly"] !== true)
            return mutableBy(member.type)
          const annotation = member["typeAnnotation"]
          return isNode(annotation)
            ? typeImmutability(annotation["typeAnnotation"] as AstNode)
            : unknownFor({ kind: "type-form", form: "TSPropertySignature" })
        }
        case "TSMethodSignature":
          return wrapped
            ? unknownFor({ kind: "type-form", form: "TSMethodSignature" })
            : mutableBy(member.type)
        case "TSIndexSignature":
          return wrapped || member["readonly"] === true
            ? unknownFor({ kind: "type-form", form: "TSIndexSignature" })
            : mutableBy(member.type)
        // the rest of ESTree's closed set: a call or construct signature, code
        default:
          return READONLY
      }
    }),
  )

/**
 * A type's immutability to its depth. Readonly: a primitive; a function type
 * (code, not state); a type literal whose members are all `readonly` and
 * proven; `Readonly<…>` over a type literal whose members are proven, over a
 * `Record<K, V>` whose values are, or over a proven array; a `Readonly*`
 * collection whose type arguments are proven; `readonly T[]` over a proven
 * element; a union or intersection of those. Mutable: `T[]`, a tuple, a
 * standard mutable collection or `Record` — `Readonly<Map<…>>` keeps the Map's
 * mutators — and a type literal with a member not readonly. Unknown: a named
 * type (no alias resolution) and every form not read.
 */
const typeImmutability = (type: AstNode): Immutability => {
  if (PRIMITIVE_TYPE_KEYWORDS.has(type.type)) return READONLY
  switch (type.type) {
    case "TSFunctionType":
      return READONLY
    case "TSTypeLiteral":
      return membersImmutability(type, false)
    case "TSArrayType":
    case "TSTupleType":
      return mutableBy(type.type)
    case "TSTypeReference": {
      const typeName = type["typeName"] as AstNode
      if (typeName.type !== "Identifier")
        return unknownFor({ kind: "type-name", name: typeNameText(typeName) })
      const name = typeName["name"] as string
      if (MUTABLE_TYPE_NAMES.has(name))
        return mutableBy("TSTypeReference", name)
      if (!READONLY_TYPE_NAMES.has(name))
        return unknownFor({ kind: "type-name", name })
      const args = typeArgumentsOf(type)
      if (args.length === 0)
        return { proof: "broken", reason: `${name} without its type arguments` }
      if (name !== "Readonly") return allOf(args.map(typeImmutability))
      const inner = args[0] as AstNode
      if (inner.type === "TSTypeLiteral")
        return membersImmutability(inner, true)
      if (inner.type === "TSArrayType")
        return typeImmutability(inner["elementType"] as AstNode)
      if (
        inner.type === "TSTypeReference" &&
        (inner["typeName"] as AstNode)["name"] === "Record"
      ) {
        const recordArgs = typeArgumentsOf(inner)
        return recordArgs.length === 2
          ? typeImmutability(recordArgs[1] as AstNode)
          : { proof: "broken", reason: "Record without its value type" }
      }
      return typeImmutability(inner)
    }
    case "TSTypeOperator": {
      const operator = type["operator"] as string
      if (operator !== "readonly")
        return unknownFor({
          kind: "type-form",
          form: operator,
        })
      // oxc refuses `readonly` over anything but an array or a tuple
      const operand = type["typeAnnotation"] as AstNode
      return operand.type === "TSArrayType"
        ? typeImmutability(operand["elementType"] as AstNode)
        : allOf((operand["elementTypes"] as AstNode[]).map(typeImmutability))
    }
    case "TSParenthesizedType":
      return typeImmutability(type["typeAnnotation"] as AstNode)
    case "TSUnionType":
    case "TSIntersectionType":
      return allOf((type["types"] as AstNode[]).map(typeImmutability))
    default:
      return unknownFor({
        kind: "type-form",
        form: type.type,
      })
  }
}

/** `as const` / `<const>`: the assertion's type is the `const` reference. */
const isConstAssertion = (type: AstNode): boolean =>
  type.type === "TSTypeReference" &&
  (type["typeName"] as AstNode)["name"] === "const"

/** What a name read in an initializer is bound to, as far as the reader knows. */
type Names = {
  /** Bound to an immutable value. */
  isImmutable: (name: string) => boolean
  /** The initializer it is bound to, when the reader can hold it for sure. */
  initOf: (name: string) => AstNode | null
}

/** The standard constructors whose instances carry mutators. */
const MUTABLE_CONSTRUCTORS: ReadonlySet<string> = new Set([
  "Array",
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",
  "Date",
])

/** A callee as written, for a message: `createTable`, `Math.max`. */
const calleeText = (callee: AstNode): string | null => {
  const node = unwrap(callee)
  if (node.type === "Identifier") return node["name"] as string
  if (node.type === "MemberExpression" && node["computed"] !== true) {
    const object = calleeText(node["object"] as AstNode)
    const property = (node["property"] as AstNode)["name"] as string
    return object === null ? null : `${object}.${property}`
  }
  return null
}

const isObjectFreeze = (callee: AstNode): boolean =>
  callee.type === "MemberExpression" &&
  (callee["object"] as AstNode)["name"] === "Object" &&
  (callee["property"] as AstNode)["name"] === "freeze"

/**
 * An initializer's immutability by its form. Readonly: a primitive-valued
 * expression (a literal, a template, an operator's result), `undefined`, a name
 * bound to an immutable value, a function or class, `as const`, `Object.freeze`
 * over a literal whose entries are immutable (written there, or bound to the
 * name it freezes), an assertion to a readonly type. Mutable: a record or array
 * literal, a mutable collection constructed, a name bound in the file to one of
 * those, a freeze over a literal with a mutable entry. Unknown: a call's
 * result, a member read, an awaited value, a name the reader does not follow.
 */
const initializerImmutability = (node: AstNode, names: Names): Immutability => {
  const of = (child: unknown): Immutability =>
    initializerImmutability(child as AstNode, names)
  switch (node.type) {
    case "Literal":
    case "TemplateLiteral":
    case "UnaryExpression":
    case "BinaryExpression":
    case "ClassExpression":
      return READONLY
    case "ObjectExpression":
    case "ArrayExpression":
      return mutableBy(node.type)
    case "Identifier": {
      const name = node["name"] as string
      if (name === "undefined" || names.isImmutable(name)) return READONLY
      // the same object as the one it is bound to: a mutable one is mutable
      // here; anything else is not followed
      const bound = names.initOf(name)
      if (bound !== null) {
        const inner = unwrap(bound)
        if (
          inner.type === "ObjectExpression" ||
          inner.type === "ArrayExpression" ||
          (inner.type === "NewExpression" &&
            MUTABLE_CONSTRUCTORS.has(
              (inner["callee"] as AstNode)["name"] as string,
            ))
        )
          return mutableBy("Identifier", name)
      }
      return unknownFor({ kind: "value", form: "Identifier", name })
    }
    case "LogicalExpression":
      return allOf([of(node["left"]), of(node["right"])])
    case "ConditionalExpression":
      return allOf([of(node["consequent"]), of(node["alternate"])])
    case "TSAsExpression":
    case "TSTypeAssertion": {
      const type = node["typeAnnotation"] as AstNode
      if (isConstAssertion(type)) return READONLY
      return typedAs(typeImmutability(type), of(node["expression"]))
    }
    case "ParenthesizedExpression":
    case "TSSatisfiesExpression":
    case "TSNonNullExpression":
      return of(node["expression"])
    case "AwaitExpression":
      return unknownFor({ kind: "value", form: "AwaitExpression", name: null })
    case "MemberExpression":
      return unknownFor({ kind: "value", form: "MemberExpression", name: null })
    case "NewExpression": {
      const callee = calleeText(node["callee"] as AstNode)
      return callee !== null && MUTABLE_CONSTRUCTORS.has(callee)
        ? mutableBy("NewExpression", callee)
        : unknownFor({ kind: "call-result", callee, construct: true })
    }
    case "CallExpression": {
      const callee = node["callee"] as AstNode
      if (!isObjectFreeze(callee))
        return unknownFor({
          kind: "call-result",
          callee: calleeText(callee),
          construct: false,
        })
      // a freeze is one level: what it freezes must hold immutable entries;
      // a name frozen is the very object it is bound to
      const argument = unwrap((node["arguments"] as AstNode[])[0] ?? node)
      if (argument === node)
        return {
          proof: "broken",
          reason: "Object.freeze with nothing to freeze",
        }
      const bound =
        argument.type === "Identifier"
          ? names.initOf(argument["name"] as string)
          : null
      if (argument.type === "Identifier" && bound === null)
        return unknownFor({
          kind: "value",
          form: "Identifier",
          name: argument["name"] as string,
        })
      const frozen = bound === null ? argument : unwrap(bound)
      // a hole reads `undefined`: nothing to prove
      if (frozen.type === "ArrayExpression")
        return allOf((frozen["elements"] as unknown[]).filter(isNode).map(of))
      if (frozen.type === "ObjectExpression")
        return allOf(
          (frozen["properties"] as AstNode[]).map((property) =>
            property.type === "Property"
              ? of(property["value"])
              : unknownFor({
                  kind: "value",
                  form: "SpreadElement",
                  name: null,
                }),
          ),
        )
      return of(frozen)
    }
    default: {
      const form = node.type
      return isFunctionNode(node)
        ? READONLY
        : unknownFor({ kind: "value", form, name: null })
    }
  }
}

/** The annotation on a binding pattern, if written. */
const annotationOf = (pattern: AstNode): AstNode | null => {
  const annotation = pattern["typeAnnotation"]
  return isNode(annotation) ? (annotation["typeAnnotation"] as AstNode) : null
}

/**
 * A declarator's immutability: a `let` or `var` is mutable; a `const` is what
 * its annotation lets it be, or its initializer when it has none — readonly
 * either way when its initializer is. A destructuring pattern binds parts, not
 * the object: readonly when what it destructures is (`const { a } = FROZEN`),
 * its parts unknown otherwise.
 */
const declaratorImmutability = (
  form: string,
  declarator: AstNode,
  names: Names,
): Immutability => {
  if (form !== "const") return mutableBy(form)
  const id = declarator["id"] as AstNode
  // a `const` not declared always has its initializer
  const value = initializerImmutability(declarator["init"] as AstNode, names)
  const annotation = annotationOf(id)
  const typed =
    annotation === null ? value : typedAs(typeImmutability(annotation), value)
  if (id.type === "Identifier" || typed.proof === "readonly") return typed
  return unknownFor({ kind: "value", form: id.type, name: null })
}

const VALUE_RANK: Readonly<Record<ValueKind, number>> = {
  literal: 0,
  tech: 1,
  instance: 2,
  function: 3,
  unknown: 4,
  computed: 5,
}

/** A record or array is its entries' kind: the least allowed of them. */
const joinKinds = (kinds: readonly ValueKind[]): ValueKind =>
  kinds.reduce<ValueKind>(
    (acc, kind) => (VALUE_RANK[kind] > VALUE_RANK[acc] ? kind : acc),
    "literal",
  )

/**
 * Two values one expression may take, joined: the higher kind; an origin and a
 * path only when both carry the same.
 */
const joinResolved = (a: Resolved, b: Resolved): Resolved =>
  a.kind === b.kind &&
  a.origin?.path === b.origin?.path &&
  a.origin?.name === b.origin?.name &&
  a.path.join(".") === b.path.join(".")
    ? a
    : { kind: joinKinds([a.kind, b.kind]), origin: null, path: [] }

/**
 * A type the syntax proves an array: `T[]`, `readonly T[]`, `Array<T>`,
 * `ReadonlyArray<T>`. No alias is followed.
 */
const isArrayType = (type: AstNode): boolean => {
  switch (type.type) {
    case "TSArrayType":
      return true
    case "TSTypeOperator":
      return (
        type["operator"] === "readonly" &&
        (type["typeAnnotation"] as AstNode).type === "TSArrayType"
      )
    case "TSTypeReference": {
      const typeName = type["typeName"] as AstNode
      return (
        typeName.type === "Identifier" &&
        (typeName["name"] === "Array" || typeName["name"] === "ReadonlyArray")
      )
    }
    case "TSParenthesizedType":
      return isArrayType(type["typeAnnotation"] as AstNode)
    default:
      return false
  }
}

/**
 * The type an object type literal gives the member at `path` — how a
 * destructured parameter's annotation types each name. `null` past any other
 * form.
 */
const typeAtPath = (
  type: AstNode | null,
  path: readonly string[],
): AstNode | null => {
  let current = type
  for (const key of path) {
    if (current === null || current.type !== "TSTypeLiteral") return null
    const member = (current["members"] as AstNode[]).find(
      (candidate) =>
        candidate.type === "TSPropertySignature" &&
        candidate["computed"] !== true &&
        (candidate["key"] as AstNode)["name"] === key,
    )
    current = member === undefined ? null : annotationOf(member)
  }
  return current
}

type ImportBinding = {
  specifier: string
  /** The export bound: a name, `"default"`, or `"*"` for a namespace. */
  imported: string
  typeOnly: boolean
}

type Resolved = {
  kind: ValueKind
  origin: InstanceOrigin | null
  /** Member path from the origin's result (`const { cli } = assembly()`). */
  path: readonly string[]
}

type Binding = {
  name: string
  /**
   * A `callback` is an inline callback's parameter: what the callee hands back,
   * a computed value — not the function's own parameter, so a branch on it is
   * no wiring.
   */
  kind: "import" | "definition" | "parameter" | "catch" | "callback"
  span: Span
  import: ImportBinding | null
  /** The declarator's initializer, when the binding came from one. */
  init: AstNode | null
  /** Destructuring path from the initializer's value to this binding. */
  path: readonly string[]
  /** A function or class declared by name. */
  isFunction: boolean
  /** A hook's parameter: what the tech hands the hook. */
  isHookParam: boolean
  /**
   * A callback's parameter: the call the callback was handed to, what hands the
   * value back — `null` for any other binding.
   */
  handedBy: Span | null
  /** The type its annotation writes, when one does. */
  type: AstNode | null
  reassigned: boolean
  /**
   * The result flow of the calls this binding was bound to, shared with them —
   * one call, or one per arm of a conditional initializer.
   */
  results: ResultUse[] | null
  /** The callees of those calls. */
  boundCallees: CalleeKind[]
  /** Bound to a matched config load: a tech value from then on. */
  boundLoad: boolean
  memo: Resolved | null
  resolving: boolean
}

type Scope = { bindings: Map<string, Binding>; parent: Scope | null }

type Ctx =
  | { kind: "argument"; to: CalleeKind }
  | { kind: "returned" }
  | { kind: "condition" }
  | { kind: "entry" }
  | { kind: "reassigned" }
  | { kind: "computed" }
  | { kind: "discarded" }
  | { kind: "destructured" }
  | { kind: "bound"; binding: Binding }
  /** Called on: the receiver of a call. */
  | { kind: "callee" }
  /** A member read off it. */
  | { kind: "member" }

/**
 * The result use a context stands for, at the reference that makes it; a bound
 * context is the binding's.
 */
const useOf = (ctx: Exclude<Ctx, { kind: "bound" }>, span: Span): ResultUse => {
  switch (ctx.kind) {
    case "argument":
      return { kind: "argument", to: ctx.to, span }
    case "returned":
    case "condition":
    case "entry":
    case "reassigned":
    case "computed":
    case "discarded":
    case "member":
      return { kind: ctx.kind, span }
    // its members are taken
    case "destructured":
      return { kind: "member", span }
    case "callee":
      return { kind: "receiver", span }
  }
}

/** The names a binding pattern binds, with the member path to each. */
const patternNames = (
  pattern: AstNode,
  path: readonly string[] = [],
): { name: string; path: readonly string[]; node: AstNode }[] => {
  switch (pattern.type) {
    case "Identifier":
      return [{ name: pattern["name"] as string, path, node: pattern }]
    case "ObjectPattern":
      return (pattern["properties"] as AstNode[]).flatMap((property) => {
        if (property.type === "RestElement")
          return patternNames(property["argument"] as AstNode, path)
        const key = property["key"] as AstNode
        const keyName =
          property["computed"] === true
            ? "[]"
            : key.type === "Identifier"
              ? (key["name"] as string)
              : String(key["value"])
        return patternNames(property["value"] as AstNode, [...path, keyName])
      })
    case "ArrayPattern":
      return (pattern["elements"] as (AstNode | null)[]).flatMap(
        (element, index) =>
          element === null
            ? []
            : patternNames(element, [...path, String(index)]),
      )
    case "AssignmentPattern":
      return patternNames(pattern["left"] as AstNode, path)
    case "RestElement":
      return patternNames(pattern["argument"] as AstNode, path)
    default:
      return []
  }
}

const isStatementLike = (node: AstNode): boolean =>
  node.type.endsWith("Statement") || node.type.endsWith("Declaration")

export const readModule = ({
  program,
  source,
  layer,
  tech,
  importTargetOf,
  isFactory = () => false,
  paramKinds,
  configLoads = [],
}: ReadInput): FileReading => {
  // --- spans -------------------------------------------------------------
  const lineStarts = [0]
  for (let i = 0; i < source.length; i += 1) {
    if (source.charCodeAt(i) === 10) lineStarts.push(i + 1)
  }
  const spanOf = (node: AstNode): Span => {
    let low = 0
    let high = lineStarts.length - 1
    while (low < high) {
      const mid = (low + high + 1) >> 1
      if ((lineStarts[mid] as number) <= node.start) low = mid
      else high = mid - 1
    }
    return {
      start: node.start,
      end: node.end,
      line: low + 1,
      column: node.start - (lineStarts[low] as number) + 1,
    }
  }

  const open: OpenPart[] = []

  // --- scopes ------------------------------------------------------------
  const newBinding = (
    name: string,
    kind: Binding["kind"],
    node: AstNode,
    extra: Partial<Binding> = {},
  ): Binding => ({
    name,
    kind,
    span: spanOf(node),
    import: null,
    init: null,
    path: [],
    isFunction: false,
    isHookParam: false,
    handedBy: null,
    type: annotationOf(node),
    reassigned: false,
    results: null,
    boundCallees: [],
    boundLoad: false,
    memo: null,
    resolving: false,
    ...extra,
  })

  const declare = (scope: Scope, binding: Binding): void => {
    scope.bindings.set(binding.name, binding)
  }

  const lookup = (scope: Scope, name: string): Binding | null => {
    for (let s: Scope | null = scope; s !== null; s = s.parent) {
      const found = s.bindings.get(name)
      if (found) return found
    }
    return null
  }

  /** Declarations a statement makes in the scope holding it. */
  const declareStatement = (scope: Scope, statement: AstNode): void => {
    switch (statement.type) {
      case "ImportDeclaration": {
        const specifier = (statement["source"] as AstNode)["value"] as string
        const typeOnlyAll = statement["importKind"] === "type"
        for (const spec of statement["specifiers"] as AstNode[]) {
          const local = (spec["local"] as AstNode)["name"] as string
          const imported =
            spec.type === "ImportDefaultSpecifier"
              ? "default"
              : spec.type === "ImportNamespaceSpecifier"
                ? "*"
                : (() => {
                    const node = spec["imported"] as AstNode
                    return node.type === "Identifier"
                      ? (node["name"] as string)
                      : String(node["value"])
                  })()
          declare(
            scope,
            newBinding(local, "import", spec, {
              import: {
                specifier,
                imported,
                typeOnly: typeOnlyAll || spec["importKind"] === "type",
              },
            }),
          )
        }
        return
      }
      case "ExportNamedDeclaration":
      case "ExportDefaultDeclaration": {
        const declaration = statement["declaration"]
        if (isNode(declaration)) declareStatement(scope, declaration)
        return
      }
      case "VariableDeclaration":
        for (const declarator of statement["declarations"] as AstNode[]) {
          const init = declarator["init"]
          const initNode = isNode(init) ? init : null
          // dynamic imports and bound `require` read as imports
          const imported = initNode === null ? null : importLikeSource(initNode)
          for (const { name, path, node } of patternNames(
            declarator["id"] as AstNode,
          )) {
            declare(
              scope,
              imported !== null
                ? newBinding(name, "import", node, {
                    import: {
                      specifier: imported,
                      imported: path[0] ?? "*",
                      typeOnly: false,
                    },
                  })
                : newBinding(name, "definition", node, {
                    init: initNode,
                    path,
                    isFunction: path.length === 0 && isFunctionNode(initNode),
                  }),
            )
          }
        }
        return
      case "FunctionDeclaration":
      case "ClassDeclaration":
      case "TSEnumDeclaration": {
        const id = statement["id"]
        if (isNode(id)) {
          declare(
            scope,
            newBinding(id["name"] as string, "definition", id, {
              isFunction: statement.type !== "TSEnumDeclaration",
            }),
          )
        }
        return
      }
      default:
        return
    }
  }

  /** Names assigned anywhere below — a `let` reassigned is computed, wherever. */
  const assignedNames = (node: unknown, out: Set<string>): void => {
    if (Array.isArray(node)) {
      for (const item of node) assignedNames(item, out)
      return
    }
    if (!isNode(node)) return
    if (
      node.type === "AssignmentExpression" ||
      node.type === "UpdateExpression"
    ) {
      const target = unwrap((node["left"] ?? node["argument"]) as AstNode)
      if (target.type === "Identifier") out.add(target["name"] as string)
      else for (const { name } of patternNames(target)) out.add(name)
    }
    for (const [key, value] of Object.entries(node)) {
      if (key !== "type") assignedNames(value, out)
    }
  }

  const declareBlock = (scope: Scope, statements: readonly AstNode[]): void => {
    for (const statement of statements) declareStatement(scope, statement)
    const assigned = new Set<string>()
    assignedNames(statements, assigned)
    for (const name of assigned) {
      const binding = scope.bindings.get(name)
      if (binding && binding.kind === "definition") binding.reassigned = true
    }
  }

  // --- the kinds table ---------------------------------------------------
  const calleeOfImport = (
    binding: ImportBinding,
    members: readonly string[],
  ): { callee: CalleeKind; rest: readonly string[] } => {
    const target = importTargetOf(binding.specifier)
    const name = binding.imported === "*" ? members[0] : binding.imported
    const rest = binding.imported === "*" ? members.slice(1) : members
    if (name === undefined) return { callee: { kind: "unknown" }, rest }
    if (target.kind === "unresolved")
      return { callee: { kind: "unknown" }, rest }
    // a model export — a covered model file's or a pure package's — is a
    // factory when the flavor names it, and a function bound by flow otherwise
    const modelCallee = (path: string): CalleeKind =>
      isFactory(name)
        ? { kind: "factory", layer: "model", path, name }
        : { kind: "model", path, name }
    if (target.kind === "external") {
      const pkg = target.package ?? binding.specifier
      // a crossed claim to a factory kind reads as that kind — trust is the
      // dependency model; a tech's or the project's claim comes first
      const crossed = target.layer
      if (
        target.claim !== "tech" &&
        target.claim !== "reader" &&
        (crossed === "service" ||
          crossed === "adapters" ||
          crossed === "assembly" ||
          crossed === "blob")
      )
        return {
          rest,
          callee: {
            kind: "factory",
            layer: crossed,
            path: binding.specifier,
            name,
          },
        }
      return {
        rest,
        callee:
          target.claim === "tech" || target.claim === "reader"
            ? { kind: "tech", package: pkg }
            : target.claim === "model"
              ? modelCallee(binding.specifier)
              : { kind: "unclaimed", package: pkg },
      }
    }
    const { path, layer } = target
    switch (layer) {
      case "service":
      case "adapters":
      case "assembly":
      case "blob":
        return { rest, callee: { kind: "factory", layer, path, name } }
      case "driver":
        return { rest, callee: { kind: "wiring", path, name } }
      case "model":
        return { rest, callee: modelCallee(path) }
      case "ports":
      case "boot":
      case "test":
        return { rest, callee: { kind: "forbidden-import", layer, path } }
    }
  }

  /** A call's result, by what was called. */
  const resultOf = (callee: CalleeKind): Resolved => {
    switch (callee.kind) {
      case "factory":
        return {
          kind: "instance",
          origin: { path: callee.path, name: callee.name, layer: callee.layer },
          path: [],
        }
      case "local":
        // a local factory builds an instance no factory file traces
        return callee.factory
          ? { kind: "instance", origin: null, path: [] }
          : { kind: "computed", origin: null, path: [] }
      case "tech":
        return { kind: "tech", origin: null, path: [] }
      case "unknown":
        return { kind: "unknown", origin: null, path: [] }
      default:
        return { kind: "computed", origin: null, path: [] }
    }
  }

  const resolveBinding = (binding: Binding): Resolved => {
    if (binding.memo) return binding.memo
    if (binding.resolving) return { kind: "unknown", origin: null, path: [] }
    binding.resolving = true
    const resolved = ((): Resolved => {
      if (binding.reassigned)
        return { kind: "computed", origin: null, path: [] }
      switch (binding.kind) {
        case "import": {
          const target = importTargetOf(binding.import!.specifier)
          return {
            kind:
              target.kind === "external" &&
              (target.claim === "tech" || target.claim === "reader")
                ? "tech"
                : target.kind === "unresolved"
                  ? "unknown"
                  : "function",
            origin: null,
            path: [],
          }
        }
        case "parameter":
          return {
            kind: binding.isHookParam ? "tech" : "unknown",
            origin: null,
            path: [],
          }
        case "catch":
        case "callback":
          return { kind: "computed", origin: null, path: [] }
        case "definition": {
          if (binding.isFunction)
            return { kind: "function", origin: null, path: [] }
          if (binding.init === null)
            return { kind: "computed", origin: null, path: [] }
          const value = evaluate(binding.init, { kind: "computed" }, false)
          if (binding.path.length === 0) return value
          // destructured: a member of the initializer's value
          switch (value.kind) {
            case "instance":
              return {
                kind: "instance",
                origin: value.origin,
                path: [...value.path, ...binding.path],
              }
            case "tech":
            case "literal":
              return { kind: value.kind, origin: null, path: [] }
            default:
              return { kind: "computed", origin: null, path: [] }
          }
        }
      }
    })()
    binding.resolving = false
    binding.memo = resolved
    return resolved
  }

  // --- the walk ----------------------------------------------------------
  type Body = { statements: ReadStatement[]; hooks: ReadHook[] }

  let scope: Scope = { bindings: new Map(), parent: null }
  let body: Body = { statements: [], hooks: [] }
  /**
   * The frame a `return` belongs to: `null` for a function of the file's own
   * (emitted as a `return` statement); for a body read inline — a callback, or
   * a tracked local at one of its sites — the context its value flows to, and
   * what it returned, which is the inlined call's value.
   */
  type Frame = { ctx: Ctx; value: Resolved | null; returns: number }
  let frame: Frame | null = null

  const withFrame = (ctx: Ctx | null, run: () => void): Frame | null => {
    const outer = frame
    frame = ctx === null ? null : { ctx, value: null, returns: 0 }
    const inner = frame
    try {
      run()
      return inner
    } finally {
      frame = outer
    }
  }

  /**
   * Tracked locals — non-exported top-level functions every reference to which
   * is a direct call in this file (rixo, 2026-09-17): the reader sees all of
   * it, so each is read at its sites as the site's own code and is no function
   * of the file. Keyed by the root binding, so a shadowing local is never taken
   * for one. Filled once the root scope is declared. Each carries the scope it
   * was written in: what its body's free variables resolve against, wherever
   * the body is read.
   */
  const tracked = new Map<Binding, { fn: AstNode; scope: Scope }>()
  /** The tracked locals being read at a site: a call to one reads `local`. */
  const inlining = new Set<Binding>()
  /**
   * The outermost tracked-local call whose body is being read: the site a call
   * read inside it runs from on import. `null` outside any.
   */
  let inlineSite: Span | null = null
  /**
   * An inlined call's value by call node — a binding's initializer is evaluated
   * again, without emitting, when the binding resolves.
   */
  const inlineMemo = new Map<AstNode, Resolved>()

  /**
   * A scope for the run, under the given parent. A body read where it was
   * written takes the scope it sits in (`inScope`); a body read somewhere else
   * takes the scope it was written in — an inlined body's free variables never
   * resolve against the scope that adopts it, however deep the site sits.
   */
  const inScopeOf = <T>(
    parent: Scope,
    bindings: Binding[],
    run: () => T,
  ): T => {
    const outer = scope
    scope = { bindings: new Map(bindings.map((b) => [b.name, b])), parent }
    try {
      return run()
    } finally {
      scope = outer
    }
  }

  const inScope = <T>(bindings: Binding[], run: () => T): T =>
    inScopeOf(scope, bindings, run)

  const inBody = (run: () => void): Body => {
    const outer = body
    body = { statements: [], hooks: [] }
    try {
      run()
      return body
    } finally {
      body = outer
    }
  }

  const emit = (statement: ReadStatement): void => {
    body.statements.push(statement)
  }

  /**
   * Reads of the machine — a tech value read, not called; the clock; the
   * entropy source — made while a binding's initializer is evaluated, in its
   * own body and the callbacks read inline into it. A call's result is not a
   * read: the call is judged where it sits.
   */
  let machineReads = 0
  let readsInto: Body | null = null

  const countRead = (emitting: boolean): void => {
    if (emitting && body === readsInto) machineReads += 1
  }

  /** Whether running `evaluateInit` read the machine. */
  const readsMachine = (evaluateInit: () => void): boolean => {
    const outer = readsInto
    const before = machineReads
    readsInto = body
    try {
      evaluateInit()
    } finally {
      readsInto = outer
    }
    return machineReads > before
  }

  /**
   * A binding whose tech value is a read: an import or a hook's parameter, a
   * loop's element of what it iterates, or a definition bound to a read (`const
   * env = process.env`), never to a call.
   */
  const holdsRead = (binding: Binding): boolean => {
    if (
      binding.kind === "import" ||
      binding.kind === "parameter" ||
      binding.kind === "callback"
    )
      return true
    // past those, only a definition with an initializer resolves to tech
    // (resolveBinding): a catch binding is computed, a callback's is unless it
    // is a loop's element, and so is a definition without an initializer
    const init = unwrap(binding.init as AstNode)
    return (
      init.type !== "CallExpression" &&
      init.type !== "NewExpression" &&
      init.type !== "TaggedTemplateExpression"
    )
  }

  /** `Date.now()`, `new Date()`, `Math.random()`: the clock and entropy. */
  const isMachineCall = (node: AstNode): boolean => {
    const callee = unwrap(node["callee"] as AstNode)
    if (node.type === "NewExpression")
      return (
        callee.type === "Identifier" &&
        callee["name"] === "Date" &&
        (node["arguments"] as AstNode[]).length === 0 &&
        lookup(scope, "Date") === null
      )
    if (callee.type !== "MemberExpression" || callee["computed"] === true)
      return false
    const object = unwrap(callee["object"] as AstNode)
    if (object.type !== "Identifier") return false
    const name = object["name"] as string
    const member = (callee["property"] as AstNode)["name"]
    return (
      lookup(scope, name) === null &&
      ((name === "Date" && member === "now") ||
        (name === "Math" && member === "random"))
    )
  }

  const recordUse = (
    binding: Binding,
    ctx: Ctx,
    members: readonly string[],
    at: AstNode,
  ): void => {
    if (binding.results === null || ctx.kind === "bound") return
    const span = spanOf(at)
    if (members.length > 0) binding.results.push({ kind: "member", span })
    binding.results.push(useOf(ctx, span))
  }

  /** A reference chain: its root and the member names read off it. */
  const chainOf = (
    node: AstNode,
  ): { root: AstNode; members: string[]; computed: AstNode[] } => {
    const members: string[] = []
    const computed: AstNode[] = []
    let current = unwrap(node)
    while (current.type === "MemberExpression") {
      const property = current["property"] as AstNode
      if (current["computed"] === true) {
        computed.push(property)
        members.unshift("[]")
      } else {
        // an identifier or a private name — both carry the name
        members.unshift(property["name"] as string)
      }
      current = unwrap(current["object"] as AstNode)
    }
    return { root: current, members, computed }
  }

  /**
   * Whether a callee or a value starts, through members and calls
   * (`describe.each(rows)` starts from `describe`), from an import the file's
   * own reader claims.
   */
  const startsFromReader = (node: AstNode): boolean => {
    let current = unwrap(node)
    while (
      current.type === "MemberExpression" ||
      current.type === "CallExpression"
    ) {
      current = unwrap(
        (current.type === "MemberExpression"
          ? current["object"]
          : current["callee"]) as AstNode,
      )
    }
    if (current.type !== "Identifier") return false
    const binding = lookup(scope, current["name"] as string)
    if (binding === null || binding.kind !== "import") return false
    const target = importTargetOf(binding.import!.specifier)
    return target.kind === "external" && target.claim === "reader"
  }

  /** Whether the file's own reader exempts registrations into its tech. */
  const registers = tech !== null && tech.exempts.includes("registration")

  /**
   * The value kind at the root of an assignment target: a binding's own kind (a
   * reassigned `let` or parameter reads computed), a free name's (a host global
   * is the tech), the root of a member chain (`ctx.body = …` writes tech-held
   * state when `ctx` is a hook's parameter), `computed` for a destructuring
   * pattern.
   */
  const assignmentTargetKind = (target: AstNode): ValueKind => {
    const root =
      target.type === "MemberExpression" ? chainOf(target).root : target
    if (root.type === "Identifier") {
      const name = root["name"] as string
      const binding = lookup(scope, name)
      if (binding === null)
        return LANGUAGE_GLOBALS.has(name) ? "computed" : "tech"
      return resolveBinding(binding).kind
    }
    if (root.type === "ObjectPattern" || root.type === "ArrayPattern")
      return "computed"
    return evaluate(root, { kind: "computed" }, false).kind
  }

  const memberCallee = (
    root: Resolved,
    members: readonly string[],
  ): CalleeKind => {
    switch (root.kind) {
      case "instance":
        return {
          kind: "use-case",
          member: [...root.path, ...members].join("."),
          origin: root.origin,
        }
      // the name cannot prove what the tech value is: a call on it is the
      // tech's, `.trim()` as much as `.get()` (ruled 2026-09-26)
      case "tech":
        return { kind: "tech", package: null }
      case "unknown":
        return { kind: "unknown" }
      default:
        return { kind: "language" }
    }
  }

  /** What a call calls: a tagged template's tag, any other call's callee. */
  const calleeNodeOf = (node: AstNode): AstNode =>
    (node.type === "TaggedTemplateExpression"
      ? node["tag"]
      : node["callee"]) as AstNode

  /**
   * The call whose result a callee calls: the root of its member chain, when
   * that root is a call — `import()` included, a call into the loader.
   */
  const calleeCallOf = (node: AstNode): Span | null => {
    const { root } = chainOf(node)
    return CALL_FORMS.has(root.type) ? spanOf(root) : null
  }

  /**
   * A member of an import, called: `mongoose.connect()`, `fs.readFileSync()`. A
   * call on what an unclaimed package gave is the package's, as the same on the
   * tech is the tech's.
   */
  const memberOfImport = (
    callee: CalleeKind,
    rest: readonly string[],
  ): CalleeKind =>
    callee.kind === "unclaimed" ? callee : memberCallee(resultOf(callee), rest)

  /** The callee kind of a call, walking the chain's root as needed. */
  const calleeOf = (node: AstNode, emitting: boolean): CalleeKind => {
    const { root, members, computed } = chainOf(node)
    for (const property of computed)
      evaluate(property, { kind: "computed" }, emitting)
    if (root.type === "Identifier") {
      const name = root["name"] as string
      const binding = lookup(scope, name)
      if (binding === null) {
        if (LANGUAGE_GLOBALS.has(name)) return { kind: "language" }
        // a host global: the host is the tech, and so is any call on it
        return { kind: "tech", package: null }
      }
      // called on, through its members or itself: its receiver — the call is
      // judged as a call
      if (emitting) recordUse(binding, { kind: "callee" }, [], node)
      if (binding.kind === "import") {
        const { callee, rest } = calleeOfImport(binding.import!, members)
        if (rest.length === 0) return callee
        return memberOfImport(callee, rest)
      }
      const resolved = resolveBinding(binding)
      if (members.length === 0) {
        if (binding.isFunction)
          return { kind: "local", name, factory: isFactory(name) }
        if (resolved.kind === "instance")
          return {
            kind: "use-case",
            member: resolved.path.join(".") || name,
            origin: resolved.origin,
          }
        if (resolved.kind === "tech") return { kind: "tech", package: null }
        if (resolved.kind === "unknown") return { kind: "unknown" }
        return { kind: "language" }
      }
      return memberCallee(resolved, members)
    }
    if (root.type === "ImportExpression") {
      const value = evaluate(root, { kind: "computed" }, emitting)
      const specifier = literalSourceOf(root)
      // a non-literal specifier: the promise of a module the reader cannot
      // name, a computed value — its members are the language's
      if (specifier === null) return memberCallee(value, members)
      const { callee, rest } = calleeOfImport(
        { specifier, imported: "*", typeOnly: false },
        members,
      )
      return rest.length === 0 ? callee : memberOfImport(callee, rest)
    }
    // any other root — a call's result, an expression — is classified by its
    // value kind, called inline or through a member chain
    // (`cac().command("x").action(cb)`, `services[name]()`): an instance
    // called is a use case with the member unknown, a tech value the tech, a
    // computed or literal value the language; `unknown` only for a value of
    // kind unknown (`this`, a binding through itself)
    if (
      root.type === "CallExpression" ||
      root.type === "NewExpression" ||
      root.type === "TaggedTemplateExpression"
    ) {
      const value = evaluateCall(root, { kind: "callee" }, emitting)
      // what an unclaimed package's call returned is the package's:
      // `@Injectable()` applies its decorator, `cac("x").option(…)` calls
      // its method
      const made = calleeOf(calleeNodeOf(root), false)
      return made.kind === "unclaimed" ? made : memberCallee(value, members)
    }
    return memberCallee(evaluate(root, { kind: "computed" }, emitting), members)
  }

  /** `import("./x")` or `require("./x")` (the host's, unbound): the specifier. */
  const importLikeSource = (init: AstNode): string | null => {
    const inner = unwrap(init)
    if (inner.type === "ImportExpression") return literalSourceOf(inner)
    if (inner.type !== "CallExpression") return null
    const callee = unwrap(inner["callee"] as AstNode)
    if (callee.type !== "Identifier" || callee["name"] !== "require")
      return null
    if (lookup(scope, "require") !== null) return null
    const [arg] = inner["arguments"] as AstNode[]
    return arg !== undefined &&
      arg.type === "Literal" &&
      typeof arg["value"] === "string"
      ? arg["value"]
      : null
  }

  const literalSourceOf = (importExpression: AstNode): string | null => {
    const src = unwrap(importExpression["source"] as AstNode)
    return src.type === "Literal" && typeof src["value"] === "string"
      ? src["value"]
      : null
  }

  const readHook = (fn: AstNode, registeredBy: ReadCall): ReadHook => {
    const params = (fn["params"] as AstNode[]).flatMap((param) =>
      patternNames(param).map(({ name, node }) =>
        newBinding(name, "parameter", node, { isHookParam: true }),
      ),
    )
    const inner = inScope(params, () =>
      inBody(() => withFrame(null, () => walkFunctionBody(fn))),
    )
    return {
      span: spanOf(fn),
      registeredBy,
      body: inner.statements,
      hooks: inner.hooks,
    }
  }

  /**
   * A callback read inline — handed to a callee that is not the tech's, or in
   * an inside kind: its statements are the enclosing body's, its parameters
   * computed values (what the language or the inside hands back — a tech's hook
   * parameter is the one tech-held case, and that is the cut) handed back by
   * the call it was handed to, which answers for them; what it returns goes to
   * the callee it was handed to.
   */
  const readInline = (
    fn: AstNode,
    callee: CalleeKind,
    handedBy: Span | null,
  ): void => {
    const params = (fn["params"] as AstNode[]).flatMap((param) =>
      patternNames(param).map(({ name, node }) =>
        newBinding(name, "callback", node, { handedBy }),
      ),
    )
    const returned: Ctx = { kind: "argument", to: callee }
    inScope(params, () =>
      withFrame(returned, () => {
        const fnBody = fn["body"] as AstNode
        if (fnBody.type === "BlockStatement")
          walkBlock(fnBody["body"] as AstNode[])
        else evaluate(fnBody, returned, true)
      }),
    )
  }

  /**
   * A tracked local read at one of its sites, as if its body were the site's
   * text: each argument is evaluated as bound to its parameter — a call's
   * result flow becomes the parameter's, a binding handed over shares its flow
   * with the parameter, so what the body does with it is recorded on the
   * caller's binding; a missing argument is `undefined`, a literal; a callback
   * is read at the site. Its statements are the site's body's, its hooks
   * registered where the site sits, its `return` value the call's — one
   * return's value, `undefined` for none, computed for several. A call to a
   * tracked local from inside one being read (recursion, or two locals calling
   * each other) is not read again: it reads `local`.
   *
   * The arguments are the site's text and are evaluated in the site's scope;
   * the body is the callee's and is read in the scope it was written in. A
   * local or parameter at the site that shadows a name the body reads never
   * captures it.
   *
   * An immediately invoked function is read the same way, its site the call
   * that invokes it, with no binding: nothing else can call it.
   */
  const inlineLocal = (
    local: { fn: AstNode; scope: Scope },
    binding: Binding | null,
    argNodes: readonly AstNode[],
    callee: CalleeKind,
    ctx: Ctx,
    site: Span,
  ): Resolved => {
    const { fn } = local
    const byPosition = (fn["params"] as AstNode[]).map((param) =>
      patternNames(param).map(({ name, path, node }) => ({
        target: newBinding(name, "parameter", node),
        path,
      })),
    )
    const params = byPosition.flat().map(({ target }) => target)
    /**
     * An argument bound to the parameter names it reaches: by key through a
     * record literal handed to a destructuring pattern (`{ cli: process }`
     * binds `cli` to the tech, not to the record's joined kind); otherwise the
     * whole value, evaluated as bound to the first name — a call's result flow
     * becomes the name's — and a binding handed over shares its flow with every
     * name it reaches.
     */
    const bindArgument = (
      node: AstNode,
      targets: readonly { target: Binding; path: readonly string[] }[],
    ): void => {
      const inner = unwrap(node)
      if (
        inner.type === "ObjectExpression" &&
        targets.length > 0 &&
        targets.every(({ path }) => path.length > 0)
      ) {
        for (const property of inner["properties"] as AstNode[]) {
          if (property.type === "SpreadElement") {
            evaluate(
              property["argument"] as AstNode,
              { kind: "computed" },
              true,
            )
            continue
          }
          const key = property["key"] as AstNode
          const computedKey = property["computed"] === true
          if (computedKey) evaluate(key, { kind: "computed" }, true)
          const name = computedKey
            ? null
            : key.type === "Identifier"
              ? (key["name"] as string)
              : String(key["value"])
          const reached = targets.flatMap(({ target, path }) =>
            name !== null && path[0] === name
              ? [{ target, path: path.slice(1) }]
              : [],
          )
          if (reached.length === 0)
            evaluate(property["value"] as AstNode, { kind: "discarded" }, true)
          else bindArgument(property["value"] as AstNode, reached)
        }
        // a name the record does not carry stays `undefined`, a literal
        return
      }
      const first = targets[0]?.target
      let value: Resolved
      if (isFunctionNode(inner)) {
        readInline(inner, callee, null)
        value = { kind: "function", origin: null, path: [] }
      } else {
        // an argument no parameter receives is evaluated and dropped
        value = evaluate(
          node,
          first === undefined
            ? { kind: "discarded" }
            : { kind: "bound", binding: first },
          true,
        )
      }
      const handed =
        inner.type === "Identifier"
          ? lookup(scope, inner["name"] as string)
          : null
      for (const { target, path } of targets) {
        target.memo = {
          kind: value.kind,
          origin: value.origin,
          path: [...value.path, ...path],
        }
        if (first !== undefined && target !== first) {
          target.results = first.results
          target.boundCallees = first.boundCallees
          target.boundLoad = first.boundLoad
        }
        if (handed !== null && handed.results !== null) {
          target.results = handed.results
          target.boundLoad = handed.boundLoad
        }
      }
    }
    argNodes.forEach((arg, index) => {
      const targets = byPosition[index] ?? []
      if (arg.type === "SpreadElement") {
        evaluate(arg["argument"] as AstNode, { kind: "computed" }, true)
        for (const { target } of targets)
          target.memo = { kind: "computed", origin: null, path: [] }
        return
      }
      bindArgument(arg, targets)
    })
    for (const target of params)
      if (target.memo === null)
        target.memo = { kind: "literal", origin: null, path: [] }
    if (binding !== null) inlining.add(binding)
    const outerSite = inlineSite
    inlineSite ??= site
    try {
      return inScopeOf(local.scope, params, () => readBodyValue(fn, ctx))
    } finally {
      if (binding !== null) inlining.delete(binding)
      inlineSite = outerSite
    }
  }

  const walkFunctionBody = (fn: AstNode): void => {
    const fnBody = fn["body"] as AstNode
    if (fnBody.type === "BlockStatement") {
      walkBlock(fnBody["body"] as AstNode[])
    } else {
      emitReturn(fnBody, spanOf(fnBody))
    }
  }

  /**
   * A return: the value's kind and, for a record literal, its entries — what an
   * assembly hands back, so a driver's use cases trace to their service.
   */
  const emitReturn = (argument: AstNode | null, span: Span): void => {
    if (argument === null) {
      emit({ kind: "return", value: null, record: null, span })
      return
    }
    const inner = unwrap(argument)
    // the value first, emitting: an entry read after it finds what its calls
    // and loops were read to
    const value = evaluate(argument, { kind: "returned" }, true)
    const record = inner.type === "ObjectExpression" ? entriesOf(inner) : null
    emit({ kind: "return", value: value.kind, record, span })
  }

  /**
   * A record literal's entries, each as an argument would be passed — read
   * without emitting: the record's own evaluation emits its calls. A spread is
   * one entry, keyed `...`; a computed key names none.
   */
  const entriesOf = (record: AstNode): { key: string; value: ArgValue }[] =>
    (record["properties"] as AstNode[]).flatMap((property) => {
      if (property.type === "SpreadElement")
        return [
          {
            key: "...",
            value: argValueOf(
              property["argument"] as AstNode,
              { kind: "entry" },
              false,
            ),
          },
        ]
      if (property["computed"] === true) return []
      const key = property["key"] as AstNode
      return [
        {
          key:
            typeof key["name"] === "string"
              ? key["name"]
              : String(key["value"]),
          value: argValueOf(
            property["value"] as AstNode,
            { kind: "entry" },
            false,
          ),
        },
      ]
    })

  /**
   * A value as passed: its kind, a record's entries, the call it is the result
   * of, and whether the function received it.
   */
  const argValueOf = (node: AstNode, ctx: Ctx, emitting: boolean): ArgValue => {
    const value = evaluate(node, ctx, emitting)
    const inner = unwrap(node)
    return {
      kind: value.kind,
      origin: value.origin,
      path: value.path,
      entries: inner.type === "ObjectExpression" ? entriesOf(inner) : null,
      from: fromOf(inner),
      received: receivedOf(inner),
      host: value.kind === "tech" && hostOf(inner),
      span: spanOf(node),
    }
  }

  /** A value with nothing to say past its kind: a function, a spread. */
  const plainArg = (kind: ValueKind, node: AstNode): ArgValue => ({
    kind,
    origin: null,
    path: [],
    entries: null,
    from: null,
    received: false,
    host: false,
    span: spanOf(node),
  })

  /**
   * The call a value is the result of: the value itself, past the wrappers, a
   * `const` bound whole to one — never a part of one, destructured — or a
   * callback's parameter, handed back by the call the callback was handed to.
   */
  const fromOf = (inner: AstNode): Span | null => {
    if (CALL_FORMS.has(inner.type)) return spanOf(inner)
    if (inner.type !== "Identifier") return null
    const binding = lookup(scope, inner["name"] as string)
    if (binding?.kind === "callback") return binding.handedBy
    if (
      binding === null ||
      binding.kind !== "definition" ||
      binding.reassigned ||
      binding.init === null ||
      binding.path.length > 0
    )
      return null
    const init = unwrap(binding.init)
    return CALL_FORMS.has(init.type) ? spanOf(init) : null
  }

  /** The function's own parameter, or a member of one. */
  /**
   * A tech value that reads the host: the root of its chain is a free name —
   * one the language defines never reads as tech — directly or through a
   * `const` bound to such a read, never to a call, judged where it sits.
   */
  const hostOf = (inner: AstNode): boolean => {
    const { root } = chainOf(inner)
    if (root.type !== "Identifier") return false
    const binding = lookup(scope, root["name"] as string)
    if (binding === null) return true
    if (
      binding.kind !== "definition" ||
      binding.reassigned ||
      binding.init === null
    )
      return false
    return hostOf(unwrap(binding.init))
  }

  const receivedOf = (inner: AstNode): boolean => {
    const { root } = chainOf(inner)
    if (root.type !== "Identifier") return false
    return lookup(scope, root["name"] as string)?.kind === "parameter"
  }

  /**
   * A call's arguments, evaluated in order, as passed. The cut happens here: a
   * function handed to a tech callee is a hook, in an outside-kind file. Handed
   * to anything else — the language, a use case, a local — or in an inside
   * kind, where hooks are no concept, it is read inline: its calls count where
   * the callback sits.
   */
  const readArgs = (
    argNodes: readonly AstNode[],
    callee: CalleeKind,
    registeredBy: ReadCall,
    emitting: boolean,
  ): ArgValue[] => {
    const args: ArgValue[] = []
    for (const arg of argNodes) {
      const inner = unwrap(arg)
      if (isFunctionNode(inner)) {
        args.push(plainArg("function", arg))
        if (!emitting) continue
        if (callee.kind === "tech" && tech !== null)
          body.hooks.push(readHook(inner, registeredBy))
        else readInline(inner, callee, registeredBy.span)
        continue
      }
      if (arg.type === "SpreadElement") {
        evaluate(arg["argument"] as AstNode, { kind: "computed" }, emitting)
        args.push(plainArg("computed", arg))
        continue
      }
      args.push(argValueOf(arg, { kind: "argument", to: callee }, emitting))
    }
    return args
  }

  /**
   * Where a call's result goes: a bound result's flow is its binding's uses,
   * filled as they come; an unbound one reaches its own position only, the
   * call's `span`.
   */
  const resultsOf = (ctx: Ctx, callee: CalleeKind, span: Span): ResultUse[] => {
    if (ctx.kind !== "bound") return [useOf(ctx, span)]
    const results = ctx.binding.results ?? []
    ctx.binding.results = results
    ctx.binding.boundCallees.push(callee)
    return results
  }

  /**
   * A call into the reading, when emitting — a pass that only classifies emits
   * nothing; a callee the reader cannot place is open at its own span.
   */
  const emitCall = (
    call: ReadCall,
    calleeSpan: Span,
    emitting: boolean,
  ): void => {
    if (!emitting) return
    if (call.callee.kind === "unknown")
      open.push({ span: calleeSpan, why: "unknown-callee" })
    emit({ kind: "call", call })
  }

  /**
   * A `.map(callback)` call: its receiver and its callback; `null` for any
   * other call.
   */
  const mapCallOf = (
    node: AstNode,
    calleeNode: AstNode,
    argNodes: readonly AstNode[],
  ): { receiver: AstNode; fn: AstNode } | null => {
    const callee = unwrap(calleeNode)
    const fn = argNodes[0] === undefined ? null : unwrap(argNodes[0])
    if (
      node.type !== "CallExpression" ||
      callee.type !== "MemberExpression" ||
      callee["computed"] === true ||
      (callee["property"] as AstNode)["name"] !== "map" ||
      fn === null ||
      !isFunctionNode(fn)
    )
      return null
    return { receiver: unwrap(callee["object"] as AstNode), fn }
  }

  /** An array literal, or a name whose annotation writes an array type. */
  const provesArray = (receiver: AstNode): boolean => {
    if (receiver.type === "ArrayExpression") return true
    if (receiver.type !== "Identifier") return false
    const type = lookup(scope, receiver["name"] as string)?.type ?? null
    return type !== null && isArrayType(type)
  }

  /**
   * A loop's callback, read inline: its first parameter an element of what it
   * iterates, its value what it returns — the one return's, `undefined` for
   * none, computed for several — reaching where the loop's value goes.
   */
  const readLoop = (fn: AstNode, over: Resolved, ctx: Ctx): Resolved => {
    const [first, ...rest] = fn["params"] as AstNode[]
    const params = [
      ...(first === undefined ? [] : patternNames(first)).map(
        ({ name, node, path }) =>
          newBinding(name, "callback", node, {
            memo: {
              kind: over.kind,
              origin: over.origin,
              path: [...over.path, ...path],
            },
          }),
      ),
      ...rest.flatMap((param) =>
        patternNames(param).map(({ name, node }) =>
          newBinding(name, "callback", node),
        ),
      ),
    ]
    return inScope(params, () => readBodyValue(fn, ctx))
  }

  /**
   * A function's body read inline, its returns reaching `ctx`; what it gives
   * back: its expression's value, or the one return's — `undefined` for none,
   * computed for several.
   */
  const readBodyValue = (fn: AstNode, ctx: Ctx): Resolved => {
    let expression: Resolved | null = null
    const frame = withFrame(ctx, () => {
      const fnBody = fn["body"] as AstNode
      if (fnBody.type === "BlockStatement")
        walkBlock(fnBody["body"] as AstNode[])
      else expression = evaluate(fnBody, ctx, true)
    }) as Frame
    if (expression !== null) return expression
    if (frame.returns === 1 && frame.value !== null) return frame.value
    return frame.returns === 0
      ? { kind: "literal", origin: null, path: [] }
      : { kind: "computed", origin: null, path: [] }
  }

  const evaluateCall = (
    node: AstNode,
    ctx: Ctx,
    emitting: boolean,
  ): Resolved => {
    // an inlined call, evaluated again for a binding's resolution: its value
    const memo = inlineMemo.get(node)
    if (!emitting && memo !== undefined) return memo
    const isTagged = node.type === "TaggedTemplateExpression"
    const calleeNode = calleeNodeOf(node)
    const argNodes = isTagged
      ? ((node["quasi"] as AstNode)["expressions"] as AstNode[])
      : (node["arguments"] as AstNode[])
    const invoked = unwrap(calleeNode)
    if (emitting && isFunctionNode(invoked) && node.type === "CallExpression") {
      // an immediately invoked function: its body runs here, read at the site
      const value = inlineLocal(
        { fn: invoked, scope },
        null,
        argNodes,
        { kind: "language" },
        ctx,
        spanOf(node),
      )
      inlineMemo.set(node, value)
      return value
    }
    const mapped = mapCallOf(node, calleeNode, argNodes)
    if (emitting && mapped !== null && provesArray(mapped.receiver)) {
      // `Array.prototype.map` over a proven array: a loop, the callback's body
      // its arm, its value what the callback returns
      const over = evaluate(mapped.receiver, { kind: "computed" }, false)
      let value: Resolved = { kind: "computed", origin: null, path: [] }
      const outer = body
      emitControl(
        node,
        mapped.receiver,
        [
          () => {
            // the arm runs where the loop sits: a read of the machine in it is
            // stored where the loop's value is
            const reads = readsInto
            if (readsInto === outer) readsInto = body
            try {
              value = readLoop(mapped.fn, over, ctx)
            } finally {
              readsInto = reads
            }
          },
        ],
        true,
      )
      inlineMemo.set(node, value)
      return value
    }
    const classified = calleeOf(calleeNode, emitting)
    // `.map(callback)` on what the reader cannot prove an array: a loop cannot
    // be told from a call on the tech — unknown, never presumed either way
    const callee: CalleeKind =
      mapped !== null &&
      (classified.kind === "tech" || classified.kind === "unclaimed")
        ? { kind: "unknown" }
        : classified
    if (emitting && callee.kind === "local") {
      // a local callee is a binding of this scope by construction
      const binding = lookup(scope, callee.name) as Binding
      const local = tracked.get(binding)
      if (local !== undefined && !inlining.has(binding)) {
        const value = inlineLocal(
          local,
          binding,
          argNodes,
          callee,
          ctx,
          spanOf(node),
        )
        inlineMemo.set(node, value)
        return value
      }
    }
    const results = resultsOf(ctx, callee, spanOf(node))
    const load = callee.kind === "use-case" ? loadOf(callee) : null
    if (ctx.kind === "bound" && load !== null) ctx.binding.boundLoad = true
    const call: ReadCall = {
      span: spanOf(node),
      callee,
      args: [],
      result: results,
      load,
      registration:
        registers && callee.kind === "tech" && startsFromReader(calleeNode),
      handsRunner:
        registers && argNodes.length > 0 && argNodes.every(startsFromReader),
      site: inlineSite,
      calleeCall: calleeCallOf(calleeNode),
    }
    call.args = readArgs(argNodes, callee, call, emitting)
    emitCall(call, spanOf(calleeNode), emitting)
    // a matched load's result counts as a tech value from then on
    return load === null
      ? resultOf(callee)
      : { kind: "tech", origin: null, path: [] }
  }

  /**
   * The declared load a use-case call matches: by the member's name, and by
   * file when the instance is traced to a factory that is not an assembly's
   * returned record — an assembly's origin says nothing about the service.
   */
  const loadOf = (
    callee: Extract<CalleeKind, { kind: "use-case" }>,
  ): { file: string; name: string } | null => {
    const name = callee.member.split(".").at(-1)
    const origin = callee.origin
    return (
      configLoads.find(
        (load) =>
          load.name === name &&
          (origin === null ||
            origin.layer === "assembly" ||
            origin.path === load.file),
      ) ?? null
    )
  }

  const evaluateChildren = (node: AstNode, emitting: boolean): void => {
    for (const [key, value] of Object.entries(node)) {
      if (key === "type") continue
      const children = Array.isArray(value) ? value : [value]
      for (const child of children) {
        if (!isNode(child)) continue
        if (isStatementLike(child)) walkStatement(child)
        else if (!child.type.startsWith("TS"))
          evaluate(child, { kind: "computed" }, emitting)
      }
    }
  }

  /** The origin of a condition's test: a parameter, an instance, or other. */
  const testOriginOf = (
    node: AstNode,
  ): "parameter" | "load" | "instance" | "other" => {
    const inner = unwrap(node)
    switch (inner.type) {
      case "UnaryExpression":
        return testOriginOf(inner["argument"] as AstNode)
      case "BinaryExpression":
      case "LogicalExpression": {
        const left = testOriginOf(inner["left"] as AstNode)
        const right = testOriginOf(inner["right"] as AstNode)
        if (left === "instance" || right === "instance") return "instance"
        if (left === "parameter" || right === "parameter") return "parameter"
        return "other"
      }
      case "Identifier":
      case "MemberExpression": {
        const { root } = chainOf(inner)
        if (root.type === "Identifier") {
          const binding = lookup(scope, root["name"] as string)
          if (binding === null) return "other"
          if (binding.kind === "parameter") return "parameter"
          if (binding.boundLoad) return "load"
          const resolved = resolveBinding(binding)
          if (resolved.kind === "instance") return "instance"
          // a value computed from an instance: bound to a use-case call
          if (binding.boundCallees.some((bound) => bound.kind === "use-case"))
            return "instance"
          return "other"
        }
        if (root.type === "CallExpression" || root.type === "NewExpression") {
          return calleeOf(root["callee"] as AstNode, false).kind === "use-case"
            ? "instance"
            : "other"
        }
        return "other"
      }
      case "CallExpression":
      case "NewExpression":
        return calleeOf(inner["callee"] as AstNode, false).kind === "use-case"
          ? "instance"
          : "other"
      default:
        return "other"
    }
  }

  const emitControl = (
    node: AstNode,
    test: AstNode | null,
    arms: (() => void)[],
    emitting: boolean,
  ): void => {
    const testKind =
      test === null
        ? "literal"
        : evaluate(test, { kind: "condition" }, emitting).kind
    const testOrigin = test === null ? "other" : testOriginOf(test)
    const read = arms.map((arm) => inBody(arm))
    if (!emitting) return
    for (const armBody of read) body.hooks.push(...armBody.hooks)
    emit({
      kind: "control",
      test: testKind,
      testOrigin,
      arms: read.map((armBody) => armBody.statements),
      span: spanOf(node),
    })
  }

  const evaluate = (node: AstNode, ctx: Ctx, emitting: boolean): Resolved => {
    const computed: Resolved = { kind: "computed", origin: null, path: [] }
    const unknown: Resolved = { kind: "unknown", origin: null, path: [] }
    const literal: Resolved = { kind: "literal", origin: null, path: [] }
    if (WRAPPERS.has(node.type)) return evaluate(unwrap(node), ctx, emitting)
    switch (node.type) {
      case "Literal":
        return literal
      case "TemplateLiteral": {
        const expressions = node["expressions"] as AstNode[]
        if (expressions.length === 0) return literal
        for (const expression of expressions)
          evaluate(expression, { kind: "computed" }, emitting)
        return computed
      }
      case "Identifier": {
        const name = node["name"] as string
        const binding = lookup(scope, name)
        if (binding === null) {
          if (LITERAL_GLOBALS.has(name)) return literal
          if (LANGUAGE_GLOBALS.has(name) || LOCATION_GLOBALS.has(name))
            return computed
          countRead(emitting)
          return { kind: "tech", origin: null, path: [] }
        }
        if (emitting) recordUse(binding, ctx, [], node)
        const resolved = resolveBinding(binding)
        if (resolved.kind === "tech" && holdsRead(binding)) countRead(emitting)
        return resolved
      }
      case "MemberExpression": {
        const { root, members, computed: computedProps } = chainOf(node)
        for (const property of computedProps)
          evaluate(property, { kind: "computed" }, emitting)
        let rootValue: Resolved
        if (root.type === "Identifier") {
          const name = root["name"] as string
          const binding = lookup(scope, name)
          if (binding === null) {
            rootValue = LANGUAGE_GLOBALS.has(name)
              ? computed
              : { kind: "tech", origin: null, path: [] }
            if (rootValue.kind === "tech") countRead(emitting)
          } else {
            if (emitting) recordUse(binding, ctx, members, node)
            rootValue = resolveBinding(binding)
            if (rootValue.kind === "tech" && holdsRead(binding))
              countRead(emitting)
          }
        } else if (
          root.type === "CallExpression" ||
          root.type === "NewExpression" ||
          root.type === "TaggedTemplateExpression"
        ) {
          // a field read straight off the call's result
          rootValue = evaluateCall(root, { kind: "member" }, emitting)
        } else if (
          root.type === "MetaProperty" &&
          LOCATION_META.has(members[0] as string)
        ) {
          // the module's own location, not a read of the machine
          rootValue = computed
        } else {
          rootValue = evaluate(root, { kind: "computed" }, emitting)
        }
        switch (rootValue.kind) {
          case "tech":
            return { kind: "tech", origin: null, path: [] }
          case "instance":
            return {
              kind: "instance",
              origin: rootValue.origin,
              path: [...rootValue.path, ...members],
            }
          case "unknown":
            return unknown
          default:
            return computed
        }
      }
      case "CallExpression":
      case "NewExpression":
        if (isMachineCall(node)) countRead(emitting)
        return evaluateCall(node, ctx, emitting)
      case "TaggedTemplateExpression":
        return evaluateCall(node, ctx, emitting)
      // `import.meta` whole, or a member past the location: the host's
      // object, `env` among it — a read of the machine
      case "MetaProperty":
        countRead(emitting)
        return { kind: "tech", origin: null, path: [] }
      case "ImportExpression": {
        evaluate(node["source"] as AstNode, { kind: "computed" }, emitting)
        // a call into the host's module loader, as a static import is one;
        // what it resolves to is followed by name (`importLikeSource`)
        const loader: CalleeKind = { kind: "tech", package: null }
        emitCall(
          {
            span: spanOf(node),
            callee: loader,
            args: [],
            result: resultsOf(ctx, loader, spanOf(node)),
            load: null,
            registration: false,
            handsRunner: false,
            site: inlineSite,
            calleeCall: null,
          },
          spanOf(node),
          emitting,
        )
        return computed
      }
      case "ClassExpression":
        if (emitting) evaluateClass(node)
        return { kind: "function", origin: null, path: [] }
      case "ArrowFunctionExpression":
      case "FunctionExpression":
        return { kind: "function", origin: null, path: [] }
      case "ObjectExpression": {
        const kinds: ValueKind[] = []
        for (const property of node["properties"] as AstNode[]) {
          if (property.type === "SpreadElement") {
            evaluate(
              property["argument"] as AstNode,
              { kind: "computed" },
              emitting,
            )
            kinds.push("computed")
            continue
          }
          if (property["computed"] === true)
            evaluate(property["key"] as AstNode, { kind: "computed" }, emitting)
          const value = property["value"] as AstNode
          kinds.push(evaluate(value, { kind: "entry" }, emitting).kind)
        }
        return { kind: joinKinds(kinds), origin: null, path: [] }
      }
      case "ArrayExpression": {
        const kinds: ValueKind[] = []
        for (const element of node["elements"] as (AstNode | null)[]) {
          if (element === null) continue
          if (element.type === "SpreadElement") {
            evaluate(
              element["argument"] as AstNode,
              { kind: "computed" },
              emitting,
            )
            kinds.push("computed")
            continue
          }
          kinds.push(evaluate(element, { kind: "entry" }, emitting).kind)
        }
        return { kind: joinKinds(kinds), origin: null, path: [] }
      }
      case "ConditionalExpression": {
        // its value is one of its arms': their join
        let consequent = computed
        let alternate = computed
        emitControl(
          node,
          node["test"] as AstNode,
          [
            () => {
              consequent = evaluate(
                node["consequent"] as AstNode,
                ctx,
                emitting,
              )
            },
            () => {
              alternate = evaluate(node["alternate"] as AstNode, ctx, emitting)
            },
          ],
          emitting,
        )
        return joinResolved(consequent, alternate)
      }
      case "LogicalExpression":
        emitControl(
          node,
          node["left"] as AstNode,
          [() => void evaluate(node["right"] as AstNode, ctx, emitting)],
          emitting,
        )
        return computed
      case "AssignmentExpression": {
        const left = unwrap(node["left"] as AstNode)
        if (left.type === "Identifier") {
          const binding = lookup(scope, left["name"] as string)
          if (binding !== null) {
            binding.reassigned = true
            binding.memo = null
            if (emitting) recordUse(binding, { kind: "reassigned" }, [], left)
          }
        } else if (left.type === "MemberExpression") {
          evaluate(left, { kind: "reassigned" }, emitting)
        } else {
          for (const { name } of patternNames(left)) {
            const binding = lookup(scope, name)
            if (binding !== null) {
              binding.reassigned = true
              binding.memo = null
            }
          }
        }
        evaluate(node["right"] as AstNode, { kind: "computed" }, emitting)
        return computed
      }
      case "SequenceExpression": {
        let last: Resolved = computed
        for (const expression of node["expressions"] as AstNode[])
          last = evaluate(expression, ctx, emitting)
        return last
      }
      case "ThisExpression":
      case "Super":
        return unknown
      case "UnaryExpression":
      case "UpdateExpression":
      case "BinaryExpression":
      case "SpreadElement":
      case "YieldExpression":
        evaluateChildren(node, emitting)
        return computed
      default:
        // a node the reader does not know: its calls still count
        evaluateChildren(node, emitting)
        return unknown
    }
  }

  /**
   * A decorator is a call when the class is evaluated, read where the `@` sits:
   * `@sealed` calls `sealed`; `@Injectable()` is two calls, the factory's and
   * its result's, applied to the class — the application's callee is the
   * factory call's result.
   */
  const applyDecorator = (decorator: AstNode): void => {
    evaluateCall(
      {
        ...decorator,
        type: "CallExpression",
        callee: decorator["expression"] as AstNode,
        arguments: [],
        optional: false,
      },
      { kind: "discarded" },
      true,
    )
  }

  /**
   * What runs when a class is evaluated, where it is evaluated: its decorators
   * and its members', its static field initializers, its static blocks. An
   * instance field runs at construction, a method when called. Read when
   * emitting only: none of it changes the class's value.
   */
  const evaluateClass = (node: AstNode): void => {
    for (const decorator of node["decorators"] as AstNode[])
      applyDecorator(decorator)
    const members = (node["body"] as AstNode)["body"] as AstNode[]
    for (const member of members) {
      // a static block carries no decorators
      for (const decorator of (member["decorators"] ?? []) as AstNode[])
        applyDecorator(decorator)
      if (member.type === "StaticBlock") {
        walkBlock(member["body"] as AstNode[])
        continue
      }
      // a `declare` field is a type, nothing at run time
      if (
        member["static"] === true &&
        member.type !== "MethodDefinition" &&
        member["declare"] !== true
      )
        emitStaticField(member)
    }
  }

  /**
   * A static field is a binding of the class, made when the class is evaluated:
   * `readonly` is its `const`, a writable one reassignable like a `let`,
   * whatever it holds.
   */
  const emitStaticField = (member: AstNode): void => {
    const value = member["value"]
    let resolved: Resolved = { kind: "literal", origin: null, path: [] }
    const storesMachineRead = readsMachine(() => {
      if (isNode(value)) resolved = evaluate(value, { kind: "computed" }, true)
    })
    const key = member["key"] as AstNode
    const name =
      member["computed"] === true
        ? null
        : key.type === "Literal"
          ? String(key["value"])
          : key.type === "PrivateIdentifier"
            ? `#${key["name"] as string}`
            : (key["name"] as string)
    const annotation = annotationOf(member)
    const held = isNode(value)
      ? initializerImmutability(value, namesIn(new Set()))
      : READONLY
    emit({
      kind: "definition",
      name,
      form: "static",
      exported: false,
      value: resolved.kind,
      immutability:
        member["readonly"] !== true
          ? mutableBy("static", name)
          : annotation === null
            ? held
            : typedAs(typeImmutability(annotation), held),
      storesMachineRead,
      storedCall: isNode(value) ? storedCallOf(value) : null,
      inlined: frame !== null,
      span: spanOf(member),
    })
  }

  const walkBlock = (statements: readonly AstNode[]): void => {
    inScope([], () => {
      declareBlock(scope, statements)
      for (const statement of statements) walkStatement(statement)
    })
  }

  /**
   * A name followed to its binding in scope: code is immutable, a definition is
   * when its own initializer is, anything else (an import, a parameter, a
   * destructured or reassigned name) is not known to be. `seen` stops a cycle.
   */
  const namesIn = (seen: ReadonlySet<Binding>): Names => {
    const definitionOf = (name: string): Binding | null => {
      const binding = lookup(scope, name)
      return binding === null ||
        binding.kind !== "definition" ||
        binding.reassigned ||
        seen.has(binding)
        ? null
        : binding
    }
    const initOf = (name: string): AstNode | null => {
      const binding = definitionOf(name)
      return binding === null || binding.path.length > 0 ? null : binding.init
    }
    return {
      initOf,
      isImmutable: (name) => {
        const binding = definitionOf(name)
        if (binding === null) return false
        if (binding.isFunction) return true
        const init = initOf(name)
        return (
          init !== null &&
          initializerImmutability(init, namesIn(new Set([...seen, binding])))
            .proof === "readonly"
        )
      },
    }
  }

  /**
   * The call whose result an initializer stores, past the wrappers — awaiting a
   * call is the call; `null` when the initializer is not a call.
   */
  const storedCallOf = (init: AstNode): Span | null => {
    const stored = unwrap(init)
    return CALL_FORMS.has(stored.type) ? spanOf(stored) : null
  }

  const emitDefinitions = (declaration: AstNode, exported: boolean): void => {
    for (const declarator of declaration["declarations"] as AstNode[]) {
      const init = declarator["init"]
      const names = patternNames(declarator["id"] as AstNode)
      const first = names[0] ? lookup(scope, names[0].name) : null
      const storesMachineRead = readsMachine(() => {
        if (
          isNode(init) &&
          first !== null &&
          names.length === 1 &&
          first.path.length === 0
        ) {
          evaluate(init, { kind: "bound", binding: first }, true)
        } else if (isNode(init)) {
          evaluate(init, { kind: "destructured" }, true)
        }
      })
      const form = declaration["kind"] as string
      const storedCall = isNode(init) ? storedCallOf(init) : null
      const immutability = declaratorImmutability(
        form,
        declarator,
        namesIn(new Set()),
      )
      for (const { name, node } of names) {
        // declared by the same pattern walk on scope entry — always found
        const binding = lookup(scope, name) as Binding
        emit({
          kind: "definition",
          name,
          form,
          exported,
          value: resolveBinding(binding).kind,
          immutability,
          storesMachineRead,
          storedCall,
          inlined: frame !== null,
          span: spanOf(node),
        })
      }
    }
  }

  const walkStatement = (statement: AstNode, exported = false): void => {
    switch (statement.type) {
      case "ImportDeclaration":
      // a re-export is a module-graph statement, already an edge: it binds no
      // name here and does nothing when the module is evaluated
      case "ExportAllDeclaration":
      case "EmptyStatement":
      case "TSTypeAliasDeclaration":
      case "TSInterfaceDeclaration":
      case "TSModuleDeclaration":
      case "TSDeclareFunction":
        return
      case "ExportNamedDeclaration": {
        const declaration = statement["declaration"]
        if (isNode(declaration)) walkStatement(declaration, true)
        return
      }
      case "ExportDefaultDeclaration": {
        const declaration = statement["declaration"] as AstNode
        if (isStatementLike(declaration)) {
          walkStatement(declaration, true)
          return
        }
        let value: Resolved = { kind: "computed", origin: null, path: [] }
        const storesMachineRead = readsMachine(() => {
          value = evaluate(declaration, { kind: "computed" }, true)
        })
        emit({
          kind: "definition",
          name: null,
          form: "default",
          exported: true,
          value: value.kind,
          // a default-exported expression is a binding nothing reassigns:
          // readonly by its initializer's form
          immutability: initializerImmutability(
            declaration,
            namesIn(new Set()),
          ),
          storesMachineRead,
          storedCall: storedCallOf(declaration),
          inlined: frame !== null,
          span: spanOf(statement),
        })
        return
      }
      case "VariableDeclaration":
        if (statement["declare"] === true) return
        emitDefinitions(statement, exported)
        return
      case "FunctionDeclaration":
      case "ClassDeclaration":
      case "TSEnumDeclaration": {
        if (statement["declare"] === true) return
        if (statement.type === "ClassDeclaration") evaluateClass(statement)
        const id = statement["id"]
        emit({
          kind: "definition",
          name: isNode(id) ? (id["name"] as string) : null,
          form:
            statement.type === "FunctionDeclaration"
              ? "function"
              : statement.type === "ClassDeclaration"
                ? "class"
                : "enum",
          exported,
          value:
            statement.type === "TSEnumDeclaration" ? "literal" : "function",
          // code, not state
          immutability: READONLY,
          storesMachineRead: false,
          storedCall: null,
          inlined: frame !== null,
          span: spanOf(statement),
        })
        return
      }
      case "ExpressionStatement": {
        const expression = statement["expression"] as AstNode
        evaluate(expression, { kind: "discarded" }, true)
        const inner = unwrap(expression)
        if (inner.type === "AssignmentExpression")
          emit({
            kind: "assignment",
            target: assignmentTargetKind(unwrap(inner["left"] as AstNode)),
            span: spanOf(statement),
          })
        // an increment and a `delete` are writes too, with no target kind to
        // carry — the one names no value, the other removes rather than sets
        else if (
          inner.type === "UpdateExpression" ||
          (inner.type === "UnaryExpression" && inner["operator"] === "delete")
        )
          emit({ kind: "other", span: spanOf(statement) })
        return
      }
      case "ReturnStatement": {
        const argument = statement["argument"]
        if (frame !== null) {
          // a body read inline: the value flows to the frame's context, and
          // is what the inlined call evaluates to — no statement
          const value = isNode(argument)
            ? evaluate(argument, frame.ctx, true)
            : { kind: "literal" as const, origin: null, path: [] }
          frame.returns += 1
          if (frame.value === null) frame.value = value
          return
        }
        emitReturn(isNode(argument) ? argument : null, spanOf(statement))
        return
      }
      case "BlockStatement":
        walkBlock(statement["body"] as AstNode[])
        return
      case "IfStatement": {
        const alternate = statement["alternate"]
        emitControl(
          statement,
          statement["test"] as AstNode,
          [
            () => walkStatement(statement["consequent"] as AstNode),
            ...(isNode(alternate) ? [() => walkStatement(alternate)] : []),
          ],
          true,
        )
        return
      }
      case "ForStatement":
      case "ForInStatement":
      case "ForOfStatement":
      case "WhileStatement":
      case "DoWhileStatement": {
        inScope([], () => {
          const init = statement["init"] ?? statement["left"]
          if (isNode(init) && init.type === "VariableDeclaration") {
            declareStatement(scope, init)
            for (const declarator of init["declarations"] as AstNode[]) {
              for (const { name } of patternNames(
                declarator["id"] as AstNode,
              )) {
                // declared just above — always found; a loop variable is
                // computed, whatever its initializer
                ;(lookup(scope, name) as Binding).memo = {
                  kind: "computed",
                  origin: null,
                  path: [],
                }
              }
            }
          } else if (isNode(init)) {
            evaluate(init, { kind: "computed" }, true)
          }
          const test = statement["test"] ?? statement["right"]
          emitControl(
            statement,
            isNode(test) ? test : null,
            [() => walkStatement(statement["body"] as AstNode)],
            true,
          )
          const update = statement["update"]
          if (isNode(update)) evaluate(update, { kind: "computed" }, true)
        })
        return
      }
      case "SwitchStatement": {
        const cases = statement["cases"] as AstNode[]
        emitControl(
          statement,
          statement["discriminant"] as AstNode,
          cases.map((switchCase) => () => {
            const test = switchCase["test"]
            if (isNode(test)) evaluate(test, { kind: "computed" }, true)
            walkBlock(switchCase["consequent"] as AstNode[])
          }),
          true,
        )
        return
      }
      case "TryStatement": {
        walkStatement(statement["block"] as AstNode)
        const handler = statement["handler"]
        if (isNode(handler)) {
          const param = handler["param"]
          const bindings = isNode(param)
            ? patternNames(param).map(({ name, node }) =>
                newBinding(name, "catch", node),
              )
            : []
          inScope(bindings, () => walkStatement(handler["body"] as AstNode))
        }
        const finalizer = statement["finalizer"]
        if (isNode(finalizer)) walkStatement(finalizer)
        return
      }
      case "ThrowStatement":
        evaluate(statement["argument"] as AstNode, { kind: "computed" }, true)
        emit({ kind: "throw", span: spanOf(statement) })
        return
      case "LabeledStatement":
        walkStatement(statement["body"] as AstNode)
        return
      default:
        // a statement the reader does not know: its calls still count
        emit({ kind: "unread", form: statement.type, span: spanOf(statement) })
        evaluateChildren(statement, true)
        return
    }
  }

  // --- top level ---------------------------------------------------------
  const rootStatements = program.body as unknown as AstNode[]
  declareBlock(scope, rootStatements)
  const exportedNames = new Set<string>()
  for (const statement of rootStatements) {
    if (statement.type !== "ExportNamedDeclaration") continue
    for (const spec of statement["specifiers"] as AstNode[]) {
      // without a source, a local export name is always an identifier
      exportedNames.add((spec["local"] as AstNode)["name"] as string)
    }
  }

  // the tracked locals: every non-exported top-level function is a candidate;
  // it is tracked when every reference to its name in the file is a direct
  // call — one passed as a value, taken as a member's root, tagged, or
  // constructed is not seen whole, and stays a function of the file
  const candidates = new Map<string, AstNode>()
  for (const statement of rootStatements) {
    if (statement.type === "FunctionDeclaration") {
      // a root function statement is named: the anonymous form is the
      // default export's, under its own declaration node
      const id = statement["id"] as AstNode
      candidates.set(id["name"] as string, statement)
    } else if (statement.type === "VariableDeclaration") {
      const declarators = statement["declarations"] as AstNode[]
      const single = declarators.length === 1 ? declarators[0] : undefined
      const id = single?.["id"]
      const init = single?.["init"]
      if (single && isNode(id) && id.type === "Identifier" && isNode(init)) {
        const fn = unwrap(init)
        if (isFunctionNode(fn)) candidates.set(id["name"] as string, fn)
      }
    }
  }
  for (const name of exportedNames) candidates.delete(name)
  const references = new Map(
    [...candidates.keys()].map((name) => [name, { direct: 0, other: 0 }]),
  )
  const countReferences = (
    node: unknown,
    parent: AstNode | null,
    key: string,
  ): void => {
    if (Array.isArray(node)) {
      for (const item of node) countReferences(item, parent, key)
      return
    }
    if (!isNode(node) || node.type.startsWith("TS")) return
    if (node.type === "Identifier") {
      const count = references.get(node["name"] as string)
      if (count === undefined || parent === null) return
      // not a reference: a property name, a key, a label, an import or
      // export name, the declaration's own name
      const named =
        (parent.type === "MemberExpression" && key === "property") ||
        ((parent.type === "Property" ||
          parent.type === "MethodDefinition" ||
          parent.type === "PropertyDefinition") &&
          key === "key")
      if (named && parent["computed"] !== true) return
      if (
        key === "label" ||
        parent.type === "ImportSpecifier" ||
        parent.type === "ExportSpecifier" ||
        (key === "id" &&
          (parent.type === "FunctionDeclaration" ||
            parent.type === "FunctionExpression" ||
            parent.type === "VariableDeclarator"))
      )
        return
      if (parent.type === "CallExpression" && key === "callee")
        count.direct += 1
      else count.other += 1
      return
    }
    for (const [childKey, child] of Object.entries(node)) {
      if (childKey === "type" || childKey === "loc" || childKey === "range")
        continue
      countReferences(child, node, childKey)
    }
  }
  if (candidates.size > 0) countReferences(rootStatements, null, "body")
  for (const [name, fn] of candidates) {
    const count = references.get(name) as { direct: number; other: number }
    const binding = lookup(scope, name)
    // an assembly's local function is not its own code read inline: nothing
    // but assembly functions is defined there, so it stays a definition and
    // its call a call
    if (
      layer !== "assembly" &&
      count.other === 0 &&
      count.direct > 0 &&
      binding !== null
    )
      // the scope it is written in — always the root's, since this loop runs
      // at top level over root statements only. Widening the candidates to
      // nested functions means capturing each one's own declaring scope here,
      // not this `scope`
      tracked.set(binding, { fn, scope })
  }
  const isTrackedName = (name: string): boolean => {
    const binding = lookup(scope, name)
    return binding !== null && tracked.has(binding)
  }

  const functions: ReadFunction[] = []

  const readFunction = (
    fn: AstNode,
    name: string | null,
    exported: boolean,
  ): void => {
    const bound = paramKinds?.get(name ?? "default") ?? []
    const unbound: Binding[] = []
    const params = (fn["params"] as AstNode[]).flatMap((param, index) =>
      patternNames(param).map(({ name: paramName, path, node }) => {
        const site = bound[index] ?? null
        const pattern =
          param.type === "AssignmentPattern"
            ? (param["left"] as AstNode)
            : param
        const binding = newBinding(paramName, "parameter", node, {
          // a destructured name is typed by the pattern's annotation
          type:
            path.length === 0
              ? annotationOf(node)
              : typeAtPath(annotationOf(pattern), path),
          // bound at a call site: the argument's kind, its origin, and the
          // member path down to this name when the parameter destructures
          memo:
            site === null
              ? null
              : {
                  kind: site.kind,
                  origin: site.origin,
                  path: [...site.path, ...path],
                },
        })
        if (site === null) unbound.push(binding)
        return binding
      }),
    )
    const inner = inScope(params, () =>
      inBody(() => withFrame(null, () => walkFunctionBody(fn))),
    )
    for (const param of unbound)
      open.push({ span: param.span, why: "unbound-parameter" })
    functions.push({
      name,
      exported,
      span: spanOf(fn),
      params: params.map((param) => ({
        name: param.name,
        kind: resolveBinding(param).kind,
      })),
      body: inner.statements,
      hooks: inner.hooks,
    })
  }

  /** A top-level function definition, taken as a function of the outside kind. */
  const asTopLevelFunction = (
    statement: AstNode,
    exported: boolean,
  ): boolean => {
    if (tech === null) return false
    switch (statement.type) {
      case "ExportNamedDeclaration": {
        const declaration = statement["declaration"]
        return isNode(declaration) && asTopLevelFunction(declaration, true)
      }
      case "ExportDefaultDeclaration": {
        const declaration = unwrap(statement["declaration"] as AstNode)
        if (
          declaration.type === "FunctionDeclaration" ||
          isFunctionNode(declaration)
        ) {
          const id = declaration["id"]
          readFunction(
            declaration,
            isNode(id) ? (id["name"] as string) : null,
            true,
          )
          return true
        }
        return false
      }
      case "FunctionDeclaration": {
        const id = statement["id"] as AstNode
        const name = id["name"] as string
        if (isTrackedName(name)) return true
        readFunction(statement, name, exported || exportedNames.has(name))
        return true
      }
      case "VariableDeclaration": {
        const declarators = statement["declarations"] as AstNode[]
        const single = declarators.length === 1 ? declarators[0] : undefined
        const id = single?.["id"]
        const init = single?.["init"]
        if (!single || !isNode(id) || id.type !== "Identifier" || !isNode(init))
          return false
        const fn = unwrap(init)
        if (!isFunctionNode(fn)) return false
        const name = id["name"] as string
        if (isTrackedName(name)) return true
        readFunction(fn, name, exported || exportedNames.has(name))
        return true
      }
      default:
        return false
    }
  }

  for (const statement of rootStatements) {
    if (asTopLevelFunction(statement, false)) continue
    walkStatement(statement)
  }

  return {
    tech: tech?.name ?? null,
    exempts: tech?.exempts ?? [],
    root: body.statements,
    hooks: body.hooks,
    functions,
    open,
  }
}

/**
 * The root definitions the reader could not read, with what it could not read —
 * through branches and loops, whose arms are root code.
 */
export const brokenLinesOf = (
  root: readonly ReadStatement[],
): { line: number; reason: string }[] =>
  root.flatMap((statement) => {
    if (statement.kind === "control")
      return statement.arms.flatMap(brokenLinesOf)
    return statement.kind === "definition" &&
      statement.immutability.proof === "broken"
      ? [{ line: statement.span.line, reason: statement.immutability.reason }]
      : []
  })
