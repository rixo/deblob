---
source: docs/architecture.md (Rules)
---

# Rules — lookup tables

_Lookup, not reading._

## Dependency matrix (runtime imports)

| Layer        | May import from                                  | Never from                                        |
| ------------ | ------------------------------------------------ | ------------------------------------------------- |
| **model**    | model, pure third-party libs                     | everything else, incl. concrete                   |
| **ports**    | model, ports (types only)                        | everything else, incl. concrete                   |
| **service**  | model, ports                                     | adapters, other `.service.ts`, concrete, assembly |
| **adapters** | model, ports, own service's `private/`, concrete | other adapters, assembly                          |
| **assembly** | anything                                         | —                                                 |

"Concrete" = platform/I/O: `node:fs`, HTTP clients, DB drivers. Pure,
deterministic third-party libraries count as model-layer code.

Assembly's "anything" is import privilege, not placement licence — logic in
assembly is blob hiding there.

## Composition

- `.service.ts` / `.adapter.ts` are imported by assembly only.
- `import type` (and `TheirService["method"]`) is exempt from composition rules
  — NOT from the DAG, NOT from `private/`.
- Within a service's `private/`, internal composition is unrestricted.
- Ports are types only — zero runtime code in a `.port.ts`.
- One port, one interface: if the service can tell which adapter it got, the
  port hasn't finished abstracting.

## Packaging

- `private/` is sealed cross-service — types included.
- The service graph is a DAG: any-file-to-any-file edges, no cycles.
- No module-level runtime cycles anywhere.
- No `index.ts` barrels.

## Discipline

- Service modules are stateless — state lives in factory closures only.
- Test setup is assembly; fixtures are adapters; tests go through the contract.
- A file is only as pure as its least-pure import (purity chain).
