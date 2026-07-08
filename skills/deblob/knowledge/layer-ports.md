---
source: docs/architecture.md § Ports, § Port derivation
---

# Ports — contracts at the boundary

Type-only contracts at the hexagon's boundary, **shaped to the inside's needs**
— never around what the external system offers.

- A `.port.ts` file contains **the contract and nothing that isn't the
  contract**. Supporting types ride along only as contract pieces (parameter
  shape, result shape); a type that stands alone is domain vocabulary → model.
  Ports may use model types freely; never the reverse dependency.
- **Zero runtime code** (Rule 10): no constants, no enums, no functions, no
  defaults. Runtime in a port file = a model or adapter extraction is pending.
- **One port, one interface** (Rule 11): every adapter of a port implements the
  same interface and produces the same result shape. If the service can tell
  which adapter it got, the port hasn't finished abstracting.
- Port interfaces belong to the hexagon that defines them (outbound: what it
  needs; inbound: what it offers).

**The dialect trap.** "Ports speak the service's language" + DRY pull against
each other: every service writing its own `FsPort` breeds diverging dialects,
each needing its own adapter. Fix: extract the shared interface once; consumers
scope with `Pick<FsPort, "readFile">` (ISP). Until it's extracted,
`FsService["readFile"]` is a legal type-only reference. The smell: restating a
signature that already exists elsewhere.

See [composition-rules](composition-rules.md) for the type-only exemption.
