# Scaffold — workspace, plugin channel, harness home

## 1. Goals

Turn the docs-only repo into the two-channel structure the program needs
(skills as an installable plugin, code as npm packages) — creating only what
is *settled*: the workspace mechanics, the plugin manifest, and the npm-channel
placeholder package. No speculative skeletons. Done = a consumer can
`/plugin marketplace add` this repo and see it load (zero skills is fine),
`pnpm install` succeeds at the root, and the `deblob` npm package is
publishable (publication itself is a human action, out of band).

## 2. API

The repo layout — the shape contract this chapter commits to:

```
deblob/
  README.md                  # front door: what deblob is, map, install
  LICENSE
  docs/                      # living docs (level 1→2 + methodology)
    architecture.md          #   level 1 — why
    implementation-guide.md  #   level 2 — what (factory-injection flavor)
    sdd.md                   #   the methodology
    self-review-checklist.md #   proto-skill material (absorbed by deblob-review, then tombstone)
  skills/                    # level 3 — how (flight manual, agent-executable)
    deblob/                  #   flagship: architecture daily rules
    deblob-sdd/  deblob-commit/  deblob-review/
  .claude-plugin/
    plugin.json              # plugin channel — git marketplace
  packages/                  # npm channel — consumers are CI/humans, no agent required
    deblob/                  #   the `deblob` package: placeholder now, grows the CLI (own chapter, research first)
  history/                   # this repo's chapters + GOAL / PLAN / META
  package.json  pnpm-workspace.yaml
```

Extension rules (why this layout is stable): a new flavor = one file in
`docs/`; a new skill = one dir in `skills/`; a new check = a module in the
`deblob` package. Nothing restructures. (A skill-scenario home was considered
and cut — see Out of scope.)

This chapter materializes only: `package.json`, `pnpm-workspace.yaml`,
`.claude-plugin/plugin.json`, `skills/` (empty home), and `packages/deblob`
(bare `package.json` + README stating "home of the deblob CLI — under
construction").

## 3. Testing

- `pnpm install` at root succeeds (workspace resolves the placeholder).
- `npm pack --dry-run` in `packages/deblob` succeeds (publishable shape).
- Plugin loads: `/plugin marketplace add <local path>` + `/plugin install
  deblob` in a Claude Code session shows the plugin with zero skills and no
  errors. Manual gate — CI comes with the CLI chapter.

## 4. Implementation

- Root `package.json` — private workspace host (root itself never publishes).
- `pnpm-workspace.yaml` — `packages/*`.
- `.claude-plugin/plugin.json` — name, description, version 0.0.0; skills
  auto-discovered from `skills/`.
- Empty `skills/` home.
- `packages/deblob` — name `deblob`, version 0.0.1, minimal README; the
  npm-channel placeholder the CLI later grows into.

## 5. Docs

README Contents table: no change needed now (skills row already says
_planned_); flip that row when the first skill lands. No other living doc
affected.

## Out of scope

- **CLI implementation** — deliberately excluded: no design exists yet
  (boundary detection, config shape, ts-morph vs madge, output format). The
  CLI chapter opens with a research move; its PLAN item gains that note. The
  placeholder package carries zero code.
- **Skill-scenario harness home (`tests/`)** — considered and cut as
  overselling: automated pressure-runs cost ~30 subagent runs per wording
  iteration per skill (5+ reps × arms × scenarios) plus transcript judging —
  infra we haven't designed or costed. Downscoped: scenario *docs* ride with
  the skills work; runs start manual; automation only if iteration rate
  demands it. Decision lives with the skills/harness PLAN items.
- Skill content (per-skill chapters), marketplace publication, the npm publish
  act itself (human, out of band).
