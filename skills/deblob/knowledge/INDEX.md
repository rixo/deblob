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
