# fs

The filesystem behind a port — the kernel every reader of the disk shares. One
port, two adapters, the port's own suite as a conformance kit
(`fs-test-suite.service.ts`, over the `test` unit's `TestingApi` port) that each
adapter's spec runs over `FS_TREE` materialized where that adapter reads. No
service: the kernel holds the contract; a consumer takes the port injected,
narrowed to what it uses, and never names the adapter.

## Port

- `fs.port.ts` — `Fs`, promise-only: `readFile(path) → string | null`,
  `exists(path)`, `stat(path) → { size } | null` (a file's; a directory reads
  `null`, so `stat` is also the "is a file" question),
  `glob(patterns, { cwd, ignore? }) → cwd-relative POSIX paths`, and `globDirs`,
  the same question asked of directories (no trailing slash, never `cwd` itself
  — the snapshot watcher's set is the directories coverage spans). The exact set
  the readers use today, read as a ceiling: a member arrives with the code that
  reads it. A missing path is `null` or `false`, never a throw; any other
  failure flies. A sync member exists only with a force-majeure case written
  next to it; laziness or a sync caller upstream is not one (rixo, 2026-09-17,
  restating the 2026-09-13 ruling).

## Adapters

- `adapters/node-fs.adapter.ts` — `createNodeFs()`: `node:fs/promises` for the
  reads, tinyglobby for the two scans (`dot: false`; files only, or directories
  only with its trailing slash dropped). ENOENT and ENOTDIR read as missing.
- `adapters/memory-fs.adapter.ts` — `createMemoryFs(files, { dirs? })`: a record
  of absolute path → content; a directory exists when a file sits under it, or
  when `dirs` names it — the way to hold an empty one (a hidden placeholder like
  `.keep` also works: no glob sees it); `glob` is picomatch over the file keys
  under `cwd`, `globDirs` over the named directories and every path's ancestors,
  the same dot rule. `files` is exposed for assertions. The second adapter of
  the port is what lets a verdict case be a tree of strings through the real
  chain, no disk and no simulation.

## What stays a platform call

The config file's native `import()` (the loader): Node evaluates a module, no
port reads it. `main`'s own `package.json` read for the version: the boot's.
