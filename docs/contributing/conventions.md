# Repo conventions

House style for working in this repository. Not part of the exported methodology
(that lives in [docs/](../)) — if a rule here proves general, it migrates to the
implementation guide.

## package.json key order

Sorted **public/outward first → private/inward last**:

1. Identity and publication surface: `name`, `version`, `description`,
   `license`, `author`, `repository`, `exports`, `files`, …
2. Dependency contracts, most outward first: `peerDependencies` → `dependencies`
   → `devDependencies`.
3. Inward tooling last: `scripts` (and similar maintainer-only fields).

Rationale: a reader opens a manifest to learn what the package _is_ and
_exposes_ before how its maintainers work on it. (Not enforceable by
`sort-package-json`-style tools — they impose their own canonical order; manual
until it hurts.)

See also: [docs are the source of truth](./docs-are-the-source-of-truth.md) —
methodology, not convention; read it before editing `docs/` or `skills/`. And
[prompt-optimized authoring](./prompt-optimized-authoring.md) — the register
agent-facing artifacts are written in.
