import type { T } from "./dep.js"
import { val } from "./dep.js"
export const use = (t: T) => t.n + val
