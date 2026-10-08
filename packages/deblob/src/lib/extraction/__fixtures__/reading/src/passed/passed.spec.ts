import { join, test } from "./builtin.suite.ts"
import { test as claimed } from "./claimed.suite.ts"
import { test as lost } from "./lost.suite.ts"

test("the runner's function, from a builtin module", () => {})
join("a", "b")
claimed("the claimed file's function", () => {})
lost("a function whose import lands nowhere", () => {})
