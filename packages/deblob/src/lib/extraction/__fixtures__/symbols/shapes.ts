// The rarer shapes, once each. Test data: names are made up.

/* a plain block comment is not a doc */
export const notDocumented = 1

/** */
export const emptyDoc = 1

export interface Keys {
  [Symbol.iterator]: unknown
  [Symbol.toPrimitive](): string
  1: number
}

export abstract class Holder {
  [key: string]: unknown
  [Symbol.species] = 1
  accessor size = 1
  accessor [Symbol.unscopables] = 2
  abstract accessor weight: number
  abstract run(): void
  abstract field: string
  2n = 3
}

export const { withDefault = 1, ...others } = { withDefault: 2, x: 3 }

export const [, second] = [1, 2]

export namespace Outer.Inner {
  export const deep = 1
}

export import Alias = Outer

const quoted = 1
export { quoted as "quoted name" }

declare module "ambient-module" {}

declare global {}

export default function () {}
