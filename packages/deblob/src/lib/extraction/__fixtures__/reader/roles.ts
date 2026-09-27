// a spec file's hooks, each for a role or for none, the line pinned by the test
import * as runner from "vitest"
import { afterAll, afterEach, beforeAll, beforeEach, bench, describe, it as spec, test, vi } from "vitest"
import * as other from "some-tech"

vi.mock("./thing.service.ts", () => ({}))
describe("a group", () => {
  beforeAll(() => {})
  beforeEach(() => {})
  spec("states a behavior", () => {})
  test("verifies a row", () => {})
  afterEach(() => {})
  afterAll(() => {})
})
describe.each([1])("a group per row %s", () => {
  spec.skip.each([1])("a behavior per row %s", () => {})
})
runner.it("a behavior through the namespace", () => {})
bench("a benchmark", () => {})
vi.fn(() => 1)
runner.constructor(() => {})
other.it("another tech's it", () => {})
runner["it"]("a computed member", () => {})
;(await import("vitest")).it("through a dynamic import", () => {})
