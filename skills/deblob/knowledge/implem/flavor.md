---
source: docs/implementation-guide.md (intro)
---

# The guide's flavor — what "always" means here

The architecture states principles and leaves room for several valid
materializations. The implementation guide picks one — **this flavor**: suffixed
filenames, `create*` factories, explicit composition roots. Home turf: Node
CLIs, build tooling, libraries — anywhere assembly is a program, not a component
tree. (The flavor has no settled name; these cards call it "this flavor" — the
guide is its definition.)

- Where this flavor says "always", that is _the flavor's_ choice, not a claim
  that the theory forbids alternatives. Other flavors of the same foundation
  exist (e.g. a Svelte-context-composition flavor: bare `service.ts` filenames,
  directory supplies the domain name, composition through the component tree).
- What the flavor doesn't regulate is out of scope on purpose — filing choices
  (grouping dirs, util layout) are yours; the architectural rules still apply.
- Status honesty: the guide is a draft distilled from production practice (two
  brownfield codebases, ~7 months daily use). Conventions are
  observed-and-settled unless marked **[prescribed]** — rule adopted, practice
  still catching up.

Altitude: [architecture](../hexagon.md) = the why; the guide (and these
`implem/` cards) = the what, one flavor made concrete.
