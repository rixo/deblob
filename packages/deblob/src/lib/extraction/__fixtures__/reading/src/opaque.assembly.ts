import { createAppService } from "./app/app.service.ts"
import { createMemoryStore } from "./app/store.adapter.ts"

// returns a record through a binding, not a literal: nothing to trace through
export const createOpaqueAssembly = () => {
  const record = { app: createAppService({ store: createMemoryStore() }) }
  return record
}
