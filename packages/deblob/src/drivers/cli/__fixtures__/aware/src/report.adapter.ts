// the sibling declared this subpath assembly in its field: wiring, sealed to
// wiring — an adapter importing it fires rule 1, where an unlabeled entry
// would have passed as SDK-like
import { createCheckoutService } from "@fixture/billing/run"

export const createReportAdapter = () => createCheckoutService()
