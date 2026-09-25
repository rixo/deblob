import { describe, expect, it } from "vitest"

import { createMemoryFs } from "../../fs/adapters/memory-fs.adapter.ts"
import { createFsReadmeTexts } from "./fs-readme-texts.adapter.ts"

describe("createFsReadmeTexts", () => {
  const { readmeTextsOf } = createFsReadmeTexts({
    fs: createMemoryFs({
      "/FAKE_ROOT/README.md": "# root",
      "/FAKE_ROOT/src/lib/README.md": "# lib",
      "/FAKE_ROOT/src/lib/a.ts": "",
    }),
  })

  it("reads the README.md of each directory given, `.` being the root, and leaves out a directory without one", async () => {
    expect(await readmeTextsOf("/FAKE_ROOT", [".", "src", "src/lib"])).toEqual({
      ".": "# root",
      "src/lib": "# lib",
    })
  })
})
