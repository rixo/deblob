import { createCliAssembly } from "./cli.assembly.ts"
import { INSTANCES } from "./const.assembly.ts"
import makeDefault from "./default.assembly.ts"
import { createOpaqueAssembly } from "./opaque.assembly.ts"
import { registerSub } from "./sub.driver.ts"

// two more sites for the sub-driver: one disagreeing on the first argument
// (line 11), one agreeing in kind but not in origin (the last) — two worlds
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
    // a member of a model instance the flavor named: not a service's use case
    services.registry.get("k")
  })
  registerSub(process.argv, opaque)
}
