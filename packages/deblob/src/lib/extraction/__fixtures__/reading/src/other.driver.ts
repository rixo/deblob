import { createCliAssembly } from "./cli.assembly.ts"
import { INSTANCES } from "./const.assembly.ts"
import makeDefault from "./default.assembly.ts"
import { createOpaqueAssembly } from "./opaque.assembly.ts"
import { registerSub } from "./sub.driver.ts"

// a second call site for the sub-driver, disagreeing on the first argument:
// that parameter falls back to unknown, the second stays an instance
export const other = async () => {
  const services = await createCliAssembly(process.cwd(), process.env)
  registerSub("not-the-parser", services)
  const opaque = createOpaqueAssembly()
  const viaDefault = makeDefault()
  process.on("exit", () => {
    // through the group's record to an adapter: not a use case of a service
    services.group.store.has("k")
    // through a record the reading cannot see: unresolved
    opaque.app.status({ cwd: "." })
    // through a default-exported assembly's record: primary
    viaDefault.app.check({ cwd: "." })
    // an instance exported from an assembly's root: no function to trace
    INSTANCES.app.check({ cwd: "." })
    // the service instance itself called, and the group's: not use cases
    services.app()
    services.group()
  })
}
