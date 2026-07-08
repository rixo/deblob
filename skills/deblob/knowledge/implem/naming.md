---
source: docs/implementation-guide.md §3
---

# Naming in code — factories, types, adapters

- **Factories: `create<Name><Kind>`** — `createIconsService`,
  `createManifestSourceAdapter`, `createNodeFs`. One factory per composition
  unit, named export, no default export.
- **Assembly entrypoints: `init<Name>`** — `initThemes`, `initThemeContext`.
  `create*` builds one unit; `init*` wires a subsystem.
- **Dependencies: one destructured object parameter, typed with port types.**

  ```ts
  export function createIconsService({
    source,
    store,
  }: {
    source: IconSource;
    store: IconStore;
  }): IconsService { ... }
  ```

  A single-dependency factory may take it positionally.

- **Types: name by role, qualify to disambiguate.** A port type is its role —
  `Logger`, `IconSource` — no mandatory `Port` suffix: the file path
  (`.port.ts`) already declares the layer. Qualify when domain vocabulary takes
  the bare name — which is why the returned service API is `<Name>Service` in
  practice (`Icons` is the data; not `ServiceAPI`, not `IService`) while ports
  stay bare. Don't write `{ loggerService: LoggerPort }` where
  `{ logger: Logger }` says it — a rule fighting the cleaner form gets violated
  by instinct; this flavor doesn't legislate against instinct without a stronger
  formalism in play.
- **`<Name>Config` / `Input<Name>Config` keep their suffix** — the thing _is_
  config. The Input/resolved split is a real boundary: user config is an adapter
  concern; services receive resolved config
  ([pattern-config](../pattern-config.md)).
- **Service type, explicit vs inferred**: `type IconsService = {...}` and
  `type IconsService = ReturnType<typeof createIconsService>` are both fine.
  Extraction pressures decide when the explicit form earns its keep (a port
  needs deriving from it, consumers need the contract without the factory) —
  don't hand-write shapes inference already gives you.
- **Adapter filename grammar: `<qualifier>-<port-name>.adapter.ts`** — the
  qualifier names the technology/strategy, the rest the port served:
  `fs-icon-store.adapter.ts`, `in-memory-fs.adapter.ts`,
  `manifest-source.adapter.ts`.
