import { createMemoryStore } from "./app/store.adapter.ts"

// a group assembly: takes what the root built; its parameters are bound at
// the root's call site, and a load on a received instance matches by file
export const createGroupAssembly = async (
  app: { load: Function; status: Function },
  { cwd }: { cwd: string },
) => {
  const loaded = await app.load()
  if (loaded.flag) {
    createMemoryStore()
  }
  if (cwd) {
    createMemoryStore()
  }
  const store = createMemoryStore()
  return { store }
}
