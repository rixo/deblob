// every value and call shape the reader classifies; resolution is the spec's
import { createThing } from "./thing.service.ts"
import { helper } from "./helper.model.ts"
import * as adapters from "./store.adapter.ts"
import tech from "some-tech"
import { pureFn } from "pure-lib"
import { mystery } from "unclaimed-lib"
import { wire } from "./sub.driver.ts"
import { PORT } from "./x.port.ts"
import type { Foo } from "./x.port.ts"
import { gone } from "./missing.ts"

export const main = async (
  param: { a: string },
  { b, c = 1 }: { b: number; c?: number },
) => {
  const literal = "x"
  const template = `no holes`
  const holes = `has ${literal}`
  const instance = createThing({ literal, tech })
  const bound = instance.run(param.a)
  const viaNs = adapters.createStore()
  const parsed = tech.parse(literal)
  const lang = JSON.stringify(bound)
  new Map()
  tag`hi ${literal}`
  tech?.optional?.()
  const { x: destructured } = createThing()
  if (param.a) createThing()
  if (bound.ok) createThing()
  if (instance) helper()
  const cond = param.a ? createThing() : tech.other()
  const log = param.a && tech.log()
  const { d } = await import("./dyn.assembly.ts")
  d()
  const req = require("./req.service.ts")
  req.createReq()
  await import("./side.ts")
  try {
    mystery()
  } catch (error) {
    error.report()
  }
  wire(tech, instance)
  PORT()
  pureFn(literal)
  gone()
  {
    const createThing = () => 1
    createThing()
  }
  let mutable = createThing()
  mutable = createThing()
  mutable.run()
  process.argv.slice(2)
  process.on("exit", () => {})
  ;[1, 2].map((n) => n)
  createThing()()
  this.what()
  return bound
}

export function decl(x = tech.default) {
  return { ...tech, [x as string]: 1, "str-key": (x as number)! }
}

const arrow = () => {}
export { arrow }

export default () => {
  gone()
}
