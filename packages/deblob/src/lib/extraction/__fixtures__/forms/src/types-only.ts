import type { T } from "./dep.ts"

export type Alias = T["n"]
export interface Shape {
  dep: T
}
declare const ambient: number
declare namespace Ambient {
  const inner: typeof ambient
}
declare enum AmbientMode {
  A,
}
export type { Alias as AliasAgain }
export default interface DefaultShape {
  mode: AmbientMode
  ambient: typeof Ambient
}
