# Known failures — `false red` and `missed red` in the corpus markers

Opened 2026-09-23, between checkpoints 1 and 2 of type-name following, by rixo's
ruling: a row states the right verdict, and where the reader cannot deliver it
yet, the row says so ("confessing is ok, lying is not"). Twice the corpus pinned
a reader limit as a verdict: TABLE in the per-level row, then the type-names
boundary row with five false reds. This step gives the known failure a marker,
so it never has to be a lie.

**Drafted 2026-09-23**, shaped with rixo the same evening. Nothing below is
built until "build".

## Goal

After this step a corpus line can say what the right verdict is and how the
reader gets it wrong today, and the run reports it without failing:

```ts
export const SPOT: Spot = new Spot() // false red: stable-root -- class types are not followed yet
export const LOOSE = load() // missed red: stable-root -- the call shape is not built yet
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
carries an expected failure. An expected failure can't go stale: when the reader
starts getting it right, the run fails and says to remove the marker, so the
flip shows up in a diff.

What it does not buy: nothing checks that the why is true, or that an expected
failure belongs to a real reader limit rather than a wrong verdict — that is
still the stamp's job.

Out of scope: skipping. Vitest skips a test; no runner skips a single assertion,
and neither does this one. Any change to what a verdict is, and any rule. The
migration changes no verdict: the same entries stay wrong, now marked as
expected failures.

## API

**The grammar.** Two words in front of today's markers:

- `// false red: <slug>[, <slug>]* -- <why>` — the reader reports each slug on
  this line, and it is wrong: the right verdict is green for it;
- `// missed red: <slug>[, <slug>]* -- <why>` — each slug is red on this line,
  and the reader does not report it;
- `// false via:` and `// missed via:` the same, for trigger lines.

The why is required on both: an expected failure says what it waits for.
Placement is today's: at a line's end the marker claims that line, alone on its
line it claims the next code line, alone at the end of a file it claims the
file. A line with a plain claim and an expected failure on different slugs
stacks them:

```ts
// missed red: stable-root -- the call shape is not built yet
export const X = f() // red: ambient-access
```

Loud, as today's grammar: anything starting `// false` or `// missed` (any case)
that fails the grammar, an expected failure without a why. `false` and `missed`
never combine.

**Counting.** Every marker entry is one assertion, per slug, counted, as today:

- `red: s` — expects one report of `s` there; unmatched → `missing`.
- `false red: s` — expects the reader to report `s` there, wrongly. The report
  is consumed and listed in `expectedFailures`. No such report → it passes →
  `unexpectedPasses`.
- `missed red: s` — the reader should report `s` there and does not. A report of
  `s` that the plain claims there leave over → it passes → `unexpectedPasses`.
  None → listed in `expectedFailures`.
- A report no marker accounts for → `unexpected`, as today.

**The match a row asserts.** `VerdictMatch` gains `unexpectedPasses`;
`AS_MARKED` is `{ missing: [], unexpected: [], unexpectedPasses: [] }`. An
unexpected pass reads `file:line false red slug — remove the marker`. `judge`
also returns `expectedFailures`, entries read as the marker does,
`file:line missed red slug -- why`, which never fail a row; the row's test
reports them in the run output. The two names are the testing world's, not ours:
Python's `unittest.TestResult` keeps `expectedFailures` and
`unexpectedSuccesses`, pytest says `xfail` and, strict, fails on `XPASS`
(renamed 2026-09-24 from `confessed` / `settled`, and the marker from
"confession" to expected failure, rixo: an invented metaphor where established
terms exist; not "skipped" — a skipped line is not judged, so it could never
notice the reader catching up).

## Testing

Red first, rows stamped before the build:

- **Grammar** (`markers.model.spec.ts`): each form parses (`false red`,
  `missed red`, `false via`, `missed via`; at a line's end, alone above a line,
  stacked with a plain claim, alone at the end of the file); each loud form
  throws naming file and line (`// missed: stable-root`, `// false green: …`,
  `// false missed red: …`, an expected failure without a why).
- **Counting**: a `false red` reported → expected failure; not reported →
  unexpected pass; a `missed red` not reported → expected failure; reported →
  unexpected pass; two expected failures of one slug on one line need two; a
  line with an expected failure and a new wrong report of another slug → that
  report is `unexpected`; a file-level expected failure covers a line-less
  entry.
- **The migration is the proof on the real corpus.** Every failing row today
  gets its expected failures: each unexpected entry becomes a `false red` /
  `false via` on its line, each missing entry turns its `red:` into
  `missed red:` (split when only some slugs are missed). The boundary row's
  `// known failing:` comments become `false red`. The type-names rows get them
  too; in checkpoint 3 they pass unexpectedly row by row, and removing each
  marker is the visible end of its known failure. Gate: the expected failures
  after migration are exactly today's mismatch entries, compared as lists, and
  the suite is green. Spot mutation: removing any one expected failure turns its
  row red again.

**Gates**: typecheck, prettier from the root, coverage 100, suite green,
self-check count unchanged.

## Implementation

- `markers.model.ts`: the grammar and `LOOKS_LIKE_MARKER` extended; `Marker`
  carries its kind of claim (plain, false, missed); `matchVerdicts` counts the
  three and returns missing / unexpected / unexpectedPasses / expectedFailures.
- `runner.service.ts`: `judge` returns the extended match.
- The corpus specs' row loops (`modules`, `dag`, `layers`): assert `AS_MARKED`,
  report `expectedFailures`. Reporting channel, as landed: `console.info` from
  the row's test, one line per expected failure. Vitest prints a passing test's
  console output under the row's name, so the report names the row, the line and
  the why with no summary to build. Verified 2026-09-24: `annotate` shows only
  under `--reporter=verbose`, not in the default reporter, so it was dropped.
  Vitest hides a passing test's console output when it detects an agent
  environment (`AI_AGENT`, `CLAUDECODE`); a terminal shows it.
- Migration, one scripted pass with every replacement's count checked: 41
  entries over 22 rows. A missed `stable-root` on a call says it waits for the
  call shape (`modules.model.ts`: "the call shape comes with a later clause"), a
  missed `ambient-access` that its detector is not built, a type-name miss that
  names are not followed yet. Two layers lines claimed
  `ambient-access, stable-root` with only `ambient-access` missed; they split
  into a stacked `missed red: ambient-access` over the plain `red: stable-root`,
  shifting their rows by one line. Gate met: the expected failures equal the old
  mismatch entries row by row (the two shifted rows compared at their old
  lines), and removing one `false red` and one `missed red` turned each row red.
- Found on the way: with the suite green, coverage prints for the first time in
  a while and shows `reading.model.ts` under 100 (lines 294, 311–313, 406).
  Identical at the previous commit — Vitest skips the coverage report when a
  test fails, so the red suite hid it. Not this step's; open.

## Docs

- `runner/README.md` § API: the two expected-failure markers, how they count,
  what fails.
- `modules.spec.ts` header: the paragraph on stamping gains one sentence: a
  known failure is marked with `false red` or `missed red`, never written as its
  wrong verdict.
- `tmp/HANDOFF.md`: the hand-kept list of known reds retires. The markers are
  the list now.
