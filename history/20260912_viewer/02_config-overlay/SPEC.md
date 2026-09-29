# Step 02 — `view.projects` and the local overlay

Ruled 2026-09-12/13 (rixo, chapter PLAN § Decisions). A `deblob` config step:
the viewer's project list comes from config, never from the command line, and
the machine-specific part of that list lives in a file that is never committed.

## Goal

Two things exist after this step, consumed by nobody yet:

- A `view` key in `deblob.config.ts`, holding `projects`: the directories the
  viewer shows. Committed use: a monorepo root listing its projects.
- `deblob.local.json` beside the config: a partial config in the same
  vocabulary, merged over the config file, gitignored by convention. Local use:
  one machine's checkouts under `view.projects`, private paths included.

Success: `resolveConfig` yields `view.projects` as absolute paths; a run with a
local file beside its config resolves the merged value and says so in the bare
status provenance; every malformed input fails with a teaching `ConfigError`
that names the offending file; `deblob check` on both packages stays green.

Out of scope: any consumer of `view.projects` (`deblob view` is step 04), any
existence check of the listed directories (a filesystem fact for the consumer),
any other key in the local file's behaviour — it is the config vocabulary,
nothing local-only.

## API

- **`DeblobConfig.view?: { projects?: readonly string[] }`** — directory paths,
  relative to the declaring file's directory (which is the config root for both
  files, since the local file sits beside the config). Each entry is a deblob
  project: its own config discovery starts there. Default: `{ projects: [] }`.
  Validation: `view` an object carrying known sub-keys only; `projects` an array
  of strings. Everything else fails with the key named.
- **`ResolvedConfig.view: { projects: readonly string[] }`** — absolute paths.
- **`ResolvedConfig.localPath: string | null`** — provenance of the overlay,
  `null` when none was found; `resolveConfig`'s context carries it.
- **`overlayLocalConfig(base, local, localPath)`** (config service, pure) — the
  merge: per top-level key, local wins, arrays and objects replace (a local
  `view` is the whole `view`). The local value must be an object; its keys must
  be known keys; failures name `localPath`. Returns the merged raw value, which
  then goes through `resolveConfig` like any config.
- **Discovery** (loader adapter): the upward walk stops at the nearest directory
  holding a config file or a `deblob.local.json`. Base = the config file's
  default export, or `{}` when only the local file is there. Overlay = the local
  file's JSON, or nothing. With `-c/--config`, the local file is looked up
  beside the explicit file. Unparseable JSON fails loud with the path. The
  no-inheritance ban is untouched: one directory, never a stack across
  directories.
- **Bare status provenance** names both files when the overlay is present:
  `deblob.config.ts + deblob.local.json (flavor: ts-suffixes-factories)`.

## Testing

- Service: `view` resolved to absolute paths, default when absent, each
  malformed shape rejected with the key named; `overlayLocalConfig` merges per
  key with local winning and arrays replacing, rejects a non-object local and an
  unknown local key naming the local file.
- Loader: a fixture directory with config + local resolves the merged value with
  both paths in provenance; a directory with only a local file resolves `{}`
  overlaid; an unparseable local file fails naming it; `-c` finds the local file
  beside the explicit config.
- CLI: bare status provenance line with an overlay (temp dir, not a committed
  fixture — the root `.gitignore` ignores `deblob.local.json`).
- Coverage bar unchanged, both dogfood checks green.

## Implementation

Checkpoints, each handed over on its own; landed 2026-09-13:

1. Config service: the `view` key, `overlayLocalConfig`, `localPath` in the
   resolved config, specs. Existing callers passed `localPath: null` so the tree
   stayed green. One test written to match a SPEC sentence rather than a ruling
   was removed at review, with the sentence.
2. Loader adapter and assembly: `discoverConfig` returns
   `{ root, configPath, localPath }` and stops on either file;
   `explicitConfigPath` returns the same shape with the overlay looked up beside
   the explicit file; `readLocalConfig` parses the JSON, failing with the path
   and the cause. `loadFor` composes base, overlay, resolve. `provenanceOf`
   takes both paths and joins what is present with `+`. Tests are temp-dir based
   (loader: six cases; CLI: config plus overlay, lone overlay), no committed
   local file anywhere.
3. Docs, `.gitignore`, this back-fill.

Verified at 3: typecheck clean, 554 tests at the 100% bar, `deblob check` at 0
violations on both packages, lint clean.

## Findings at checkpoint 2 (2026-09-13, rixo) — recorded, not fixed here

Reviewing the wiring surfaced two shapes that predate this branch, in the config
step's own code (`history/20260710_cli/08_config/`):

- **`loadFor` in the CLI driver is orchestration.** Three adapter calls, two
  branches, two service calls. This step extended it by one branch and one
  service call (the overlay) instead of asking why the sequence lives in the
  driver. The rules under consideration for the architecture verdict, cited as
  pending: a driver resolves its tech, wires, and makes one call into a service;
  it never calls an adapter itself; several service calls from one trigger are
  the smell.
- **`loader.adapter.ts` is an adapter without a port and without a factory.**
  Its doc comment rules the port out on purpose ("config crosses into the core
  as data, reading it is assembly's job"). deblob has no fs port at all: six
  files read `node:fs` directly, all synchronous. rixo's baseline is the
  opposite — an fs port, shared, promise-only, with a node adapter and a memory
  adapter for tests, as every node project ends up growing.

Ruled: not remediated in this chapter. The fix is a `deblob` step of its own
(the fs kernel, then config loading as one use case over it, the loader
dissolving into a port implementation, the other five readers migrating), sized
when the architecture verdict lands. This step fits the existing shape
deliberately, and the viewer package does not inherit it (chapter PLAN §
Decisions).

## Docs

- `packages/deblob/README.md` § Configuration: the twelfth key in the table, and
  the discovery paragraph gains the overlay: same directory, per-key, named in
  the status line.
- `src/lib/config/README.md`: API and adapters lists, the port-less stance
  marked under review with the pointer to § Findings, the "what it does not do"
  paragraph amended for the overlay.
- `skills/deblob/references/setup.md`: no key inventory there (it defers to the
  package README); the monorepo bullets gain the two consequences — a
  `deblob.local.json` at the repo root captures packages like a root config
  would, and "configs never merge" is now "never across directories".
- Root `.gitignore`: `deblob.local.json`.
