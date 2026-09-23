# Known failures — `false red` and `missed red` in the corpus markers

Opened 2026-09-23, between checkpoints 1 and 2 of type-name following, by rixo's
ruling: a row states the right verdict, and where the reader cannot deliver it
yet, the row says so ("confessing is ok, lying is not"). Twice the corpus pinned
a reader limit as a verdict: TABLE in the per-level row, then the type-names
boundary row with five false reds. This step gives the confession a marker, so
it never has to be a lie.

**Drafted 2026-09-23**, shaped with rixo the same evening. Nothing below is
built until "build".

## Goal

After this step a corpus line can say what the right verdict is and how the
reader gets it wrong today, and the run reports it without failing:

```ts
export const SPOT: Spot = new Spot() // false red: stable-root -- class types are not followed yet
export const LOOSE = load() // missed red: stable-root -- the call clause is not built
export const RATE = 3 // red: stable-root -- an ordinary claim, must pass
```

Read aloud: the reader shows a stable-root red on SPOT and it is false; there is
a stable-root red on LOOSE and the reader misses it. The words are the testers'
own — false positive, false negative — so a reviewer reads the claim and the
error without learning a symbol.

The suite goes green on known failures. Today 22 rows fail, and only
`tmp/HANDOFF.md` says which failures are expected, so a new red is lost in the
noise. After this step every expected failure is written on its line, with its
why, in the file the reviewer already reads. A red run means something changed.

What it buys: counted, per slug, both ways. A failure you didn't expect can't
hide among the ones you did, including a new error on a line that already
carries a confession. A confession can't go stale: when the reader starts
getting it right, the run fails and says to remove the marker, so the flip shows
up in a diff.

What it does not buy: nothing checks that the why is true, or that a confession
belongs to a real reader limit rather than a wrong verdict — that is still the
stamp's job.

Out of scope: skipping. Vitest skips a test; no runner skips a single assertion,
and neither does this one. Any change to what a verdict is, and any rule. The
migration changes no verdict: the same entries stay wrong, now confessed.

## API

**The grammar.** Two words in front of today's markers:

- `// false red: <slug>[, <slug>]* -- <why>` — the reader reports each slug on
  this line, and it is wrong: the right verdict is green for it;
- `// missed red: <slug>[, <slug>]* -- <why>` — each slug is red on this line,
  and the reader does not report it;
- `// false via:` and `// missed via:` the same, for trigger lines.

The why is required on both: a confession says what it waits for. Placement is
today's: at a line's end the marker claims that line, alone on its line it
claims the next code line, alone at the end of a file it claims the file. A line
with a plain claim and a confession on different slugs stacks them:

```ts
// missed red: stable-root -- the call clause is not built
export const X = f() // red: ambient-access
```

Loud, as today's grammar: anything starting `// false` or `// missed` (any case)
that fails the grammar, a confession without a why. `false` and `missed` never
combine.

**Counting.** Every marker entry is one assertion, per slug, counted, as today:

- `red: s` — expects one report of `s` there; unmatched → `missing`.
- `false red: s` — expects the reader to report `s` there, wrongly. The report
  is consumed and listed in `confessed`. No such report → the confession came
  true → `settled`.
- `missed red: s` — the reader should report `s` there and does not. A report of
  `s` that the plain claims there leave over → the confession came true →
  `settled`. None → listed in `confessed`.
- A report no marker accounts for → `unexpected`, as today.

**The match a row asserts.** `VerdictMatch` gains `settled`; `AS_MARKED` is
`{ missing: [], unexpected: [], settled: [] }`. A `settled` entry reads
`file:line false red slug — remove the marker`. `judge` also returns
`confessed`, entries read as the marker does,
`file:line missed red slug -- why`, which never fails a row; the row's test
reports them in the run output.

## Testing

Red first, rows stamped before the build:

- **Grammar** (`markers.model.spec.ts`): each form parses (`false red`,
  `missed red`, `false via`, `missed via`; at a line's end, alone above a line,
  stacked with a plain claim, alone at the end of the file); each loud form
  throws naming file and line (`// missed: stable-root`, `// false green: …`,
  `// false missed red: …`, a confession without a why).
- **Counting**: a `false red` reported → confessed; not reported → settled; a
  `missed red` not reported → confessed; reported → settled; two confessions of
  one slug on one line need two; a line with a confession and a new wrong report
  of another slug → that report is `unexpected`; a file-level confession covers
  a line-less entry.
- **The migration is the proof on the real corpus.** Every failing row today
  gets its confessions: each unexpected entry becomes a `false red` /
  `false via` on its line, each missing entry turns its `red:` into
  `missed red:` (split when only some slugs are missed). The boundary row's
  `// known failing:` comments become `false red`. The type-names rows are
  confessed too; checkpoint 3 then settles them row by row, and removing each
  marker is the visible end of its confession. Gate: the `confessed` entries
  after migration are exactly today's mismatch entries, compared as lists, and
  the suite is green. Spot mutation: removing any one confession turns its row
  red again.

**Gates**: typecheck, prettier from the root, coverage 100, suite green,
self-check count unchanged.

## Implementation

- `markers.model.ts`: the grammar and `LOOKS_LIKE_MARKER` extended; `Marker`
  carries its kind of claim (plain, false, missed); `matchVerdicts` counts the
  three and returns missing / unexpected / settled / confessed.
- `runner.service.ts`: `judge` returns the extended match.
- The corpus specs' row loops (`modules`, `dag`, `layers`): assert `AS_MARKED`,
  report `confessed`. Reporting channel: Vitest 4's test-context `annotate` (to
  be verified: that the default reporter shows annotations on a passing test).
  If it doesn't, the fallback is one summary printed after the file's rows.
  Either way, the report names the row, the line and the why.
- Migration, file by file, one checked diff: the entry lists before and after.

## Docs

- `runner/README.md` § API: the two confessions, how they count, what fails.
- `modules.spec.ts` header: the paragraph on stamping gains one sentence: a
  known failure is confessed with `false red` or `missed red`, never written as
  its wrong verdict.
- `tmp/HANDOFF.md`: the hand-kept list of known reds retires. The markers are
  the list now.
