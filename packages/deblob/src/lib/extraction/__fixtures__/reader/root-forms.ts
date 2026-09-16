// the root statements the reader lists, for an inside kind and an outside one
import { createThing } from "./thing.service.ts"

export const fn = () => createThing()
export function declared() {}
let counter = 0
counter = 1
class Klass {}
enum Color {
  Red,
}
export const frozen = Object.freeze({ SOME_MADE_UP: 1 })
createThing()
describe("root", () => {
  test("hook at root", () => {
    createThing()
  })
})
switch (counter) {
  case 1:
    createThing()
    break
  default:
}
for (const item of [1]) {
  createThing()
}
while (counter > 1) {
  counter -= 1
}
label: {
}
throw new Error("SOME_MADE_UP")
export default { made: "up" }
