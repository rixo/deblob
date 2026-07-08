---
source: docs/architecture.md § Sharing
---

# Sharing — the progression, kernels, anti-corruption

Decomposition creates distance; things still need common types, functions,
contracts. Reconnect without undoing the isolation — the same progression for
all shared code (model, ports, pure functions):

1. **One consumer** — no sharing; the service owns everything.
2. **Multiple consumers, one direction** — direct import from the other's
   model/ports. Fine while strictly one-directional.
3. **Cycle threatened** — extract a **kernel**: a shared service holding the
   common concepts (model and/or service-layer code, no composition units). Both
   consumers import it; the DAG stays clean. Alternative when the shared surface
   is large and growing: **merge** — two services that constantly want each
   other are often one service with two concerns.
4. **Kernel grows consumer-specific concerns — red alert.** The kernel sits
   upstream; it must not know its consumers. Smell: optional fields or union
   branches serving one consumer. **Litmus: delete consumer B entirely — does
   the shared type still make sense as-is?** Fix: each service reclaims its own
   concept (own model type), interop through port + adapter — the
   **anti-corruption boundary** (DDD name; mechanically just port+adapter).
5. **Operational cross-dependency** — A must _call_ B: at least one direction
   goes through a port + adapter, wired by assembly. Never a direct
   `.service.ts` import.

Full arc: own it → share directly → extract kernel → split with anti-corruption.
No new mechanisms at any stage.

Kernels group by coherent domain — business (`Provider`) or technical
(`util/vite.ts`) — never "misc": [pattern-kernel](pattern-kernel.md). Port
sharing follows the same progression: [layer-ports](layer-ports.md) (dialect
trap). DAG rules: [acyclic](acyclic.md).
