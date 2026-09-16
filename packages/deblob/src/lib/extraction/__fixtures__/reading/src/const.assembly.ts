import { createCliAssembly } from "./cli.assembly.ts"

// an instance exported from an assembly's root, not a function: nothing to
// trace through (and a root call, `stateless-modules` will say)
export const INSTANCES = createCliAssembly(process.cwd(), process.env)
