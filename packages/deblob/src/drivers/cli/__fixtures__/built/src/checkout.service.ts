import { SOME_MADE_UP_RATE } from "./totals.model.ts"

export const createCheckoutService = () => ({
  total: (amount: number) => amount * SOME_MADE_UP_RATE,
})
