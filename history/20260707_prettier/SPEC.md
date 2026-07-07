# Prettier

## 1. Goals

Uniform formatting for an md-heavy repo, enforced by tooling rather than
attention — one one-time normalization pass, then `--check`ability forever.

## 2. API

`.prettierrc.yaml` (the formatting contract):

```yaml
semi: false
proseWrap: always
plugins:
  - prettier-plugin-jsdoc
```

Everything else: defaults (`printWidth` 80, `trailingComma` all, double quotes).

Root `package.json` scripts (extensible `lint`/`lint:*` shape, prettier-only for
now; `run-p` via `npm-run-all2`):

```json
"lint": "run-p lint:prettier",
"lint:prettier": "prettier --check .",
"format": "prettier --write ."
```

**Prettier MUST live at the root** — workspace packages don't carry their own
prettier setup (learnt in pain). Implies: the root `.prettierignore` is global
to all packages (starts with `pnpm-lock.yaml`; `node_modules` already covered by
`.gitignore`, which prettier v3 respects).

Scope: whole repo, `history/` included (append-only is not unformattable; frozen
chapters never change, so the check never bites them).

## 3. Testing

`pnpm lint` green after the normalization pass; `git diff --stat` of the pass
reviewed (whitespace/wrap-only — any semantic-looking hunk is a bug).

## 4. Implementation

Root devDependencies (`prettier`, `prettier-plugin-jsdoc`, `npm-run-all2`,
`lefthook`), `.prettierrc.yaml`, `.prettierignore`, `lefthook.yml`, scripts, one
`pnpm format` pass over the repo.

## 5. Docs

None — formatting is self-describing via `.prettierrc.yaml`; README untouched.

## Decisions

- `proseWrap: "always"` over `"preserve"`: enforcement beats zero-churn for a
  public docs repo; churn stays paragraph-scoped.
- `singleQuote` considered, rejected: no grounded rationale beyond style-family
  association; defaults win absent a reason.
- Check wiring ruled mid-chapter (initially deferred): lefthook pre-commit —
  `prettier --write {staged_files}` + `stage_fixed`, installed via the `prepare`
  script. CI check can still join later.
- Ops constraint (this working setup): the repo mount is sshfs `noexec` — node
  tooling and git commits (hooks!) run on the host machine over ssh.
