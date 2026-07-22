import { totalOf } from "./checkout.model.ts"
import type { Basket } from "./checkout.model.ts"
import type { StorePort } from "./store.port.ts"

export const createCheckoutService = ({ store }: { store: StorePort }) => ({
  checkout: (basket: Basket): void => store.save(totalOf(basket)),
})
