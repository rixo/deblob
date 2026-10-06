/**
 * The language axis — what a free name of the language is. Knowledge, not
 * syntax: the reading asks it where a name has no binding in the file, and
 * where a type name or a constructor decides whether a value is readonly.
 * Stock: `js` (ECMAScript's intrinsics) and `ts` (the standard type names),
 * both bound to every file by default. A project blocked by a gap wraps and
 * augments one; readers of the group stack, their lists unioned. The lists are
 * `LanguageKnowledge`: free names that are a computation, literal values,
 * `import.meta`'s location members, mutable constructors, readonly and mutable
 * type names.
 */

import type { LanguageKnowledge } from "./knowledge.model.ts"
import type { ReaderBinding } from "./recognition.model.ts"

export interface LanguageReader extends ReaderBinding, LanguageKnowledge {
  readonly name: string
}
