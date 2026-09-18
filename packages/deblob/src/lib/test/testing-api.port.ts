/**
 * The testing API as a port — mocha's word for the describe/it interface: what
 * a port's suite needs to register its sentences and state its expectations,
 * and nothing of the runner's own shape. A port's owner writes the suite
 * against this; an adapter's spec hands it the runner and the adapter.
 */
export interface TestingApi {
  /** A group of sentences about one unit. */
  describe(name: string, body: () => void): void
  /** One sentence about the unit, its body the proof. */
  it(name: string, body: () => Promise<void> | void): void
  /** The actual equals the expected, structurally. */
  equal(actual: unknown, expected: unknown): void
  /** The actual carries at least the expected's members. */
  matches(actual: unknown, expected: object): void
}
