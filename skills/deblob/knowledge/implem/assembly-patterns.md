---
source: docs/implementation-guide.md §6
---

# Assembly patterns — CLI roots, config, contexts, plugins

**CLI / program composition root** — one `cli.ts` (or `main.ts`) owns the
wiring:

- Per-subsystem `build<Name>Service()` helpers instantiate concrete adapters and
  pass them to service factories. The helper is assembly code — it may import
  anything. Import privilege is not placement licence: the helper instantiates
  and connects, nothing more — a decision or computation inside it is blob
  hiding in assembly ([layer-assembly](../layer-assembly.md)).
- **A shared composition unit (`.service.ts` / `.adapter.ts`) is instantiated
  once** at the root and threaded down: one `const fs = createNodeFs()` passed
  to every disk-touching adapter — never one instance per consumer.
- Driver glue (arg parsing, command registration) and assembly may share the
  file in simple programs — two hats, same place, fine until it grows
  ([layer-assembly](../layer-assembly.md)).

**Config hydration** — config is a port
([pattern-config](../pattern-config.md)); the flavor's mechanism: a config
service created with injected I/O capabilities
(`createConfigService({ fileExists, importModule, ... })`); a **lazy, cached
`getConfig()`** in the composition root — loaded on first use from the
conventional file (`<tool>.config.ts` at project root), merged with environment;
services receive resolved `<Name>Config` slices via their factories.

**Web/UI runtimes** — where the runtime composes through a component tree,
assembly distributes: `*.context.ts` files own the context key and expose
`init<Name>Context()` / accessor pairs. Same architectural role, different
mechanism — the context provider is the composition root for its subtree.

**Build-tool plugins** — a plugin factory is a driver + assembly pair: the
factory body wires services (assembly), the hook implementations translate the
tool's lifecycle into service calls (driver). Keep the services extractable —
plugin-framework types must not leak below the driver.
