# Step 02 — guide cards adoption (`knowledge/implem/`)

The step opened with a contained research move: slice
`docs/implementation-guide.md` into knowledge cards under the step-00 authoring
contract (prompt-optimized register, meaning-preservation second pass per card,
holistic cross-read, provenance frontmatter). Per the step-01 ruling, a research
move fully consumed by the next move is one step's story — no standing research
step; cards land directly at their final home.

## 1. Goals

Complete the `deblob` skill's knowledge layer with the flavor level: the guide
(implementation, TS/ESM) sliced into cards, closing the last whole-doc Deeper
links. After this step every Deeper link in the skill's references points at a
card except `docs/self-review-checklist.md` (scheduled to be absorbed by the
review skill, step 04).

## 2. API

- **`skills/deblob/knowledge/implem/`** — flat, no flavor dirs (step-01 ruling):
  9 cards mirroring the guide's structure — flavor (the altitude note: "always"
  = this flavor's choice; observed vs [prescribed] status; the flavor has no
  settled name — cards say "this flavor", never the guide title's provisional
  one), file-naming, service-anatomy, naming, no-barrels, assembly-patterns
  (config hydration folded in, as in the guide's own §6), error-management,
  testing-in-practice, brownfield-reading.
- **Implem cards carry flavor deltas only** (ruling, review): where the guide
  restates the architecture for standalone readability, the card links the arch
  card instead — the corpus is one system, the why is one hop away.
  Self-containment yields to progressive disclosure _within_ the corpus. Review
  killed a config-hydration card (3 lines of flavor in a page of restatement)
  and the whole layer-contents card (guide §4 is entirely arch restatement:
  pure-3p-libs, type-only exemption, port purity, logging-as-effect — all stated
  by architecture.md and carried by arch cards); trimmed write-for-the-reviewer
  and no-barrels restatements to links.
- INDEX gains an "Implementation" question section; implem cards cross-link arch
  cards (`../`) where the guide references the architecture — the why-chain
  stays walkable.
- Deeper rewiring: placement (§2/§3 → service-anatomy, naming; the §4 link
  dropped — arch cards cover it), handling-failure (§7 → error-management),
  writing-tests (§8 → testing-in-practice).

## 3. Testing

Meaning-preservation pass ran per card against the guide (notably: the
[prescribed] marker on test factories, the "honestly unresolved"
package-boundary point, and the flavor-not-theory altitude are preserved —
compression must not harden a draft into doctrine). Mechanical gates: all
relative links resolve; every card carries a `source:` frontmatter stamp.

## 4. Implementation

9 cards + INDEX section + 3 Deeper rewires; chapter PLAN queue item dissolved
into this spec.

Deviation from the queue item: named `02_guide-cards-adoption` (not `-research`)
— the research move is inside the step, per the step-01 ruling.

## 5. Docs

- `docs/implementation-guide.md` §6 — review clarified "shared kernel instances"
  to "a shared composition unit (`.service.ts` / `.adapter.ts`) is instantiated
  once": the vague phrase invited interpretation. Landed in the guide first,
  propagated to all views carrying the statement (implem assembly-patterns, arch
  layer-assembly card, placement reference) in the same change.
- `docs/implementation-guide.md` §3 — naming ruling (review): **types are named
  by role, qualified only to disambiguate** — `Logger`, `IconSource`, no
  mandatory `Port` suffix (the file path already declares the layer); the
  service API type keeps `<Name>Service` because domain vocabulary takes the
  bare name; `Config` keeps its suffix (the name is the role). Rationale in the
  guide: a rule that fights the pull of the cleaner form gets violated by
  instinct — `{ logger: Logger }` over `{ loggerService: LoggerPort }`.
  Propagated to the naming card; architecture.md's own `FsPort`-style examples
  are staged for the next arch pass (root PLAN, arch-touches).
- `error-management` deliberately keeps the silent-failure mention without the
  checklist link — the checklist dies at step 04; the card must outlive it.

## Open questions

- The guide's own open point (package-boundary exports) is mirrored, not
  resolved, in `no-barrels` — with an altitude note added at review: it sits at
  flavor level only because the architecture's packaging dimension is
  under-articulated (root PLAN research item); the card updates when the theory
  rules.
