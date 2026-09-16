// a globals-mode runner: no import, the registration names are free globals
describe("globals mode", () => {
  test("registers without an import", () => {
    expect(1).toBe(1)
  })
})
