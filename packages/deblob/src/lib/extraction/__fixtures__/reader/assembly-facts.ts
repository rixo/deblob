import { createStore } from "./store.adapter.ts"
import { createThing } from "./thing.service.ts"

type Deps = { cwd: string; store: "fs" | "memory" }
interface Options {
  cwd: string
}
const rootOf = (cwd: string) => cwd

export const createFactsAssembly = ({ cwd, store }: Deps, _options: Options) => {
  const root = createStore(rootOf(cwd)).root
  const same = store === "fs" ? createStore(cwd) : createStore(root)
  const mixed = store === "fs" ? createStore(cwd) : createThing()
  return { thing: createThing({ same, mixed }) }
}

export const createLoopsAssembly = (
  names: string[],
  more: Array<string>, listed: ReadonlyArray<string>,
  wrapped: (readonly string[]),
  deps: { list: readonly string[] }, { present, absent }: { present: string[] },
) => ({
  indexed: names.map((name, index) => createStore(name, index)), listed: listed.map((name) => createStore(name)),
  block: more.map((name) => {
    return createStore(name)
  }),
  wrapped: wrapped.map((name) => createStore(name)),
  member: deps.list.map((name) => createStore(name)), present: present.map((name) => createStore(name)),
})
