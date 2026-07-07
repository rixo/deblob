# deblob — program goal

> The outermost chapter's GOAL ([sdd](../wip/sdd.md) §3). Stable why — the
> roadmap churns in [PLAN.md](./PLAN.md), never here.

Distill a production-proven practice into a public, adoptable system, on four
connected surfaces:

1. **Theory** (`architecture.md`) — the why: hexagonal service architecture
   with prescriptive, shape-visible rules.
2. **Implementation guide(s)** — the what: one document per flavor, where
   opinions get introduced (first: TypeScript/ESM factory-injection).
3. **Flight manual** — the how: agent skills (`deblob`, `deblob-sdd`,
   `deblob-commit`, `deblob-review`), lookup-grade, judgment rules only.
4. **Enforcement** — the CLI: mechanical rules checked deterministically
   (DAG, dependency matrix, composition, visibility), runnable in CI without
   an agent.

Alongside the architecture, the SDD methodology (`sdd.md`): specs as forcing
functions, two axes (history / living docs), review-economics framing — human
review is the bottleneck; everything here exists to concentrate it where it
pays.

**Success test:** a team — humans and agents — can adopt the architecture and
the methodology from this repo alone: docs citable, skills installable, checks
runnable. If coworkers won't use it, it doesn't exist.
