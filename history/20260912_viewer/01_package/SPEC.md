# Step 01 — the package

## Goal

`packages/viewer` exists as `@deblob/viewer`: a Svelte app on Vite, wired into
the workspace, with the one shape decision this chapter makes upfront — the app
takes a stream of snapshots — proven by a test that pushes a second snapshot.
Nothing drawn, no dependency on `deblob` in either direction.

Success: `pnpm --filter @deblob/viewer` runs `typecheck`, `test` (100% through
the contract), `build`, and `check` (deblob on itself) green, and CI runs them.

## API

- **`Snapshot`** (model) — what the viewer displays. Step 01 carries a single
  field, `generatedAt` (ISO timestamp). The real contract is open (chapter
  PLAN); this is a stamp, not a first draft of it.
- **`SnapshotSource`** (model) — `subscribe(listener) => unsubscribe`, the
  listener called with the current snapshot at subscription and on every later
  one. Structurally a Svelte store, so components read it as `$source`; no
  import from `svelte` in the model.
- **`once(snapshot)`** (model) — static delivery as a stream of one. Knowledge
  of the snapshot model, so it is tested there and the assembly stays wiring.
- **`App.svelte`** — one prop, `source: SnapshotSource`; renders the stamp.
- **`src/main.ts`** — assembly: mounts `App` on `#app` with a `once` of the
  current time; throws when `#app` is missing. The Vite entry.

## Testing

Step 01 proves the package only. The chapter's strategy — manual exploration
over configured projects, a corpus test over any banked snapshot, self-extract
in CI — is ruled in the chapter PLAN § Decisions and starts with the data half.

- `App.spec.ts`, jsdom: mount with a hand-rolled source, assert the stamp; push
  a second snapshot, assert the DOM shows the new one. The reactivity claim of
  the chapter, mechanically.
- `main.spec.ts`: the entry mounts on a prepared `#app`, and refuses to run
  without one — no coverage exclusion for the assembly. The entry runs on
  import, so the module registry is reset between the two tests.
- `snapshot.model.spec.ts`: `once` delivers at subscription, unsubscribe is a
  no-op.
- Coverage thresholds at 100% like `deblob`; `deblob check` green with
  `assembly: ["src/main.ts"]`; `.svelte` files enter as blob (chapter PLAN §
  Open).

## Implementation

Landed 2026-09-12:

- Deps, exact-pinned like `deblob`'s engine: `svelte` 5.57.0, `vite` 8.3.0,
  `@sveltejs/vite-plugin-svelte` 7.3.0, `vitest` 5.0.0 with
  `@vitest/coverage-v8` 5.0.0 (Vitest 5 pairs with Vite 8), `jsdom` 30.0.1,
  `typescript` 7.0.2. `svelte-check` tried and not taken (chapter PLAN § Open).
  `deblob` as a `workspace:*` devDependency for the `check` script only — the
  dogfood, never a runtime import; CI builds `deblob` before the viewer lines so
  the bin exists.
- One Vite config for build, dev and tests: Vitest resolves Svelte's server
  build under jsdom unless the `browser` resolve condition is set for test runs
  (`mount()` unavailable otherwise), so the config sets it when `VITEST` is in
  the environment.
- `tsconfig` for the browser: `bundler` resolution, `dom` lib, `vite/client`
  types. `tsc --noEmit` types the `.ts` sources; `.svelte` blocks untyped for
  now.
- Root: `prettier-plugin-svelte` so `pnpm lint` covers `.svelte`; lefthook glob
  gains `svelte`; CI `check` job gains the viewer's typecheck/test/build/check
  lines after the `deblob` ones. The Alpine and wasm jobs stay `deblob`-only
  (they prove the oxc bindings, nothing of the viewer).
- Verified: lint, typecheck, 4 tests at 100%, `vite build` (27 kB bundle),
  `deblob check` on both packages (viewer: 0 violations, the `.svelte` file as
  7% blob), `vite` dev serving the page.

## Docs

- `packages/viewer/README.md`: what it is, how to run it, the snapshot source as
  the one contract. Grows with the chapter.
- Outer board: one item for the chapter.
