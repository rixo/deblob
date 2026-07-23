import type { Charge } from "../billing/billing.model.ts"

export type Invoice = { total: number; charges: Charge[] }
