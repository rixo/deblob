# Step 02 — rule-number resolution

The CLI cites rules by number; before the first detector emits "rule 6", a bare
number must resolve to its rule from every surface an agent or human might hold
it in — docs URL, skills, and (groundwork) the npm package itself. Forcing
function: the CLI's output design; the fix rides in this chapter (PLAN ruling,
2026-07-17).

## Goal

- A canonical URL per rule: `docs/architecture.md#rule-N` lands on the exact
  rule, stable across title edits.
- An agent holding "rule 4" and only the skills resolves it: the knowledge INDEX
  rules table carries the rule ranges.
- The npm package carries the teaching content `deblob explain` will serve —
  verbatim knowledge cards + the rule summary, keyed by one mapping — so the
  explain command (CLI step) is a formatter over shipped data, not a content
  project. The command itself is out of scope here.

## API

- **Anchors**: `<a id="rule-N"></a>` inline at the head of each numbered rule in
  architecture.md § Summary, N = 1–17. Inline HTML — the only GitHub-stable
  anchor form; heading-derived slugs would break on any title edit.
- **The one mapping** (drives the INDEX column AND the explain lookup — two
  consumers, one source of truth): rule number → knowledge cards. Ranges as
  ruled in the PLAN: dependency-matrix 1–5, composition-rules 6–11,
  packaging-visibility 12, acyclic 13–14, testing-contract 15, testing-isolation
  16; plus layer-service for 17 (service discipline — detectors never cite it in
  v0, but the mapping is total over the summary's numbering so a stray citation
  still resolves). Materialized as a model file in the package (`explain`
  domain), exporting the rule→cards table and the canonical-URL builder.
- **Shipped content**: `dist/content/` — a build artifact, never committed
  (amended at review, rixo: committed copies + a sync test were a workaround for
  the missing build). Verbatim copies of the mapped cards plus every card they
  link to (closure — a shipped card's cross-link must resolve inside the shipped
  set; shipping the target beats rewriting the card), and the § Summary excerpt
  as the per-rule text source. `dist/content/` mirrors the repo paths
  (`skills/deblob/knowledge/…`) so verbatim bytes keep their relative links
  resolving on disk. Closure outcome: 25 files — 22 deblob cards + 3 deblob-sdd
  cards pulled through testing-reviewer → review-gates → future/three-axes.

## Testing

Build-time copying kills the drift risk by construction (nothing committed to
drift); what remains testable lives on the sources:

- Every card the mapping names exists in the repo; the link closure from the
  mapped cards is dead-pointer-free (same walk the build performs — shared
  `collectMdLinks` model function).
- Every rule number 1–17 has an anchor in architecture.md § Summary and an entry
  in the mapping (totality both ways).
- INDEX rules table mentions each range on its card's row — asserted loosely,
  not golden-filed.
- The build itself is CI-gated: `pnpm build` (staged, `run-s build:*`) runs in
  the check job — emit + content copy proven on every push, and `prepack`
  rebuilds before any publish.

## Implementation

- architecture.md: 17 inline anchors, zero prose change.
- INDEX.md rules table: new "Rules" column (`1–5`, `6–11`, `12`, `13–14`, `15`,
  `16`; nesting row stays unnumbered — it's derivation, not a numbered rule).
  En-dash in prose, but the grep-hostility the PLAN noted is solved by the
  mapping file, not the table.
- Package: `src/lib/explain/rule-content.model.ts` (mapping + URL builder + pure
  `collectMdLinks` and summary extractor shared by build and tests);
  `scripts/build-content.ts` (BFS closure copy into `dist/content/`, plus
  `dist/content/docs/rules-summary.md`). The package gains its build here:
  `build = run-s build:*` (`build:content` + `build:ts` — tsc emit to `dist/`
  via `tsconfig.build.json`, `rewriteRelativeImportExtensions` for the `.ts`
  import style), `prepack` runs it; `files` ships `dist` only. `dist/` git- and
  prettier-ignored.
- Card copies keep their provenance stamps; publishing always happens from the
  repo, so build-time access to `skills/` and `docs/` is guaranteed — full
  staleness tooling stays parked with `deblob docs`.

## Docs

- architecture.md touched (anchors only). INDEX.md touched (column). No README
  impact — the package still ships no runnable surface; explain lands with the
  CLI step.
- PLAN: step queue updated (02 opened; the packaging note dissolves here).
