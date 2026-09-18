---
captured: 2026-09-18
from: driver-layer step 04, checkpoint 2
---

# A port with several adapters wants one suite

**Problem.** A port has more than one adapter, in your codebase or in someone
else's. Every adapter must promise the same things, and you want those promises
stated once, not once per adapter. The obvious places are all wrong: a spec next
to the port that imports the adapters knows things a port may not know (a
third-party adapter could never enrol in it); a spec per adapter duplicates the
table; a shared helper the specs import is test code with no layer, which every
check lets through and no rule can place.

**The move.** The port owns its suite, and the test runner is a port. Declare a
tiny `TestingApi` port in a root `test` unit, the four things a suite says:
`describe`, `it`, `equal`, `matches`, with one adapter over your runner. Next to
the port, write a conformance service: it exports the tree its sentences read
and a factory taking the suite port, whose `run({ name, make })` registers the
sentences under the adapter's name. Each adapter's own spec materializes the
tree where that adapter reads, a temp dir or strings, and runs the kit.
Adapter-specific behaviors stay as that spec's own sentences.

**Why it is right.** The service knows the contract and the sentences, never a
runner nor an adapter. The spec is the one kind that builds and fires, so it is
the spec that supplies both. A third-party adapter conforms with the same six
lines in its own repository, against a kit the port ships.

**The instance in deblob.** Two ports had grown a second adapter: `Fs` (disk,
memory) and `Resolver` (oxc-resolver, a resolver over the fs port).

```ts
// lib/test/testing-api.port.ts
export interface TestingApi {
  describe(name: string, body: () => void): void
  it(name: string, body: () => Promise<void> | void): void
  equal(actual: unknown, expected: unknown): void
  matches(actual: unknown, expected: object): void
}

// lib/fs/fs-test-suite.service.ts
export const FS_TREE = { "src/app.model.ts": "export const A = 1\n" /* … */ }
export const createFsTestSuite = ({ api }: { api: TestingApi }) => ({
  run: ({
    name,
    make,
  }: {
    name: string
    make: () => Promise<{ fs: Fs; root: string }>
  }) => {
    api.describe(name, () => {
      api.it("stats null for a missing path, and for a directory", async () => {
        const { fs, root } = await make()
        api.equal(await fs.stat(join(root, "src/deep")), null)
      })
      // … seven more
    })
  },
})

// lib/fs/adapters/memory-fs.adapter.spec.ts — the whole spec
createFsTestSuite({ api: createVitestTestingApi() }).run({
  name: "createMemoryFs",
  make: async () => ({
    fs: createMemoryFs(under("/made-up-root", FS_TREE)),
    root: "/made-up-root",
  }),
})
```

**Where.** `lib/test/`, `fs/fs-test-suite.service.ts`,
`extraction/resolver-test-suite.service.ts`, the four adapter specs.
