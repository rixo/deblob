import { afterEach, expect, test, vi } from "vitest"

// the entry runs on import; each test evaluates it afresh
afterEach(() => {
  vi.resetModules()
  document.body.replaceChildren()
})

test("the entry refuses to run without #app", async () => {
  await expect(import("./main.ts")).rejects.toThrow("no #app element")
})

test("the entry mounts the app on #app", async () => {
  const target = document.createElement("div")
  target.id = "app"
  document.body.append(target)

  await import("./main.ts")

  expect(target.querySelector("main")).not.toBeNull()
  expect(target.textContent).toContain("loading")
})
