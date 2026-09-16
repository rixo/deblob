import type { StorePort } from "./app.port.ts"

export const createAppService = (deps: { store: StorePort }) => ({
  check: (options: { cwd: string }) => ({ ok: deps.store.has(options.cwd) }),
  status: (options: { cwd: string }) => ({ ok: true, cwd: options.cwd }),
  load: () => ({ flag: true }),
})
