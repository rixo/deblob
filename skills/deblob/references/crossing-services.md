---
source:
  docs/architecture.md (Sharing, The acyclic dependency rule, Port derivation)
---

# Crossing services — using another service's code

You need something from another service. In escalation order:

1. **Their model or ports** → import directly, per the [matrix](rules.md). One
   direction only: if `icons` imports from `tokens` — any file, any layer — then
   `tokens` must NEVER import from `icons`.
2. **Both services need the same concept** (mutual dependency threatens) →
   extract a **kernel**: a shared service holding the common types and functions
   (model, possibly service-layer code; no composition units). Both import the
   kernel; the cycle dissolves.
3. **You need to CALL their service** (operational dependency) → define YOUR
   port, shaped to your needs; write an adapter wrapping their API; assembly
   wires it. Never import their `.service.ts` directly.
4. **Their `.service.ts` / `.adapter.ts`** → assembly only. `import type` (and
   the `TheirService["method"]` shorthand) is exempt from that composition rule
   — but NOT from the DAG (a type import is still an edge) and NOT from
   `private/` (sealed, types included).

## Hard rules

- **No cycles between services.** Any file in A importing any file in B is an
  A→B edge; layers are irrelevant to the DAG.
- **No module-level runtime cycles** anywhere — they work in dev and silently
  break in production ESM.
- **Don't restate an interface that exists** — extract the shared port once;
  consumers scope it with `Pick<FsPort, "readFile">`. Every restated dialect
  needs its own adapter (the dialect trap).

## When judgment is needed

- **Kernel vs merge**: two services that constantly want each other are often
  one service with two concerns — nesting both inside one service can beat a
  kernel between two.
- **Kernel cracking**: optional fields or union branches that serve a single
  consumer mean the kernel is looking downstream. Litmus: delete consumer B
  entirely — would the shared type still make sense as-is? No → reclaim the
  concept per-service (own model, port + translating adapter — an
  anti-corruption boundary).
- **Direct import vs port**: reusing types and pure functions → direct import is
  fine. Consuming behavior with effects → port. The port is for what you'd want
  to stub.

## Deeper

Per judgment — not required for implementation.

- [sharing](../knowledge/sharing.md) — the full progression, kernel cracking,
  anti-corruption
- [ports](../knowledge/layer-ports.md) — port derivation, the dialect trap
- [acyclic](../knowledge/acyclic.md) — service DAG, module cycles
- [pattern-kernel](../knowledge/pattern-kernel.md) — kernels, shared utils
