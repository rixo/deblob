import { join } from "node:path"

import { createMemoryFs } from "../../fs/adapters/memory-fs.adapter.ts"
import { createVitestTestingApi } from "../../test/adapters/vitest-testing-api.adapter.ts"
import {
  RESOLVER_TREE,
  createResolverTestSuite,
} from "../resolver-test-suite.service.ts"
import { createFsResolver } from "./fs-resolver.adapter.ts"

const ROOT = "/made-up-root"

createResolverTestSuite({ api: createVitestTestingApi() }).run({
  name: "createFsResolver",
  // the tree as strings: the fs-port resolver reads nothing else
  make: async () => ({
    resolver: createFsResolver({
      fs: createMemoryFs(
        Object.fromEntries(
          Object.entries(RESOLVER_TREE).map(([path, content]) => [
            join(ROOT, path),
            content,
          ]),
        ),
      ),
    }),
    root: ROOT,
  }),
})
