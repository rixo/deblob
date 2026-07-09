# deblob knowledge cards — index

One card per concept; each card is self-contained, provenance-stamped, and
cross-linked. Pick by the question you're holding.

## Concepts

| Question                                    | Card                                                |
| ------------------------------------------- | --------------------------------------------------- |
| What's a hexagon / port / adapter / driver? | [hexagon](hexagon.md)                               |
| What does "service" even mean here?         | [service-three-meanings](service-three-meanings.md) |
| What's the blob / why "deblob"?             | [blob](blob.md)                                     |

## the five layers

| Layer                           | Card                                |
| ------------------------------- | ----------------------------------- |
| model — knowledge, purity       | [layer-model](layer-model.md)       |
| ports — contracts, dialect trap | [layer-ports](layer-ports.md)       |
| service — decisions, IoC        | [layer-service](layer-service.md)   |
| adapters — absorption, drivers  | [layer-adapters](layer-adapters.md) |
| assembly — the necessary evil   | [layer-assembly](layer-assembly.md) |

## rules

| Question                                     | Card                                            |
| -------------------------------------------- | ----------------------------------------------- |
| Who may import what?                         | [dependency-matrix](dependency-matrix.md)       |
| Who may import composition units? type-only? | [composition-rules](composition-rules.md)       |
| Visibility, `private/`, why no barrels?      | [packaging-visibility](packaging-visibility.md) |
| Cycles — service DAG, module level?          | [acyclic](acyclic.md)                           |
| Nested services/adapters — what's allowed?   | [nesting](nesting.md)                           |

## lifecycle & patterns

| Question                           | Card                                |
| ---------------------------------- | ----------------------------------- |
| When to extract logic to model?    | [distillation](distillation.md)     |
| When to split a service?           | [decomposition](decomposition.md)   |
| Sharing, kernels, anti-corruption? | [sharing](sharing.md)               |
| Config?                            | [pattern-config](pattern-config.md) |
| Shared utils / kernels?            | [pattern-kernel](pattern-kernel.md) |
| Reactive state?                    | [pattern-store](pattern-store.md)   |

## testing

| Question                           | Card                                      |
| ---------------------------------- | ----------------------------------------- |
| What do tests exercise and assert? | [testing-contract](testing-contract.md)   |
| Test at internal seams?            | [testing-seams](testing-seams.md)         |
| Setup, fixtures, test factory?     | [testing-isolation](testing-isolation.md) |
| Who are tests written for?         | [testing-reviewer](testing-reviewer.md)   |

## Implementation — the guide's flavor (TS/ESM)

| Question                                         | Card                                                        |
| ------------------------------------------------ | ----------------------------------------------------------- |
| What's a "flavor"? what does "always" mean?      | [implem/flavor](implem/flavor.md)                           |
| Which suffix on which file?                      | [implem/file-naming](implem/file-naming.md)                 |
| What does a service directory look like?         | [implem/service-anatomy](implem/service-anatomy.md)         |
| How to name things? factory / type / adapter?    | [implem/naming](implem/naming.md)                           |
| index.ts? package exports?                       | [implem/no-barrels](implem/no-barrels.md)                   |
| Composition root — CLI, config, context, plugin? | [implem/assembly-patterns](implem/assembly-patterns.md)     |
| try/catch, error classes, degraded results?      | [implem/error-management](implem/error-management.md)       |
| Where do tests, fixtures, utils go?              | [implem/testing-in-practice](implem/testing-in-practice.md) |
| Inspecting a brownfield codebase — what's debt?  | [implem/brownfield-reading](implem/brownfield-reading.md)   |
