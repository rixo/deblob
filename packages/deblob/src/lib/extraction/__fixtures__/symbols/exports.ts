// Every exported form, and every doc rule, once. Test data: names are made up.

import { made } from "./elsewhere.ts"

/**
 * A shape with every member kind. The second sentence is not the doc.
 */
export interface Shape {
  plain: string
  method(): void
  callback: () => void
  [key: string]: unknown
  (): void
  new (): Shape
  "quoted-key": number
}

/** An object type: its members, like an interface's. */
export type Literal = { one: number; two(): string }

export type Alias = string | number

// a line comment is not a doc
export function declared(a: number): number {
  return a
}

/**
 * Spread over lines,
 * one sentence all the same
 */
export const arrow = (): void => {}

export const plainValue = made

export let counter = 0

/** Destructured: one symbol per name. */
export const { first, second: renamed } = { first: 1, second: 2 }

export const [head, ...rest] = [1, 2, 3]

export class Thing {
  field = 1
  #hidden = 2
  action(): void {}
  handler: () => void = () => {}
  static make(): Thing {
    return new Thing()
  }
  constructor() {}
  [Symbol.iterator](): void {}
}

export enum Mode {
  On,
  "Off-ish",
}

export namespace Space {
  export const inner = 1
}

export declare function ambient(): void

/** A doc that stops here.

 */

export const afterGap = 1

class InternalClass {}
interface InternalInterface {}
type InternalType = number
enum InternalEnum {
  A,
}

const clauseConst = 1
/** Exported by a clause, under another name. */
function viaClause(): void {}
/** Exported as the default, by name. */
function theDefault(): void {}

export { clauseConst, viaClause as renamedExport }
// an imported binding exported again is a re-export: an edge fact
export { made }

export default theDefault
