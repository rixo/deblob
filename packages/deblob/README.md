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
deblob                       project status + discovery
deblob check [what...]       run architecture checks (default: all)
deblob explain <topic...>    explain rules or checks (4, layers, ...)
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
  knowledge card — offline, version-matched with the binary. Several topics at
  once work too: the check footer prints the fired rules as a pasteable
  `deblob explain 4 12 13`. `deblob check --explain` appends the explanation of
  every rule that fired; a CI log becomes self-teaching in one run.

Violations cite their rule and print the offending edge:

```
src/invoice
  src/invoice/pdf-render.service.ts
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

The nine keys, all optional:

| Key              | Default                   | Meaning                                                                                                                             |
| ---------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `flavor`         | `"ts-suffixes-factories"` | Architecture style — a stock name, or a custom `FlavorResolver` exported from the config                                            |
| `assembly`       | `[]`                      | Globs designating composition roots — privilege is declared, not presumed                                                           |
| `include`        | `["**"]`                  | Coverage globs; under-coverage is a silent hole, so the default covers everything                                                   |
| `exclude`        | `[]`                      | Appended to a non-removable baseline (`node_modules`, `dist`, …); never replaces it                                                 |
| `pureLibs`       | `[]`                      | Rule-4 allowlist: package names, builtin specifiers, and declared `external` patterns ratified as pure                              |
| `typeOnlyExempt` | flavor's stance (`true`)  | `false` = strict: type-only imports lose their rule-8 exemption; knobs only tighten canon                                           |
| `tsconfig`       | `tsconfig.json` at root   | The tsconfig feeding resolution (`paths` aliases); a path, or `false` to disable — a declared path that doesn't exist fails loud    |
| `alias`          | `{}`                      | Resolver aliases living outside tsconfig (bundler config); teaches resolution, never suppresses failures                            |
| `external`       | `[]`                      | Specifier patterns the environment provides with nothing on disk (`$theme:**`, `cloudflare:*`) — matches are leaves, never resolved |

Discovery walks upward from cwd; the nearest config wins and its directory
becomes the project root. No merging, no inheritance. `-c/--config <path>`
overrides the walk.

A declared `pureLib` is trusted, not verified — the guarantee is only as good as
the config review. Unlisted third-party imported from a pure layer fires as
unclassified: one config line fixes a false positive; the reverse default would
be a silent hole.

An import that fails to resolve fails the run: `check` exits `2` — not `1`,
because the fault may be the run's world (unwired tsconfig, missing install,
bundler-only alias, environment-provided module) rather than the code — and
lists each offender with the remedies. A green check thereby certifies a
complete graph. Non-literal dynamic imports (`import(expr)`) are exempt:
unresolvable by construction, never a missing edge.

A module the environment provides with nothing on disk — a vite plugin serving
`$theme/config`, a runtime exposing `cloudflare:workers`, a `npm:` or URL
specifier — is declared, not aliased: `external` holds patterns over the
specifier as written, and a match is a known leaf. Resolvable packages need no
entry. A declared external counts concrete by default; to ratify it pure, list
the same pattern in `pureLibs` — the pattern is the leaf's identity, matched
verbatim like a package name. Patterns are not path globs (a specifier is one
string): `**` matches any characters, `/` included — `$theme:**` is the whole
namespace — and `*` matches anything but `/`. Not covered yet: teaching the
resolver a bundler `exports` condition (`browser`, `svelte`); until a
`conditions` key exists, `external` is the workaround.

## Why each rule exists

`deblob explain <rule>` ships the answer with the binary. The full theory:
[docs/architecture.md](https://github.com/rixo/deblob/blob/main/docs/architecture.md).
