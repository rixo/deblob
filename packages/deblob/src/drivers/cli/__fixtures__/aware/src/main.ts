// assembly crosses freely — the bottom row of the matrix, the sibling's
// declared-assembly entry included
import { createCheckoutService } from "@fixture/billing/checkout.service"
import { createCheckoutService as createFromRun } from "@fixture/billing/run"

export const wire = () => [createCheckoutService(), createFromRun()]
