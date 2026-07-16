---
captured: 2026-07-11
---

# Svench flavor — taxonomy sketch (rixo + Fable)

Second implementation guide (context-composition flavor: bare layer filenames,
`use*` hooks, context-tree assembly); proves "several valid guides, one
foundation" with a real second data point. Resolves the UI-zone holes F1–F3
(`future/arch-pass/`).

- **The hexagon recurses into the UI zone** — reactive stores = the UI's service
  layer (store↔store direct channels, lateral composition, unit-testable; DI via
  props = factory args); components = thin drivers + rendering, kept dumb
  presentation; context/routes = assembly.
- **`setContext` IS the assembly act**: providers are assembly nodes,
  receive-and-provide components are _nested assembly_ (existing concept — not a
  new species; kills the "self-assembly service" puzzle).
- **Pure component = pure-_factory_-like** (closed state = rule 17 closure
  state), NOT model-like — model is stateless knowledge.
- "Containers should be stores" is positive guidance (flavor guide preaching),
  not law; the enforceable negative: presentation-classified components must not
  import `.service.ts`/`.adapter.ts`/concrete, must not `setContext`.
- **Litmus**: drops into Svench without rogue deps — deps come from imports OR
  context; `getContext`/`setContext` are static AST facts (dry mechanical proxy
  for the litmus; getContext ⇒ hidden dep / not pure, setContext ⇒ assembly
  role).
- **Classification by fs patterns, not suffixes** (nobody renames `.svelte`):
  designated assembly globs (`routes/` + more — routes-only too strong:
  context-bootstrap components, test harnesses, stories all assemble); violation
  = composition-unit import or setContext outside designated zones.
- **Trap for the cycle rule**: Svelte 5 self-importing recursive components are
  a legitimate module cycle — needs a self-edge exemption in the component zone.
- **CLI v0 stance unchanged**: `.svelte` = assembly-privileged for layers, still
  a DAG/cycle node (script extracted, extractor behind a port);
  getContext/setContext detection = post-v0.
