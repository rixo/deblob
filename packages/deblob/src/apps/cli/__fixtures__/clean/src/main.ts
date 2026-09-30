import { createCheckoutService } from "./checkout/checkout.service.ts"
import { createMemoryStore } from "./checkout/memory-store.adapter.ts"

export const createApp = () =>
  createCheckoutService({ store: createMemoryStore() })
