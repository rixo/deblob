# Step 01 — the manifest kernel

The package manifest claim gets one home. Today the exports map plus the
`deblob` field is read in two adapters, typed in a detector, resolved through a
model filed under `extraction`, and counted by the bare status through
`check/surface.model.ts`. After this step `lib/manifest/` owns all of it,
imports nothing from any other service, and the edge `config → check` is gone.

## Goal

- One reader for the field, two tolerances: at home (the package's own
  `package.json`) every malformation is a named teaching error; abroad (a
  dependency's manifest) every malformation reads as "no claim". Same shape
  reader, same list of defects, two verdicts — a defect the strict side names is
  a defect the lenient side nulls, by construction.
- The reach half (`resolveSurface`, `tallySurface`, the mirror, the unverified
  shapes) lives with the claim it resolves; the judge (`checkSurface`) stays a
  detector in `check` and imports the reach.
- Node's exports-map knowledge (`exportsSubpathsOf`, `exportsKeyFor`) moves next
  to the claim it flattens.
- Output, exit codes, goldens: unchanged. This step moves and dedupes; it adds
  no behavior.

## API

### `lib/manifest/` — a kernel: model only, imports nothing

```
manifest/
  exports-map.model.ts   # moved verbatim from extraction
  claim.model.ts         # the `deblob` field: one reader, two tolerances
  surface.model.ts       # the reach: resolveSurface, tallySurface, mirror
  README.md
```

**`exports-map.model.ts`** — `ExportsSubpath`, `exportsSubpathsOf`,
`exportsKeyFor`, as today. The three readers named in its header (loader,
surface check, meta reader) now all import it from here.

**`claim.model.ts`** — the field's shape as knowledge:

- `PackageSurface` moves here from `check/surface.model.ts`, unchanged:
  `{ subpaths, blob, assembly }` — flattened exports, the two pattern lists as
  written.
- `readClaim(manifest: unknown): ClaimReading` — the one reader over a parsed
  `package.json` value. Returns what it found and every defect it saw:

  ```ts
  type ClaimReading =
    | { kind: "absent" } // no `deblob` field
    | {
        kind: "claim"
        surface: PackageSurface
        defects: readonly ClaimDefect[]
      }
  type ClaimDefect =
    | { defect: "field-not-object" }
    | { defect: "unknown-key"; keys: readonly string[] }
    | { defect: "no-exports-map" }
    | { defect: "bad-pattern-list"; key: "blob" | "assembly"; value: unknown }
  ```

  The operation over the whole field: every key this version honors is read,
  every key it does not is a defect, every malformed value is a defect with its
  key; `surface` carries whatever was readable (a bad `blob` list reads as `[]`
  beside its defect). Defects are a closed union — the compiler owns the set, so
  exhaustive handling on both tolerances is correct.

- `strictClaim(reading): PackageSurface | null` — home tolerance: `absent` →
  `null`; any defect → throws `ClaimError` whose message is today's teaching
  text for that defect (the four messages `readPackageSurface` prints, moved
  verbatim); no defect → the surface.
- `lenientClaim(reading): PackageSurface | null` — abroad tolerance: `absent` or
  any defect → `null`; else the surface. The package-meta reader's "anything
  short of a readable claim reads as no claim" is this function.

  `ClaimError` is the kernel's own error class.
  `config/adapters/loader.adapter.ts` catches it and rethrows as `ConfigError`
  with `{ cause }` — the config service keeps owning the user-facing error type,
  the kernel never imports `config`.

**`surface.model.ts`** — moved from `check/surface.model.ts`, the reach half
only: `ResolveSurfaceOptions`, `UnverifiedTarget`, `UnverifiedEntry`,
`ReachedEntry`, `SurfaceResolution`, `SurfaceTally`, `resolveSurface`,
`tallySurface`, the module-extension and mirror helpers. Unchanged in behavior.
The compiled `disclosed` predicate stays injected: the kernel never sees the
specifier grammar (decision on the chapter PLAN — the grammar stays in
`extraction/graph.model.ts` and this is what keeps the kernel a leaf).

### What the other services keep

- **`check/surface.model.ts`** — `checkSurface`, `CheckSurfaceOptions`,
  `SurfaceReport`, the fronting closure, the judge. Imports `PackageSurface`,
  `resolveSurface`, `UnverifiedEntry` from `manifest`. `Layer` still from
  `extraction/graph.model.ts` (the judge speaks layers; the kernel does not).
- **`config/adapters/loader.adapter.ts`** — `readPackageSurface(root)` keeps its
  signature: reads the file, `JSON.parse` (parse failure stays `ConfigError`),
  `strictClaim(readClaim(parsed))`, `ClaimError` → `ConfigError`. The four
  validation messages leave the adapter. `HONORED_FIELD_KEYS`,
  `isSubpathPattern`, `patternsOf` are gone from here.
- **`extraction/adapters/package-meta.adapter.ts`** — `claimOf` and `patternsIn`
  are gone; the probe does `lenientClaim(readClaim(parsed))` and compiles the
  surface's `blob` / `assembly` lists with its own service's `specifierMatcher`
  into the `Claim` predicates it already builds. The "malformed manifest JSON →
  null" catch stays in the adapter (a parse failure is not a field defect).
- **`extraction/exports-map.model.ts`** — deleted; its spec moves with it.
- **`cli/render.model.ts`** — `UnverifiedEntry`, `UnverifiedTarget` imported
  from `manifest`.
- **`drivers/cli/main.ts`** — `tallySurface` and the surface types from
  `manifest`; `checkSurface` from `check`. `resolveOptionsFor` unchanged.

### The service DAG after

```
manifest   ← check, config (adapter), extraction (adapter), cli (types), assembly
extraction ← check, config, cli, assembly           (as today)
check      ← cli, explain, assembly                 (config no longer)
```

`manifest` imports nothing. `config → check` is gone. No new edge points from an
upstream service to a downstream one.

## Testing

- Specs move with their code: the reach cases of `check/surface.model.spec.ts`
  (resolution, mirror, pattern expansion, unverified shapes, `tallySurface`)
  become `manifest/surface.model.spec.ts`; the judge cases stay. The exports-map
  spec moves whole.
- `claim.model.spec.ts` — the reader over every defect in the union, and the two
  tolerances over the same readings: for each `ClaimDefect` member, strict
  throws the pinned message and lenient returns `null`; for the defect-free
  reading both return the same surface. Written as one table over the union so a
  defect added tomorrow without both verdicts fails to compile, not to test.
- `loader.adapter.spec.ts` keeps its fixture cases; the four message assertions
  now pass through the `ConfigError` wrapper with the `ClaimError` as cause.
  `package-meta.adapter.spec.ts` keeps its "broken stranger never breaks the
  run" cases unchanged — they are the lenient verdict's e2e.
- `main.spec.ts` goldens: byte-identical. The bare status and the check summary
  print the same counts from the same reach.
- Gates: 100% coverage through the public contract, `deblob check` green on
  itself (the edge that goes is the one the dag detector never saw — this step
  is the reminder that green does not mean well-cut), `tsc --noEmit`.

## Implementation

Order follows the dependency chain so each move is compiler-guided:

1. `manifest/exports-map.model.ts` — `git mv` from extraction; imports repointed
   (loader, surface, package-meta).
2. `manifest/claim.model.ts` born: `PackageSurface`, `ClaimReading`,
   `ClaimDefect`, `readClaim`, `strictClaim`, `lenientClaim`, `ClaimError`.
   Loader and package-meta rewired; their private validation removed.
3. `manifest/surface.model.ts` — the reach half cut out of `check/surface`; the
   judge imports it. Spec split.
4. `cli/render.model.ts`, `main.ts` imports repointed; READMEs.
5. Run the gates; regenerate nothing (goldens must not move).

One commit: the SPEC, the moves, the split specs, the READMEs — a move whose
halves land apart leaves an intermediate tree with the same debt in a new place.

## Docs

- `lib/manifest/README.md` born: what the claim is, the
  one-reader-two-tolerances rule, the reach, what it does not do (no judgment,
  no I/O, no pattern grammar).
- `lib/check/README.md`: the surface entry loses the reach paragraph and points
  at `manifest`; `resolveSurface` / `tallySurface` lines leave.
- `lib/config/README.md`: loader entry says the field is validated by the
  manifest kernel and only wrapped here.
- `lib/extraction/README.md`: the `exports-map.model.ts` bullet leaves; the
  package-meta bullet names the lenient reading's home.
- Chapter GOAL / root board: no change at this step.
