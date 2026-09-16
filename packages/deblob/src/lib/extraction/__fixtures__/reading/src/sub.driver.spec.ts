import { test } from "vitest"

import { registerSub } from "./sub.driver.ts"

// a test-file call site: hands fakes of unknown kind — no evidence of what
// production hands, so it must not veto the production site's bindings
test("registers the sub-driver on a fake", () => {
  registerSub(SOME_MADE_UP_CLI as never, SOME_MADE_UP_SERVICES as never)
})

declare const SOME_MADE_UP_CLI: unknown
declare const SOME_MADE_UP_SERVICES: unknown
