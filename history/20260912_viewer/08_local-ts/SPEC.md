# Step 08 — the local overlay is a TS file

Ruled 2026-09-25 (rixo). Step 02 made the machine-local overlay a JSON file on
one recorded reason, "JSON because it is data" (chapter PLAN § Decisions). The
reason does not hold: `deblob.config.ts` is data too, and it is TS. The overlay
becomes the same kind of file as the config beside it. If real JSON data is ever
needed, it is a support file the TS imports; not before (yagni).

`deblob.local.json` was never published (it is not on `main`), so nothing
migrates.

Moving to TS has one cost, which this step pays. The JSON file was read fresh on
every run, so under `deblob view` an edit took effect on the next change. A TS
file is loaded by `import()`, and Node caches an ES module by its URL: a second
import of the same file returns the first version. `deblob.config.ts` already
loads that way, so an edited config most likely stays stale under `deblob view`
until a restart. That is inferred from the code (`loader.adapter.ts`, a plain
`import(href)`), not observed. `pnpm dev` hides it, because `node --watch`
restarts the server on a config edit (step 04, § Implementation). Left alone,
the move to TS would carry that problem to the one file that reloads live today.

## Goal

The local overlay is `deblob.local.{ts,mts,js,mjs}`, loaded exactly like the
config: native import, default export, `defineConfig` for types. Same keys, same
merge, same discovery, same provenance line.

Success:

- A `deblob.local.ts` beside the config is merged over it, and the bare status
  line names it (`deblob.config.ts + deblob.local.ts (flavor: …)`).
- A lone `deblob.local.ts` still stops discovery, a configless project with an
  overlay, as a lone `.json` did.
- Every malformed overlay fails with a `ConfigError` naming the file: two local
  files in one directory, an import that throws, no default export, a
  non-object, an unknown key.
- `deblob.local.json` is no longer read.
- An edited config or local file is read as edited on the next load, in the same
  process, with no restart.
- `deblob check` on both packages, typecheck and tests stay green; the viewer's
  `pnpm dev` and the map spike pick up a `packages/viewer/deblob.local.ts`.

Out of scope: any new key, any change to the merge (per top-level key, local
wins, arrays and objects replace).

## API

- **Filenames.** `deblob.local.ts`, `.mts`, `.js`, `.mjs`: the config's four
  extensions, so there is one rule to learn. Two of them in one directory fail
  like two configs do ("keep exactly one … per directory").
- **Loading.** `importConfigDefault(localPath)`, the config's own import. A
  missing default export reads
  `… has no default export — export default defineConfig({ ... })` for both
  files.
- **Reloading.** `importConfigDefault` imports `<file URL>?v=<mtimeMs>`: a file
  changed since its last import is a new URL, so Node imports it fresh; an
  unchanged file keeps its cached module. Cost: each edit leaves the old module
  in memory for the life of the process, which is small for a config. Limit:
  only the file itself reloads. A module it imports (a shared
  `deblob.config.base.ts`, say) stays cached, and an edit there still needs a
  restart. Second limit: a change is seen through the file's mtime, so on a
  filesystem with coarse timestamps (FAT, some network mounts) two saves close
  together can share one and the second is missed. Ext4, APFS and NTFS are fine
  for real editing. The docs say both.
- **Types.** `defineConfig` as is: every `DeblobConfig` key is optional, so a
  partial config types without a second helper.
- **`overlayLocalConfig`** unchanged, except its non-object message: it names
  the file's default export instead of "as JSON".
- **Loader.** `readLocalConfig` goes (it parsed JSON). `DiscoveredConfig` and
  `ResolvedConfig.localPath` keep their shape; the path now ends in the TS
  file's name.
- **Leftover `deblob.local.json`:** not read and not flagged. It is not a deblob
  file any more, and a guard for a file nobody was ever given would be a nanny
  guard.

## Testing

Loader spec rows, on temp directories with real `.ts` files (the native import
runs them):

- `deblob.local.ts` beside a config: merged, `localPath` names it.
- A lone `deblob.local.ts`: discovery stops there, configless root.
- A nested directory's `deblob.local.ts` wins over an ancestor's config (the
  walk stops at the first directory holding either).
- `deblob.local.ts` + `deblob.local.mjs`: ambiguity error naming both.
- An overlay that throws on import, one with no default export, one exporting a
  non-object, one with an unknown key: each a `ConfigError` naming the file.
- A `deblob.local.json` alone in a directory: discovery walks past it.
- Reload, red first: a `deblob.config.ts` loaded, rewritten with another value
  (and a later mtime), loaded again in the same process → the new value. The
  same row for `deblob.local.ts`. The config row confirms or refutes the
  inferred staleness before the fix: if it passes red, the premise was wrong and
  this part of the step goes. The two loads run in a child `node` process, so
  the row tests Node's module cache, not Vitest's module runner, which handles
  `import()` its own way.
- An unchanged file loaded twice → the same module (no re-import).

The driver specs (cli, snapshot, serve) and the render spec that write or name
`deblob.local.json` move to `deblob.local.ts`. The rows stay the same.

## Implementation

- `loader.adapter.ts`: `LOCAL_FILENAMES` beside `CONFIG_FILENAMES`, the same
  ambiguity check; `localConfigBeside` returns the one present.
- `drivers/wiring.ts` and `drivers/cli/main.ts:236`: the two places that read
  the overlay today (the same code, twice) import it through
  `importConfigDefault`. The duplication stays as it is; it is not this step's
  to fold.
- `importConfigDefault`: the mtime from node's `stat`, beside the `import()` it
  already makes (both platform calls, outside the fs port, as today).
- Root `.gitignore`: `deblob.local.*`.
- `packages/viewer/deblob.local.json` on rixo's machine becomes
  `deblob.local.ts` (gitignored, not part of the commit).

## Docs

- `packages/deblob/README.md` § config, `src/lib/config/README.md`,
  `packages/viewer/README.md` (the example becomes TS),
  `packages/viewer/deblob.config.ts` comment, the spike host's comment.
- `skills/deblob/references/setup.md`: the two mentions (shipped content).
- Chapter PLAN: the § Decisions line gets its amendment ("the local file is TS,
  2026-09-25, step 08"), step 8 on the list.
