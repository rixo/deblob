# Endgame — the delta

What `endgame` has that the chasing branches lack, by target branch. An entry
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

## viewer

- The viewer's server (`drivers/wiring.ts`) builds its readers from
  `readers.assembly.ts`, the same defaults as the CLI.
