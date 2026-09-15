# Step 03 — the outside rules in `deblob check`

Draft opened 2026-09-15 from the canon review, before steps 01 and 02 exist: the
check-side feature had no card and the GOAL requires it ("the checker enforces
them on itself"). API below is a proto, to ratify when the step opens for real;
it is written against the code as of 0.0.6 and the canon as of this review.

## Goal

`deblob check` reports every rule canon states for the outside kinds — assembly,
driver, boot, test — with the same identity discipline as the existing rules:
one slug per rule, a structured violation per finding, an `explain` entry per
slug. The undeclared-load violation names its resolution. deblob's own package
is green under them once step 04 lands.

Depends on: step 01 (recognition of the kinds, hook cutting, the assembly and
hook readers, the load declaration read from config), step 02 (what a factory is
— until then the model-callee case and the root-factory-call check stay
unimplemented and say so).

## API (proto)

### Config keys

Each mirrors `assembly`: root-relative globs, suffix recognition always on.

- `boot?: readonly string[]` — files a framework names as entry (`.boot.ts` by
  suffix regardless).
- `drivers?: readonly string[]` — framework entry points (`.driver.ts` by suffix
  regardless). The spike's shape.
- `tests?: readonly string[]` — the test kind. Default: the runner's own
  pattern, `**/*.{spec,test}.?(c|m)[jt]s?(x)`.
- `loads?: string | readonly string[]` — declared loads, `"<file>#<name>"`: the
  service file whose factory built the instance, and the use case's name on its
  API. One or a list; any assembly may await any of them.
- `tech?: readonly string[]` — packages a driver may import as tech beyond what
  the readings claim: the escape hatch for a technology without a reading (the
  file is a driver, nothing in it is cut, its imports are bounded). Each reading
  claims its own packages; a driver's external import claimed by neither is
  `driver-calls-services-only` with this key as the resolution.

### Kinds

`Layer` (extraction) gains `driver`, `boot`, `test`. A closed union, so every
`switch` over it is exhaustive by the compiler; the matrix rows in `checkLayers`
grow with it (the Drivers, Boot and Test rows of canon; blob importable by
test).

### Rule slugs

Enter `RULE_IDS` at their family's position, canon § Summary order:

- assembly rules: `assembly-builds-only`, `assembly-driver-only`
- driver rules: `wiring-outside-hooks`, `one-call-per-hook`,
  `driver-calls-services-only`, `driver-defines-hooks-only`,
  `driver-to-driver-wiring`, `driver-not-imported`
- boot rule: `boot-one-call`
- testing: `test-is-assembly-and-driver` replaces `test-setup-assembly`
  (breaking; step 05 carries the rename everywhere)
- `stateless-modules` keeps its slug and gets its first detector: a root call to
  a factory (needs step 02), a root call into tech or a composition unit,
  mutable root state; test registration exempt by the test tech's reading.

### Violations

Three new members of the `Violation` union, same conventions (no prose, every
fact rendering needs):

- `AssemblyViolation` — `check: "assembly"`; `file`; `shape`: `non-factory-call`
  (with `callee`), `undeclared-load` (with `callee` and `declaredLoads`, so the
  renderer can say "declare it under `loads` if it is a config load"),
  `instance-condition` (a branch or loop reading an instance), `definition`,
  `root-content`.
- `DriverViolation` — `check: "driver"`; `file`; `hook` (the cut hook's span, or
  `null` for wiring); `shape`: `call-count` (with the count), `callee-kind`
  (adapter, model, blob, or a hook of another driver), `unclaimed-tech` (with
  the package, so the renderer names the `tech` key), `definition`,
  `driver-import` (a driver imported for anything but its wiring function),
  `imported-by` (a non-driver, non-boot importer).
- `BootViolation` — `check: "boot"`; `file`; `shape`: `import-count`,
  `call-count`, `content` (a definition, a held value, tech), `imported-by`.

Per-tech exemptions never produce a violation: the tech's reading removes the
exempt hooks or calls before the detector runs.

### Detectors

`checkAssembly(graph, { loads })`, `checkDriver(graph)`, `checkBoot(graph)`,
pure over the classified graph plus the reader's cut (hooks, calls, definitions
per file) that step 01 puts on the graph. Check names `assembly`, `driver`,
`boot` join `KNOWN_CHECKS`; `explain <check>` lists their rules.

### Explain

`RULE_CARDS` is total over `RuleId`, so every new slug maps to a card: new
knowledge cards `assembly-rules`, `driver-rules`, `boot-rule` under
`skills/deblob/knowledge/`, mirrored in the INDEX (the suite tests the mirror).

## Testing (sketch)

- Per detector, fixtures per shape, one violation each; the green fixture is
  deblob's own restructured CLI (step 04).
- Undeclared load: the same assembly fixture with and without the `loads`
  declaration, one violation then none.
- Tripwire for the open set of tech: a fixture with a synthetic file kind the
  reader does not know, which the detectors must pass through untouched.
- Exhaustiveness on `Layer` and `RuleId` is the compiler's; `RULE_CARDS` and the
  INDEX mirror are the existing suite's.

## Implementation

After steps 01 and 02. Nothing here yet.

## Docs

`lib/check/README.md` gains the three detectors; `lib/config/README.md` the four
keys; the skill's knowledge INDEX the three cards; `docs/architecture.md`
unchanged (canon precedes this step).
