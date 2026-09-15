/** Reports kept in memory, in order, for the caller to read. */

import type { Report } from "../ports/report.port.ts"

export const createMemoryReport = () => {
  const reported: unknown[] = []
  const report: Report = (error) => {
    reported.push(error)
  }
  return { report, reported: reported as readonly unknown[] }
}
