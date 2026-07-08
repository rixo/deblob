---
source: docs/architecture.md § Hexagonal architecture
---

# Hexagon — inside, outside, ports, adapters

A hexagon is any self-contained unit isolating itself from its environment
through contracts. It has an **inside** (the domain, the reason it exists) and
an **outside** (everything else). The inside never knows the outside exists.

- **Ports** — contracts at the boundary, **shaped to the inside's needs**, never
  around what an external system offers. The inside codes against ports only.
  See [layer-ports](layer-ports.md).
- **Adapters** — implement a port for one concrete technology; absorb the
  source's specifics so what comes out conforms to the port. Replaceable because
  they absorb specificity, not because they're simple. See
  [layer-adapters](layer-adapters.md).
- **Drivers** — inbound adapters: translate an external trigger (CLI command,
  HTTP route, UI event) into calls on the hexagon's public API. No separate port
  needed — the public API is the contract.
- **Assembly** — not an adapter: it doesn't translate, it **builds** the system
  (reads config, instantiates adapters, wires ports). See
  [layer-assembly](layer-assembly.md).

The pattern is **fractal**: adapters are themselves hexagons with their own
inside, ports, and sub-adapters; an adapter's factory is the composition root
for its own internals. Same rules at every depth. See [nesting](nesting.md).

Guarantee this buys: the inside can be developed, tested, and reasoned about
with zero knowledge of what sits across its ports.
