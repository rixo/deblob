# deblob

Home of the `deblob` CLI — **under construction**.

Machine-checkable hexagonal architecture for TypeScript/ESM: dependency DAG,
layer matrix, composition rules, visibility boundaries — checked in CI, without
an agent.

What exists today: the extraction core — an import-graph extractor (oxc-parser +
oxc-resolver behind a swappable engine port) yielding a classified graph: typed
edges (runtime vs type-only, per specifier), external leaves, and layer/service
classification through the `ts-suffixes-factories` flavor. No CLI, no checks yet
— detectors and the `deblob check` surface come next.

The theory and methodology live in the
[deblob repository](https://github.com/rixo/deblob).
