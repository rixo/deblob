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
- **`deblob check`** is the gate. Checks: `dag` (service cycles over every
  import kind, runtime module cycles — rules 13, 14), `layers` (dependency
  matrix, rules 1, 4–9), `private` (rule 12), `barrels` (rule 2), `ports` (rule
  10), `surface` (the exports map matches the layers it fronts — only for
  packages declaring `"deblob": {}` in package.json; rules 2, 3). All run over
  one shared import graph. Exit codes: `0` clean, `1` violations found, `2`
  usage or config error — and the two uncertifiable runs: an import that did not
  resolve, an exports entry `surface` could not reach.
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

Not in v0, on purpose: autofix (not deblob's job — fixing belongs to whoever
holds the context, agent or human; a gate that ships its own fixes grades its
own homework, and its green stops being evidence), `--json`/`--sarif` (staged
refinement).

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

The eleven keys, all optional:

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
| `externalLayers` | `{}`                      | Specifier pattern → layer: cross-package identity declared by hand; wins over a producer's `deblob` field — `blob` revokes a claim  |
| `build`          | `"dist"`                  | The output directory mirroring `src/` one-to-one, so `surface` reaches source through built exports; `{ mirror: {…} }` for several  |

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

Across package boundaries, layer identity travels while everything else stays
sealed: each package's gate covers its own interior, and a package declaring
`"deblob": {}` in its package.json claims that the stock naming rule holds on
its exports surface — `@repo/billing/checkout.service` is a service, sealed to
assembly for every consumer; `@repo/billing/totals.model` is a model, pure for
your model layer with no `pureLibs` line. Flavors classify locally; layers
travel: the consumer reads results, never the producer's machinery, and only for
subpaths the producer's exports map lists — an import that reaches around the
map is unlabeled, as any deep import. The claim is trusted the way the code is —
you already run it and trust its versioning; a stale field is a stale semver, no
worse — and `externalLayers` is the override, `blob` the word that revokes a
claim you do not buy. For packages that declare nothing, `externalLayers`
patches identity by hand, and an unlabeled external behaves exactly as before —
nothing is demanded from anyone who does not opt in.

The field is a checked claim, not marketing. The producer's own `surface` check
resolves every exports entry to a source module — source paths directly, built
paths through the `build` mirror (`dist/index.js` → `src/index.ts`, extensions
stripped, exact match only; no build needs to exist on disk) — and verifies the
subpath's naming against the file's layer, following re-export chains so an
unlabeled root cannot front a service. A pattern entry (`"./*": "./dist/*.js"`)
expands the way Node resolves it, over your source: every module the star can
bind is judged under the subpath it gets. The mirror is your promise that the
build is one-to-one, not something the tool measures; a bundled package has no
honest mirror and says `build: false`. What the mirror cannot reach is not
guessed and not judged: the run reports the entry as unverified, names the two
remedies, and exits 2 — no green until it is mapped, or disclosed. Disclosure is
public: `"deblob": { "blob": ["./legacy/**"] }` lists the subpaths the field
does not cover; they classify as unlabeled abroad, exactly as if the package had
no field, and the claim reads precisely — every subpath not listed is verified
at the producer's gate.

## Why each rule exists

`deblob explain <rule>` ships the answer with the binary. The full theory:
[docs/architecture.md](https://github.com/rixo/deblob/blob/main/docs/architecture.md).
