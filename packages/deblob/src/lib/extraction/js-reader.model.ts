import type { ReaderBinding } from "./recognition.model.ts"
import type { LanguageReader } from "./language-reader.model.ts"

/**
 * ECMAScript's global intrinsics (ECMA-262 § 19, plus ECMA-402's `Intl`): a
 * closed set the specification defines, so enumerating it is the operation.
 * Everything a host adds — `process`, `document`, `fetch`, `Bun` — is the
 * host's, claimed by a host reader or nobody.
 */
const GLOBALS: readonly string[] = [
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
]

/**
 * The stock language reader: ECMAScript. Its intrinsics, the ones whose value
 * is a literal, the members of `import.meta` that hold the module's own
 * location (canon: presumed not a read of the machine, the module's identity
 * fixed at load; what else `import.meta` carries, `env`, is), and the
 * constructors whose instances carry mutators. Bound to every file by default.
 */
export const createJsReader = (
  binding: ReaderBinding = {},
): LanguageReader => ({
  name: "js",
  ...binding,
  globals: GLOBALS,
  literals: ["undefined", "NaN", "Infinity"],
  locationMeta: ["url", "dirname", "filename"],
  mutableConstructors: ["Array", "Map", "Set", "WeakMap", "WeakSet", "Date"],
})
