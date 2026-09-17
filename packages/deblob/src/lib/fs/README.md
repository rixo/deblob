# fs

The filesystem behind a port — the kernel every reader of the disk shares. One
port, two adapters, one contract test over both. No service: the kernel holds
the contract, the consumers (config's loader and scan, extraction's engine and
package-meta reader, explain's content reader) take it injected and never name
the adapter.

## Port

- `fs.port.ts` — `Fs`, promise-only: `readFile(path) → string | null`,
  `exists(path)`, `stat(path) → { size } | null`,
  `glob(patterns, { cwd, ignore? }) → cwd-relative POSIX paths`. The exact set
  the readers use today, read as a ceiling: a member arrives with the code that
  reads it. A missing path is `null` or `false`, never a throw; any other
  failure flies. A sync member exists only with a force-majeure case written
  next to it; laziness or a sync caller upstream is not one (rixo, 2026-09-17,
  restating the 2026-09-13 ruling).

## Adapters

- `adapters/node-fs.adapter.ts` — `createNodeFs()`: `node:fs/promises` for the
  reads, tinyglobby for the scan (`dot: false`, files only). ENOENT and ENOTDIR
  read as missing.
- `adapters/memory-fs.adapter.ts` — `createMemoryFs(files)`: a record of
  absolute path → content; a directory exists when a file sits under it; `glob`
  is picomatch over the keys under `cwd`, the same dot rule. `files` is exposed
  for assertions. The second adapter of the port is what lets a verdict case be
  a tree of strings through the real chain, no disk and no simulation.

## What stays a platform call

The config file's native `import()` (the loader): Node evaluates a module, no
port reads it. `main`'s own `package.json` read for the version: the boot's.
