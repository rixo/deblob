import { expect, test } from "vitest"

import { once, type Snapshot } from "./snapshot.model.ts"

test("once delivers its snapshot at subscription, then nothing", () => {
  const seen: Snapshot[] = []
  const unsubscribe = once({
    generatedAt: "1999-12-31T23:59:59.000Z",
  }).subscribe((snapshot) => seen.push(snapshot))
  unsubscribe()
  expect(seen).toEqual([{ generatedAt: "1999-12-31T23:59:59.000Z" }])
})
