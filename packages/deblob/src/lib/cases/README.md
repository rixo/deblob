# cases

The verdict corpus: a rule is proven by a tree of source strings with its red
lines marked, run through the real chain over the memory adapters. A case reads
as code with a verdict next to it, never as a shape of the reading; the reviewer
judges the verdict without opening a detector. ESLint's `RuleTester` and rustc's
UI tests are the precedent.

One spec per check, named after it — `layers.spec.ts`, `dag.spec.ts`,
`modules.spec.ts`, `assembly.spec.ts`, `driver.spec.ts` — the root `describe`
the check's name, rows nested by the canon statement they prove. A spec may open
before its check exists: its rows are written red first, every red a
`missed red` naming the check it waits for (`assembly.spec.ts`, `driver.spec.ts`
today). A row is a `Row`: the sentence the reviewer reads, the tree, the config
and the checks it runs. The whole spec is the table and four lines:

```ts
test.each(ROWS)("$name", async (row) => {
  const { judge } = assembleCase(row.files)
  const { expectedFailures, ...match } = await judge(row)
  if (expectedFailures.length > 0) console.info(expectedFailures.join("\n"))
  expect(match).toEqual(AS_MARKED)
})
```

A row states the right verdict. Where the reader cannot deliver it yet, the line
marks an expected failure — `// false red:` or `// missed red:`, with what it
waits for — and never carries the wrong verdict instead. Expected failures print
under the row's name and fail nothing; one that passes fails the row until its
marker goes. The suite is green on known failures, so a red run means something
changed. (Vitest hides a passing test's console output when it detects an agent
environment; a terminal shows it.)

The test builds its instance and fires it, the way a test is the one kind that
both builds and fires; the test runner is named nowhere else. A row's tree lives
inline until it is too big to read; where a bigger tree goes is ruled then. An
outlier reaches for `check.run` and is a test of its own.

`runner/` is the machinery, a unit of its own with its README: the marker
grammar, the runner service over a check port, the assembly front that wires the
chain over a tree of strings. The corpus files sit in no service — nothing here
but the runner carries a layer suffix — so they open no edge in the service DAG;
the runner imports downward only.
