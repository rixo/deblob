# cases

The verdict corpus: a rule is proven by a tree of source strings with its red
lines marked, run through the real chain over the memory adapters. A case reads
as code with a verdict next to it, never as a shape of the reading; the reviewer
judges the verdict without opening a detector. ESLint's `RuleTester` and rustc's
UI tests are the precedent.

One spec per check, named after it — `layers.spec.ts`, `dag.spec.ts`, the
outside checks as they land — the root `describe` the check's name, rows nested
by the canon statement they prove. A row is a `Row`: the sentence the reviewer
reads, the tree, the config and the checks it runs. The whole spec is the table
and two lines:

```ts
test.each(ROWS)("$name", async (row) => {
  const { judge } = assembleCase(row.files)
  expect(await judge(row)).toEqual(AS_MARKED)
})
```

The test builds its instance and fires it, the way a test is the one kind that
both builds and fires; the test runner is named nowhere else. A row's tree lives
inline until it is too big to read; where a bigger tree goes is ruled then. An
outlier reaches for `check.run` and is a test of its own.

`runner/` is the machinery, a unit of its own with its README: the marker
grammar, the runner service over a check port, the assembly front that wires the
chain over a tree of strings. The corpus files sit in no service — nothing here
but the runner carries a layer suffix — so they open no edge in the service DAG;
the runner imports downward only.
