---
source: README.md · packages/deblob/README.md (Commands, Configuration)
---

# Setup — adopting deblob in a repo

Wiring, once per repo. Nothing here is needed while writing code.

## What ships where

Two artifacts, installed independently:

- **Skills** (this directory) — plain markdown, no runtime, no dependencies.
  `npx skills add rixo/deblob`, or copy the files. Triggering: description
  match, or explicit invocation (`/deblob`) when it doesn't fire.
- **CLI** — npm package `deblob` (early 0.0.x). Machine-checks the mechanical
  rules: dependency DAG, layer matrix, composition, visibility. Skills carry
  judgment; the CLI carries determinism. Without it the rules are unenforced
  prose — the skill still works, nothing verifies it.

## CLI

```sh
npm i -D deblob    # or pnpm add -D deblob / yarn add -D deblob
npx deblob         # status: inventory, blob % — informational, always exits 0
npx deblob check   # the gate: dag, layers, private, barrels, ports, surface
```

Node ≥ 22.18. `check` exit codes: `0` clean, `1` violations, `2` usage or config
error, or a run that cannot certify (an unresolved import, an exports entry
`surface` cannot reach — stderr names the remedy). `deblob explain <rule>` (or
`deblob check --explain`) prints each fired rule's rationale offline. `surface`
runs only when package.json carries a `deblob` field (Monorepos below).

Wire it as a package script so agents and CI share one invocation:

```json
"scripts": { "check:arch": "deblob check" }
```

## Configuration

Optional. No config file = stock `ts-suffixes-factories` flavor, whole-tree
coverage. When needed, `deblob.config.ts` at the project root:

```ts
import { defineConfig } from "deblob"

export default defineConfig({
  include: ["src/**"],
  assembly: ["src/main.ts"], // composition roots — privilege is declared
  pure: ["zod"], // rule-4 allowlist — trusted, not verified
})
```

Resolution follows `tsconfig.json` at the project root (`paths` aliases);
bundler-only aliases go in the `alias` key; modules the environment provides
with nothing on disk (`$theme/config` from a vite plugin, `cloudflare:workers`)
go in `external` as specifier patterns — not path globs: `**` crosses `/`
(`$theme:**` = the namespace), `*` does not; a declared external is concrete
unless its pattern is also in `pure`. An unresolvable import fails `check` with
exit 2 — the graph would be incomplete, so the run refuses to certify. Full key
reference: the installed package's own README (`node_modules/deblob/README.md`).

## Monorepos

One package = one run root = at most one config. A sibling package is an
external: never parsed through, its exports map is its seal — the statement
`private/` makes one level down. What crosses the boundary is layer identity,
declared by the producer and read from the specifier tail:
`@repo/billing/checkout.service` is a service for every importer, sealed to
assembly.

- `deblob.config.ts` per checked package; run per package
  (`pnpm -r run check:arch`, turbo, …). Discovery walks upward from cwd, nearest
  config wins.
- Never a discoverable config (`deblob.config.{ts,mts,js,mjs}`) at the repo root
  — it silently captures every package lacking its own, with the wrong root and
  repo-wide coverage.
- Shared settings: configs never merge, but they're native TS — compose in
  userland. A root `deblob.config.base.ts` (discovery matches only the exact
  names `deblob.config.{ts,mts,js,mjs}` — a `.base` suffix is never picked up)
  exports the shared keys — or publish them from an internal package
  (`@repo/deblob-config`, turborepo-style); each package spreads it:

  ```ts
  import { defineConfig } from "deblob"
  import { base } from "../../deblob.config.base.ts"

  export default defineConfig({
    ...base,
    include: ["src/**"],
    assembly: ["src/main.ts"],
  })
  ```

- **Producer side** — declare the field and export suffixed subpaths. The field
  claims "the stock naming rule holds on my exports surface"; the package's own
  `deblob check` gains `surface`, which verifies each entry's suffix against the
  layer of the file it reaches:

  ```json
  {
    "deblob": {},
    "exports": {
      ".": "./dist/index.js",
      "./checkout.service": "./dist/checkout.service.js",
      "./totals.model": "./dist/totals.model.js"
    }
  }
  ```

  Built targets reach source through the `build` mirror: `dist/` ↔ `src/`
  one-to-one by default, `build: "build"` for another root,
  `{ mirror: { "dist/esm": "src", … } }` for several. Pattern entries
  (`"./*": "./dist/*.js"`) expand over source the way Node resolves them. The
  mirror is your promise that the build is one-to-one, never measured — a
  bundled package sets `build: false` and lists source targets or discloses. An
  entry the mirror cannot reach exits 2; the stderr block names the remedies. A
  subpath is one claim across its conditions: one reaching target verifies it (a
  hybrid build's `.d.ts` under the mirror covers its bundled `.js`). Disclosing
  — `"deblob": { "blob": ["."] }` — retracts the claim for that subpath:
  unlabeled abroad, as with no field. `blob` means "not claimed", no more:
  markdown or asset subpaths belong there too. The bare root `.` claims nothing;
  a fat root barrel is a blob surface, never a service.

- **Entry points are normal.** A composition root that imports services and
  adapters, wires them, and exports its own API passes `surface` as is: the
  check follows re-export edges only. What fires is a subpath re-exporting a
  service or adapter unlabeled (`export * from "./report.service"` under
  `./cli`). Three honest exits: put the layer on the subpath
  (`./report.service`), compose instead of re-exporting, or say what the entry
  is — `"deblob": { "assembly": ["./cli"] }` designates it wiring, sealed to
  every consumer's wiring like an in-set assembly file and, like one, never
  verified; `blob` retracts instead, and consumers treat it like any third-party
  package. A CLI's `assembly` list reads as its inventory of entry points.

- **Consumer side** — nothing to configure. Workspaces (pnpm/npm/yarn)
  materialize siblings as node_modules symlinks and the resolver follows them;
  no `alias` key (yarn PnP untested). A sibling's `.service`/`.adapter` subpath
  is assembly-only for you (rules 6/7, `import type` exempt) — import it from
  assembly or go through your own port
  ([crossing-services](crossing-services.md)); never add it to `pure`. A
  sibling's `.model`/`.port` subpath is pure for your model layer with no `pure`
  line: the claim is trusted the way the code is.
- **Override** — `externalLayers` maps specifier patterns to layers by hand:
  identity for packages declaring nothing, and it wins over a producer's field.
  Reviewed like `pure`. Mapping a subpath to `blob` revokes a claim you do not
  buy.
- The config's `assembly` globs designate composition roots at home; they never
  silence rule 2 on a re-export barrel — an unlabeled entry fronting a service
  or adapter is exactly what `surface` fires on. The field's `assembly` list is
  the word for that, because it seals the subpath abroad. Both deserve
  `pure`-grade review.
- The external-treatment premise assumes imports go through the package
  boundary. Deep imports into sibling source (`@scope/lib/src/…`) resolve
  outside the run root and become unlabeled external leaves — the producer's
  field covers its exports surface only — so fence them with lint if your repo
  allows them at all.

## CI

Run `deblob check` alongside typecheck and tests. Adoption is incremental:
unlabeled files are blob — legal, unchecked — so the gate goes in before the
codebase is fully labeled; it guards whatever has opted in.
