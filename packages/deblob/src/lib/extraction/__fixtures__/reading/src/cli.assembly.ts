import { normalize, createRegistry } from "./app/app.model.ts"
import { createAppService } from "./app/app.service.ts"
import { createMemoryStore } from "./app/store.adapter.ts"
import { createLegacyThing } from "./legacy.ts"
import { createGroupAssembly } from "./group.assembly.ts"

export const createCliAssembly = async (cwd: string, env: { DEBUG?: string }) => {
  const store = createMemoryStore()
  const app = createAppService({ store })
  const loaded = await app.load()
  const registry = createRegistry()
  const root = normalize(cwd)
  const legacy = createLegacyThing()
  if (env.DEBUG) {
    createMemoryStore()
  }
  if (loaded.flag) {
    createMemoryStore()
  }
  if (app.status({ cwd }).ok) {
    createMemoryStore()
  }
  const group = await createGroupAssembly(app, { cwd })
  return { app, registry, root, legacy, group }
}
