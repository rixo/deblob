import type { StorePort } from "./app.port.ts"

export const createMemoryStore = (): StorePort => ({ has: () => true })
