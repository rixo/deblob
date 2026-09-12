# @deblob/viewer

The deblob viewer: a browser app over a codebase deblob has extracted, launched
by `deblob view`. In progress — chapter `history/20260912_viewer/`.

A Svelte single-page app built by Vite. It never imports `deblob`: data reaches
it through its one input, a **snapshot source** — a stream of whole snapshots
(`src/lib/snapshot/snapshot.model.ts`). Static delivery is a stream of one, live
delivery a stream of many; the app does not care which.

## Scripts

```
pnpm dev          Vite dev server
pnpm build        production bundle in dist/
pnpm test         vitest, 100% coverage through the contract
pnpm typecheck    tsc over the TypeScript sources
pnpm check        deblob on its own source
```
