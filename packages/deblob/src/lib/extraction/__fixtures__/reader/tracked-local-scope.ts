// Lexical scope through inlining. `helper` reads seven names; every site below
// rebinds all seven to values of a different kind, calls `helper()`, and then
// calls four of them itself. Each name is therefore read twice in one reading,
// and every fact the reader derives from a binding — the callee, a use case's
// origin, what a branch tests, what an assignment writes to — must come from
// helper's scope for helper's lines and from the site's for the site's.
import { createThing } from "./thing.service.ts"
import { work } from "some-tech"

let tally = 0
const mode = process.env.MODE

const helper = () => {
  createThing() // the import
  work() // the package
  process.exit(1) // the host
  siteOnly() // bound nowhere helper can see: the host
  const thing = createThing() // an instance of the imported factory
  thing.run() // a use case, its origin that factory
  if (mode) thing.run() // a branch on the module's tech value
  tally = 1 // a write to the module's reassignable `let`
}

// the control: a site that rebinds nothing, so helper's lines read here as
// they are written
export const plainSite = () => {
  helper()
}

export const shadowedByLocals = () => {
  const createThing = () => 1
  const work = () => 1
  const process = { exit: (n) => n }
  const siteOnly = () => 1
  const thing = { run: () => 1 } // an object literal: no origin to carry
  const mode = 0 // a literal, where the module's is a tech value
  const tally = "x" // a literal, where the module's is reassignable
  helper()
  createThing()
  work()
  process.exit(1)
  siteOnly()
}

export const shadowedByParams = (
  createThing,
  work,
  process,
  siteOnly,
  thing,
  mode,
  tally,
) => {
  helper()
  createThing()
  work()
  process.exit(1)
  siteOnly()
}

export const shadowedDeep = () => {
  const createThing = () => 1
  const thing = { run: () => 1 }
  if (createThing) {
    const work = () => 1
    const mode = 0
    ;[1].forEach(() => {
      const process = { exit: (n) => n }
      const siteOnly = () => 1
      const tally = "x"
      helper()
      createThing()
      work()
      process.exit(1)
      siteOnly()
    })
  }
}
