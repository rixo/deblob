/** The clock a snapshot is stamped with — an ISO timestamp. */

export interface Clock {
  now(): string
}
