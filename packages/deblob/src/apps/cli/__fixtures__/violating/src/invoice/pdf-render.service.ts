import { readFileSync } from "node:fs"

import type { Invoice } from "./invoice.model.ts"

export const renderPdf = (invoice: Invoice): string =>
  readFileSync("/SOME_MADE_UP_PATH", "utf8") + String(invoice.total)
