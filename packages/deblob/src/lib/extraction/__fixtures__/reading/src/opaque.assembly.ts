import { createAppService } from "./app/app.service.ts"
import { createMemoryStore } from "./app/store.adapter.ts"

// returns its record through a call: nothing says what the call gives back
export const createOpaqueAssembly = () => {
  const record = { app: createAppService({ store: createMemoryStore() }) }
  return Object.freeze(record)
}
