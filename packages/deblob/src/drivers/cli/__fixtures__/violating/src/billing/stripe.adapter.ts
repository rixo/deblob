import { addTotals } from "../invoice/private/totals.model.ts"

export const createStripeAdapter = () => ({
  charge: (): number => addTotals(1, 2),
})
