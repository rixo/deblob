import type { ReaderBinding } from "../recognition.model.ts"
import type { LanguageReader } from "../language-reader.model.ts"

/**
 * The stock TypeScript reader: the standard type names, by name at a type's top
 * — the readonly wrappers, and the types whose values carry mutators. What a
 * checker would know and the reading reads off the syntax alone. The engine,
 * when it lands, is this reader's source (04/07 ruling 11). Bound to every file
 * by default.
 */
export const createTsReader = (
  binding: ReaderBinding = {},
): LanguageReader => ({
  name: "ts",
  ...binding,
  readonlyTypeNames: [
    "Readonly",
    "ReadonlyArray",
    "ReadonlyMap",
    "ReadonlySet",
  ],
  mutableTypeNames: [
    "Array",
    "Map",
    "Set",
    "WeakMap",
    "WeakSet",
    "Date",
    "Record",
  ],
})
