// what counts as a reference to a local's name: a property name, a key, a
// label, an import or export name, a function expression's own name and a
// type do not; a computed key does
import { named as aliased } from "./thing.service.ts"

const named = () => 1
const keyed = () => 2
const g = function named() {}
type T = typeof named

export const main = () => {
  named()
  keyed()
  const o = { named: 1, [keyed]: 2 }
  class C {
    named = 1
    named() {}
  }
  o.named
  named: for (;;) break named
  return [o, C, g, aliased]
}
export { aliased as named }
