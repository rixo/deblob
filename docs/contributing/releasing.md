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
   it. Done at both cuts so far, no break found — cheap insurance, not a scar.
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

## Standing roadmap items that ride release steps

- **Version-pinned rule URLs** (chapter PLAN, Ideas): `canonicalRuleUrl` targets
  `blob/main`; once wired, each release pins `blob/vX.Y.Z` at this step so
  shipped citations survive main drift. Unwired as of 0.0.3.
