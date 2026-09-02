---
source: README.md · packages/deblob/README.md (Commands, Configuration)
---

# Setup — adopting deblob in a repo

Wiring, once per repo. Nothing here is needed while writing code.

## What ships where

Two artifacts, installed independently:

- **Skills** (this directory) — plain markdown, no runtime, no dependencies.
  `npx skills add rixo/deblob`, or copy the files. If you're reading this,
  they're installed. Triggering: description match, or explicit invocation
  (`/deblob`) when it doesn't fire.
- **CLI** — npm package `deblob` (early 0.0.x). Machine-checks the mechanical
  rules: dependency DAG, layer matrix, composition, visibility. Skills carry
  judgment; the CLI carries determinism. Without it the rules are unenforced
  prose — the skill still works, nothing verifies it.

## CLI

```sh
npm i -D deblob    # or pnpm add -D deblob / yarn add -D deblob
npx deblob         # status: inventory, blob % — informational, always exits 0
npx deblob check   # the gate: dag, layers, private, barrels, ports
```

Node ≥ 22.18. `check` exit codes: `0` clean, `1` violations, `2` usage or config
error. `deblob explain <rule>` (or `deblob check --explain`) prints each fired
rule's rationale offline.

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
  pureLibs: ["zod"], // rule-4 allowlist — trusted, not verified
})
```

Resolution follows `tsconfig.json` at the project root (`paths` aliases);
bundler-only aliases go in the `alias` key; modules the environment provides
with nothing on disk (`$theme/config` from a vite plugin, `cloudflare:workers`)
go in `external` as specifier patterns — not path globs: `**` crosses `/`
(`$theme:**` = the namespace), `*` does not; a declared external is concrete
unless its pattern is also in `pureLibs`. An unresolvable import fails `check`
with exit 2 — the graph would be incomplete, so the run refuses to certify. Full
key reference: the installed package's own README
(`node_modules/deblob/README.md`).

## Monorepos

One package = one run root = at most one config. Sibling packages are external
by design: the exports map is the package saying "contract here, internals
sealed" — same statement `private/` makes one level down. No cross-package graph
exists.

- `deblob.config.ts` per checked package; run per package
  (`pnpm -r run check:arch`, turbo, …). Discovery walks upward from cwd, nearest
  config wins.
- Never a discoverable config (`deblob.config.{ts,js,mjs}`) at the repo root —
  it silently captures every package lacking its own, with the wrong root and
  repo-wide coverage.
- Shared settings: configs never merge, but they're native TS — compose in
  userland. A root `deblob.config.base.ts` (discovery matches only the exact
  names `deblob.config.{ts,js,mjs}` — a `.base` suffix is never picked up)
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

- Workspace siblings classify like any third-party: pure ones go in `pureLibs`
  (trusted, not verified), effectful ones go behind a port.
- The external-treatment premise assumes imports go through the package
  boundary. Deep imports into sibling source (`@scope/lib/src/…`) resolve
  outside the run root and become external leaves — fence them with lint if your
  repo allows them at all.

## CI

Run `deblob check` alongside typecheck and tests. Adoption is incremental:
unlabeled files are blob — legal, unchecked — so the gate goes in before the
codebase is fully labeled; it guards whatever has opted in.
