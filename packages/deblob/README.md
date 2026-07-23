# deblob

Machine-checkable hexagonal architecture for TypeScript/ESM: layer matrix,
composition rules, visibility boundaries — checked in CI, without an agent.

deblob detects; it never moves code. Moving code into layers is judgment, and
judgment stays with you (or your agent). What the tool gives you is a mechanical
guarantee over the code that opts in: labeled files honor their layer's
constraints, or CI says exactly which rule broke and why. Unlabeled code is
**blob** — legal, unchecked; labeling is adoption, not a prerequisite.

## Commands

```
deblob                    project status + discovery
deblob check [what...]    run architecture checks (default: all)
deblob explain <topic>    explain a rule or check (rule-4, layers, ...)
```

- **`deblob`** prints the inventory — file count, total size, blob %
  (size-weighted, hence the size in the headline), and service count — plus
  where to go next. Informational by contract: always exits 0, so a stray run
  can never fail a build.
- **`deblob check`** is the gate. Checks in v0: `dag` (service cycles over every
  import kind, runtime module cycles — rules 13, 14), `layers` (dependency
  matrix, rules 1, 4–9), `private` (rule 12), `barrels` (rule 2), `ports` (rule
  10). All run over one shared import graph. Exit codes: `0` clean, `1`
  violations found, `2` usage or config error.
- **`deblob explain rule-4`** prints the rule's rationale and the shipped
  knowledge card — offline, version-matched with the binary.
  `deblob check --explain` appends the explanation of every rule that fired; a
  CI log becomes self-teaching in one run.

Violations cite their rule and print the offending edge:

```
src/invoice
  pdf-render.service.ts
    layers   imports node:fs — service layer cannot depend on concrete;
             import type is fine (rules 4, 8)
```

Not in v0, on purpose: autofix (never — a value boundary, not a deferral),
`--json`/`--sarif` (staged refinement).

## Configuration

Optional. No config file at all resolves to honest defaults: the stock
`ts-suffixes-factories` flavor, whole-tree coverage. When you need one,
`deblob.config.ts` at the project root (TS loads natively — Node ≥ 22.18,
erasable syntax only):

```ts
import { defineConfig } from "deblob"

export default defineConfig({
  include: ["src/**"],
  assembly: ["src/main.ts"],
  pureLibs: ["zod"],
})
```

The six keys, all optional:

| Key              | Default                   | Meaning                                                                                   |
| ---------------- | ------------------------- | ----------------------------------------------------------------------------------------- |
| `flavor`         | `"ts-suffixes-factories"` | Architecture style — a stock name, or a custom `FlavorResolver` exported from the config  |
| `assembly`       | `[]`                      | Globs designating composition roots — privilege is declared, not presumed                 |
| `include`        | `["**"]`                  | Coverage globs; under-coverage is a silent hole, so the default covers everything         |
| `exclude`        | `[]`                      | Appended to a non-removable baseline (`node_modules`, `dist`, …); never replaces it       |
| `pureLibs`       | `[]`                      | Rule-4 allowlist: package names and builtin specifiers ratified as pure                   |
| `typeOnlyExempt` | flavor's stance (`true`)  | `false` = strict: type-only imports lose their rule-8 exemption; knobs only tighten canon |

Discovery walks upward from cwd; the nearest config wins and its directory
becomes the project root. No merging, no inheritance. `-c/--config <path>`
overrides the walk.

A declared `pureLib` is trusted, not verified — the guarantee is only as good as
the config review. Unlisted third-party imported from a pure layer fires as
unclassified: one config line fixes a false positive; the reverse default would
be a silent hole.

## Why each rule exists

`deblob explain <rule>` ships the answer with the binary. The full theory:
[docs/architecture.md](https://github.com/rixo/deblob/blob/main/docs/architecture.md).
