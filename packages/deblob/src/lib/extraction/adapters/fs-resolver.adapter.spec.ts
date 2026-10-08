import { join } from "node:path"

import { createMemoryFs } from "../../fs/adapters/memory-fs.adapter.ts"
import { RESOLVER_TREE, describeResolver } from "../resolver.suite.ts"
import { createFsResolver } from "./fs-resolver.adapter.ts"

const ROOT = "/made-up-root"

// the tree as strings: the fs-port resolver reads nothing else
describeResolver("createFsResolver", async () => ({
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
}))
