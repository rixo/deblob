// the crossed service identity seals this to assembly (rule 6)
import { createCheckoutService } from "@fixture/billing/checkout.service"
// the crossed model claim is pure for this importer — no `pure` line
import { SOME_MADE_UP_RATE } from "@fixture/billing/totals.model"

export const createConsumerService = () => ({
  rate: SOME_MADE_UP_RATE,
  checkout: createCheckoutService(),
})
