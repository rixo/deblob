// assembly crosses freely — the bottom row of the matrix
import { createCheckoutService } from "@fixture/billing/checkout.service"

export const wire = () => createCheckoutService()
