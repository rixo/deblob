---
captured: 2026-07-17
---

# Vite plugin driver — dev-time violations

Brainstorm capture (rixo). A vite plugin as a **second driver** over the same
detector core — the arch's own vocabulary answers why this is cheap: the CLI is
one driver; detectors are pure functions over the shared import graph, the
engine sits behind a port, so a second assembly is wiring, not rework. It would
also be the design's first real validation: one driver proves nothing about the
extraction contract; two do.

What it buys:

- **Teaching channel moves to the moment of authorship** — violations surface at
  edit time (terminal / dev overlay, HMR file-change hook) instead of CI. The
  `why:` doc-anchor pitch is strongest exactly there: the agent or human who
  just typed the bad import gets the rule while the context is hot.
- Natural synergy with the staged refinements already parked: incremental
  re-extraction (HMR events are the invalidation signal for free) and `--json`
  (the plugin consumes structured violations, not text).

Boundaries, so the idea doesn't oversell (refined 2026-07-17, rixo):

- **Vite's graph = scope, never source.** Two roles, split. As _relevance
  filter_: report violations touching currently-loaded modules — check what you
  use; dev feedback about the code you're in, no nagging about dusty corners
  (the whole point of the dev tier; the CLI remains the full-spectrum gate). As
  _data source_: never — vite's module graph is type-blind by construction
  (esbuild strips `import type` before vite analyzes), so the rule-8/14
  runtime-vs-type distinction doesn't exist in it, and its resolution isn't
  tsconfig-faithful. Edges and classifications always come from deblob's own
  extractor; the plugin filters and presents.
- Stated dev tradeoff: `dag` findings passing through not-yet-loaded files stay
  invisible until a full `deblob check` — acceptable, said out loud.
- Dev-server perf budget is real; depends on incremental extraction landing
  first.

Not v0. Sequenced after the mechanical base is stable + incremental/JSON
refinements exist. Related: the CLI↔agent split future hop (chapter PLAN) — same
"CLI core, many surfaces" shape.
