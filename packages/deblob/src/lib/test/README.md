# test

The test runner behind a port, so a port's owner can ship the port's own suite —
a conformance kit — without naming a runner or an adapter. Any adapter of that
port, in this package or elsewhere, proves itself by handing the kit the runner
and itself from its own spec.

## Port

- `testing-api.port.ts` — `TestingApi` (mocha's word for the describe/it
  interface; a "suite" is what a `describe` creates): `describe(name, body)`,
  `it(name, body)`, `equal(actual, expected)`, `matches(actual, expected)`. The
  four things a suite says; nothing of the runner's own shape.

## Adapters

- `adapters/vitest-testing-api.adapter.ts` — `createVitestTestingApi()`: the
  port over vitest's `describe`, `it`, `expect(...).toEqual` and
  `toMatchObject`.

## How a port ships its suite

A `<port>-test-suite.service.ts` next to the port:
`create<Port>TestSuite({ api })` → `run({ name, make })`, registering the
sentences under `describe(name)` against a tree the service exports and the
consumer materializes (strings in memory, files in a temp dir — the service
never knows which). An adapter's spec is then a few lines: the vitest testing
API, the adapter, the tree, `run`.

## What it does not do

No fixtures, no assertions of its own, no runner-specific reporting. A spec that
wants more than the four verbs uses vitest directly, as any spec does.
