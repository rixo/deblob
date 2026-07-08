---
source: docs/architecture.md § Adapters, § Drivers
---

# Adapters — port implementations (and drivers)

An adapter implements a port for one concrete technology. Its job: **absorb
specificity** — the external world's formats, APIs, quirks stay inside the
adapter; what comes out conforms to the port. That absorption is what makes
adapters replaceable.

- May import: model, ports, its own service's `private/`, concrete tech
  (`node:fs`, HTTP clients…). Never: other adapters, assembly
  ([dependency-matrix](dependency-matrix.md)).
- `.adapter.ts` is a composition unit: assembly-only import.
- **An adapter is a full service package** — own layers, own `private/`, own DAG
  participation — even when physically nested under the service it serves. It
  connects to that service through the port it implements, never by reaching
  into internals. See [nesting](nesting.md) for the direction consequence
  (parent must stay import-blind to its own adapters).
- Fractal: complex adapters have their own insides; the adapter's factory
  composes its own internals. Genuinely external deps (HTTP client, logger) are
  still injected from outside.

**Drivers** are inbound adapters — CLI handler, HTTP route, UI event: they
translate an external trigger into public-API calls. No separate port needed
(the public API is the contract). Semantically they're goals, not means: "we
need a CLI" is a driver-level decision. Driver vs assembly boundary:
[layer-assembly](layer-assembly.md).
