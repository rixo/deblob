# Endgame — tonight's review

Where to look, what to rule. Everything else is in [GUESSES.md](GUESSES.md)
(every hole, the default taken, where it lives) and [DELTA.md](DELTA.md) (what
the chasing branches lack).

## Read first

1. `git log --oneline ecbfa15..endgame` — six commits, one per milestone, each
   message says what it did and found.
2. [TESTING.md](TESTING.md) — the test census, the one thing you asked to learn:
   what test bodies hold, with numbers.
3. The partner report stays out of the repo: `REPORT.md` in the session
   scratchpad's partner directory (counts per package, 0.0.6 → driver-layer →
   endgame).

## To rule, by leverage

1. **C1 — deblob's own CLI has no router.** Blocks the self-restructure and ≈390
   of the self-check's 594. (a) cac, (b) a local router claimed, (c) the switch
   cut. The one decision the endgame could not take for you.
2. **P1 — a bug in the shipped baseline.** `**/build/**` swallows a source unit
   named `build`. Fixed in endgame (anchored at the root); owed to main, any
   release. Confirm the fix's shape.
3. **D7 — `hostDriver()`.** A driver whose tech is the host alone had no reader
   to bind once `plain-ts` went. Endgame ships it, opt-in.
4. **D8 — one red per missing premise.** A callback handed to an unclaimed
   callee is cut as a hook; an unread driver's imports are not also
   `driver-calls-services`.
5. **T1 / T5 — test bodies and test roots.** The census's reading: option C on
   statement-level control (not `??`/`?.`), and a test file's root exempt from
   `stable-root`.
6. **P4 — `node:path` in a driver is red** (pure = model). Canon-consistent, the
   first friction a partner meets.
7. **R-series** (knowledge placement: `__dirname`, pure builtins, value reads of
   unclaimed names) — defaults are the least surprising; skim.

## The experiment worth reading

P5 in GUESSES: the smallest partner package brought to green by hand on a
scratch copy — 78 → 16, and the 16 are open rulings (T5) or reader limits. The
canon shape held on real code, cost under an hour, and caught one design error
of the refactor's own.

## Numbers

- deblob: 1361 tests, coverage 100, typecheck clean; viewer 55. Self-check 594
  (was 474 on driver-layer before the viewer's code joined).
- Partner packages: green on 0.0.6; 86–1,050 on driver-layer's unreleased
  outside rules; 78–484 on endgame with ruled configs, the CLI entries read as
  drivers.

## Try it

From any project directory, endgame's CLI from source (the viewer bundle is
built into `packages/deblob/dist/viewer`):

```sh
EG=~/projects/deblob.endgame/packages/deblob/src/drivers/cli/bin.ts
node $EG check          # the ruled rules
node $EG view           # the map; the #debug outline lists the verdicts
```

A config in the ruled shape imports the readers from endgame's source:
`import { cac, node } from "<endgame>/packages/deblob/src/readers.ts"`, then
`readers: { host: [node()], driver: [cac({ include: ["src/cli.ts"] })] }`. The
partner copies with such configs sit in the session scratchpad (`setup.sh`
rebuilds them; nothing is written under the partner's tree).
