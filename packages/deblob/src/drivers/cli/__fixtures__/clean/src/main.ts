import { createCheckoutService } from "./checkout/checkout.service.ts"
import { createMemoryStore } from "./checkout/memory-store.adapter.ts"

const service = createCheckoutService({ store: createMemoryStore() })
service.checkout({ total: 3 })
