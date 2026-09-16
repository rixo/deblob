// the flavor's word on export names: a model export, a pure package's export
// and a local function each read as a factory or a function by name alone
import { createHelper, helper } from "./helper.model.ts"
import { createPureFn, pureFn } from "pure-lib"

const createLocalThing = () => ({ run: () => 1 })
const localFn = () => 1

export const main = () => {
  const named = createHelper()
  helper()
  createPureFn()
  pureFn()
  const local = createLocalThing()
  localFn()
  local.run()
  named.run()
}

// at module root: a factory call, named by the flavor
export const ROOT_INSTANCE = createHelper()
