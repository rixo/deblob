// binding patterns, odd call roots, test origins, assignments — one per line
import { createThing } from "./thing.service.ts"
import { helper } from "./helper.model.ts"
import * as adapters from "./store.adapter.ts"
import tech from "some-tech"

export const main = async (param: string, ...rest: unknown[]) => {
  const inst = createThing()
  inst()
  adapters()
  param()
  const held = tech.thing
  held()
  const cycleA = cycleB
  const cycleB = cycleA
  cycleA()
  let bare
  bare()
  const { p } = helper()
  p()
  const key = "k"
  inst[key]()
  const dyn = inst[key]
  ;(await import("./dyn.assembly.ts")).d()
  ;(await import("./dyn.assembly.ts")).d.e()
  const require = () => 1
  const shadowed = require("./req.service.ts")
  shadowed()
  helper(later)
  const later = tech.on(() => {})
  helper(...rest)
  if (!inst) helper()
  if (inst.x === param) helper()
  if (process) helper()
  if ([1].length) helper()
  if (inst.run()) helper()
  if (param) helper()
  else helper()
  const u = undefined
  const j = JSON
  const len = "str".length
  const sub = inst.child
  const spread = { ...tech, [key]: 1 }
  const holes = [, 1, ...rest]
  inst.prop = 1
  ;(param, inst)
  ;[inst.a] = [1]
  ;({ x: inst.b } = { x: 1 })
  for (let i = 0; i < 1; i += 1) helper()
  let n = 0
  for (n = 0; n < 1; n += 1) helper()
  try {
    helper()
  } finally {
    helper()
  }
  const { q, ...restObj } = helper()
  const { [key]: comp, "str-key": strKey } = helper()
  const [, second] = [1, 2]
  const { t1 } = tech
  t1()
  const { lit } = { lit: 1 }
  const {} = helper()
  n++
  ;[n, n] = [1, 2]
  ;[undeclaredMadeUp] = [1]
  outside()
  held.map()
  ;(await import(param))()
  ;(await import("./dyn.assembly.ts"))()
  ;(1 + 2)()
  const notImport = require(1)
  const made = new inst.Klass()
  if (made) helper()
  if (helper().x) helper()
  if (helper()) helper()
  if (param === 2) return
  for (;;) {
    helper()
    break
  }
  try {
    helper()
  } catch {
    helper()
  }
  const js = JSON.stringify
  const made2 = helper()
  if (made2) helper()
  undeclaredMadeUp = 1
  helper(v2)
  const v2 = (n = 3)
  const pick = param ? createThing() : helper()
  if (pick) helper()
  const picked = param ? inst.run() : helper()
  if (picked) helper()
  this.made = 1
  Math.made = 1
  ;[1].forEach((n) => {
    if (n) return
    return helper()
  })
  return sub
}

function viaSpecifier() {}
export { viaSpecifier }
export default function named() {}
import outside from "./outside.ts"
import { "string name" as strName } from "./helper.model.ts"

export const a = 1,
  b = () => {}
export const [first] = [() => {}]
