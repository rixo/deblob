# Longshot — the delta

What `longshot` has that the chasing branches lack, by target branch. An entry
leaves when its branch integrates it.

## driver-layer

- **04/07 checkpoints 2–6, in one pass** (milestone 2). Readers in four groups
  (`language`, `host`, `test`, `driver`), each an array of instances bound by
  `include`/`exclude`, stacking; `js`, `ts`, `node`, `goodEnoughTests`,
  `hostDriver` (D7), `blobDriver` stock, exported at `deblob/readers` (R1).
  Knowledge out of `reading.model.ts` into the readers (`knowledge.model.ts`
  composes the bound ones per file). The flavor names tests (`.spec`, `.test`,
  `.e2e`); recognition is flavor-first, bindings and designations only add.
  `plain-ts`, `driverTech`, `drivers`, the host branch, `PURE_BUILTINS` gone.
  External edges carry their claim; the driver cell judges it. `driver-reader`
  registered, detected, file-level. Unclaimed free names and packages are red
  where a rule asks a proof; D8 keeps one red per missing premise. Default
  readers in one assembly (`readers.assembly.ts`) instead of three copies.
  Corpus: `cases/readers.spec.ts`, 13 rows; the old rows' `driverTech` became
  inline readers; `assembleCase` fills `host: [node()]`,
  `driver: [hostDriver()]` (ruling 13, T4). deblob's own config:
  `src/drivers/**` narrowed off the spec files, `host: [node()]`.
- Not done from S07: the READMEs (`config/`, `extraction/`, `check/`), the
  ports' headers beyond the new files, the `06_unknown-verdict` notes.

- **Apps layout + deblob's router** (L1, C1 (b), D4).
  `src/apps/{cli,serve, snapshot}` (boot, root driver, sub-driver, front
  service, ports), `src/lib/` gains `router`, `terminal` (port +
  process/recording adapters), `report` (ex `lib/cli` minus the CLI's grammar
  and help); `KNOWN_CHECKS`/`CHECK_RULES` to `check/checks.model.ts`;
  `lib/explain/content.port.ts`; `lib/view/ports/viewer.port.ts`;
  `src/drivers/wiring.ts` → `src/app.assembly.ts`. `DriverReader.claimsFile`
  (D4) with three corpus rows. deblob's config: the `src/drivers/**` glob gone,
  an inline `deblob-router` reader. Not done: `docs/implementation-guide.md`'s
  `drivers/` bullet, canon's "a bin, a server, an app" wording (collides with
  `apps/`).

- **Stock readers for partner techs** (milestone 3): `cac` (driver),
  `playwright` (test), `vite`, `astro` (driver, claims only — D1).
- **P1, the exclude baseline anchored** — also owed to main: the shipped
  baseline has the bug.

- **One check runner** (`check/checks.model.ts`): the detector table the CLI and
  the corpus each copied, and the snapshot now uses.
- A driver counted as blob (`blobDriver`) counts as blob in the stats.

## viewer

- **`Snapshot.verdicts`** (milestone 4): the graph checks' violations, file by
  file, with the message as `check` prints it; the `#debug` outline lists them
  and counts them. The design's pages untouched — the ask is in
  [DESIGN-ASK.md](DESIGN-ASK.md).
- The viewer's server (`drivers/wiring.ts`) builds its readers from
  `readers.assembly.ts`, the same defaults as the CLI.
