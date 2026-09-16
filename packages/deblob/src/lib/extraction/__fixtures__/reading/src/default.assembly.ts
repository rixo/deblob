import { createAppService } from "./app/app.service.ts"
import { createMemoryStore } from "./app/store.adapter.ts"

// an assembly exported as the default: traced under the "default" key
export default () => ({ app: createAppService({ store: createMemoryStore() }) })
