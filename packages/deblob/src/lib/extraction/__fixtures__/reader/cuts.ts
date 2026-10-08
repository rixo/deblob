// what a reader's own cut may ask and answer, beyond the corpus's readers
import tech, { current } from "some-tech"
import lib from "unclaimed-lib"
import outside from "./outside.ts"

export const main = (argv: string[]) => {
  // an import that names no package, handed on as a value
  tech.take(outside)
  // a cut asking about other nodes than the call it is asked on
  tech.ask(
    tech.rows.map((row) => row),
    lib.rows.map((row) => row),
    1,
  )
  // a relay whose load is no import(), beside a function pointed at
  tech.relay(() => {}, tech.unit)
  // picked on a tech call's result, bound to no name
  switch (tech.read(argv).command) {
    case "direct":
      break
  }
  // picked on an imported value
  switch (current.command) {
    case "imported":
      break
  }
  // picked on a name bound to no call
  const held = tech.held
  switch (held.command) {
    case "held":
      break
  }
  // picked on a name bound to a call: the one cut that speaks
  const read = tech.read(argv)
  switch (read.command) {
    case "read":
      break
  }
}
