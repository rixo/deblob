import type { StorePort } from "./store.port.ts"

export const createMemoryStore = (): StorePort => {
  const saved: number[] = []
  return { save: (total) => void saved.push(total) }
}
