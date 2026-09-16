// one root definition per readonly form the reader can see, then the ones it
// cannot — the fact is syntactic, read off the declaration alone
import { helper } from "./helper.model.ts"

type SomeMadeUpAlias = Readonly<{ x: number }>

// --- readonly: code ----------------------------------------------------------
export function fnDecl() {}
class ClassDecl {}
enum EnumDecl {
  A,
}

// --- readonly: the initializer's form ---------------------------------------
const primitive = 1
const str = "x"
const bigint = 10n
const regex = /re/g
const template = `t ${primitive}`
const unary = -primitive
const binary = primitive + 1
const logical = "x" || "y"
const conditional = primitive ? "a" : "b"
const undef = undefined
const nul = null
const arrow = () => ({ mutable: 1 })
const classExpr = class {}
const asConst = { x: 1 } as const
const angleConst = <const>{ y: 2 }
const frozen = Object.freeze({ z: 3 })
const asReadonly = { w: 4 } as Readonly<{ w: number }>
const satisfiesPrimitive = "s" satisfies string
const parenthesized = ("p")

// --- readonly: the annotation's form ----------------------------------------
const annotatedReadonly: Readonly<{ x: number }> = { x: 1 }
const annotatedArray: readonly string[] = []
const annotatedMap: ReadonlyMap<string, number> = new Map()
const annotatedSet: ReadonlySet<string> = new Set()
const annotatedString: string = helper()
const annotatedLiteral: "a" | 42 = "a"
const annotatedUnion: string | Readonly<{ x: number }> = "u"
const annotatedParens: (readonly number[]) = []

// --- readonly: destructured from a readonly form --------------------------------
const { d1 } = { d1: 1 } as const
const [d2] = Object.freeze([1])

// --- not readonly ------------------------------------------------------------
let letBinding = 1
var varBinding = 2
const record = { m: 1 }
const array = [1, 2]
const map = new Map<string, number>()
const call = helper()
const member = record.m
const asMutable = { v: 1 } as { v: number }
const annotatedAlias: SomeMadeUpAlias = { x: 1 }
// a mixed union with a binding initializer: neither side says readonly
const annotatedMixedUnion: string | { x: number } = record
// a logical over bindings: either operand may be the value, neither is known
const logicalBindings = str || record
const { d3 } = { d3: 1 }
const awaited = await helper()

export default { m: 1 }

// keep the bindings referenced
export const REFS = [
  fnDecl,
  ClassDecl,
  EnumDecl,
  primitive,
  str,
  bigint,
  regex,
  template,
  unary,
  binary,
  logical,
  conditional,
  undef,
  nul,
  arrow,
  classExpr,
  asConst,
  angleConst,
  frozen,
  asReadonly,
  satisfiesPrimitive,
  parenthesized,
  annotatedReadonly,
  annotatedArray,
  annotatedMap,
  annotatedSet,
  annotatedString,
  annotatedLiteral,
  annotatedUnion,
  annotatedParens,
  d1,
  d2,
  letBinding,
  varBinding,
  record,
  array,
  map,
  call,
  member,
  asMutable,
  annotatedAlias,
  annotatedMixedUnion,
  logicalBindings,
  d3,
  awaited,
] as const
