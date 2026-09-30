import { createStripeAdapter } from "./stripe.adapter.ts"

export const createBillingAssembly = () => ({
  charge: createStripeAdapter().charge,
})
