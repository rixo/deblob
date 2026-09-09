# Releasing — cutting a deblob 0.0.x

First written at the 0.0.3 cut (2026-09-02), reconstructing what 0.0.2 did by
hand. The npm package is `packages/deblob`; skills ship separately (from the
repo itself, via `npx skills add rixo/deblob`) and need nothing beyond a push to
`main`.

Version stance (ruled 2026-07-24): keep cutting 0.0.x until the feature set
feels satisfying or consumer pressure demands structure; at that switch 0.x
becomes the channel and minor denotes breaking changes.

## Procedure

Everything before `publish` is rehearsable; only the last step is outward.

1. **Preconditions** — working tree clean, the release content merged on `main`.
   `pnpm test` (100% / four axes bar) and `pnpm check` (self-gate) green in
   `packages/deblob`.
2. **Bump** — `npm version X.Y.Z --no-git-tag-version` in `packages/deblob`. The
   bare golden (`src/drivers/cli/__fixtures__/goldens/bare.txt`) carries the
   version in its headline and goes red on every bump — update the number, rerun
   `main.spec.ts`. Expected churn, rides the release commit.
3. **Tarball smoke** — `npm pack`, install the tarball into a scratch project,
   run `npx deblob check` against a case the release changed: one positive (the
   new behavior works from the shipped artifact) and one negative (the failure
   mode still fails). The suite runs from source; the tarball is a different
   artifact (`files` field, bin wiring, prepack output) and only a smoke proves
   it. Install into a project as `npm init -y` writes it (npm 11:
   `"type": "commonjs"`) — the 0.0.4 smoke caught every `deblob.config.ts`
   failing to load under that default, a break the suite (source,
   `"type": "module"`) could never see. Two clean cuts, then a real catch: the
   step earns its keep.
4. **Release commit** — `chore(release): X.Y.Z — <headline>`, carrying the bump
   and the golden. Push `main`.
5. **CI gate** — all three jobs green on the release commit: `check`, `alpine`
   (the musl smoke — napi bindings on Alpine are the recurring downstream
   break), `wasm-fallback`.
6. **Tag** — annotated `vX.Y.Z` on the release commit, one-line summary of the
   cut in the tag message; push the tag.
7. **Publish** — `pnpm publish` from `packages/deblob` (prepack builds content
   and dist). Needs live npm auth: `npm whoami` first; a PUT without a valid
   token fails as a misleading **404**, not 401 — if you see 404 on publish,
   it's auth, not the package.
8. **Verify** — `npm view deblob version` returns the new number; optionally a
   fresh `npm i deblob` smoke.

## What a release step carries since 0.0.5

- **Version-pinned rule URLs** (wired at 0.0.5, rule-names chapter): every rule
  URL the binary prints is `blob/v<version>/docs/architecture.md#<slug>`, the
  version read from package.json. A published binary therefore cites a tag that
  must exist — step 6 (tag, pushed) runs before step 7 (publish), never after. A
  dev build cites a tag that does not exist yet; that is expected.
- **A tag is not a release** (0.0.5, 2026-09-10): feedback that lands between
  step 6 and step 7 means a new version, not a moved tag — the tag is public the
  moment it is pushed, and a fix is one more commit. `v0.0.5` exists with no npm
  release behind it; 0.0.6 is what shipped.
