# Unknown — a third verdict, said on the line and in the message

Opened 2026-09-24, between checkpoints 1 and 2 of type-name following, from a
grill with rixo. The trigger: `export const TABLE: Table = …` with `Table`
readonly is red today, and the message tells the author to "use a readonly type"
— which they did. The reader cannot follow the name, and says so as if it had
proven the value mutable. A red must say which it is.

**Drafted 2026-09-24.** Nothing below is built until "build".

## Goal

After this step a line gets one of three verdicts, and both the row and the
message say which:

- **green** — nothing is proven wrong.
- **red** — the reader proves the violation (`export let x`, a mutable literal
  at root, a read of the clock). Ways out: change the code, or go blob. An
  escape hatch, where one exists for the situation, is a third.
- **unknown** — the reader cannot prove the line either way (a type name it does
  not follow, a call whose result it does not know, a root statement it does not
  recognise). Fails like red. Ways out: change the code, fix the tool, or go
  blob. Fixing the tool is any fix that is not a change to the code: the reader
  itself, or the setup (TypeScript over JavaScript, strict over non-strict, the
  engine, a deblob config option).

And a third outcome that is not a verdict: **broken** — deblob cannot do its job
on this input: a file that does not parse, a line the reader cannot interpret
(`BARE: ReadonlyMap` without its type arguments, `Object.freeze()` with nothing
to freeze). Not a type check: tsc owns type errors, and deblob never promises to
find them; broken is the reader meeting what it cannot read, the same situation
as a syntax error with no types involved. Exit 2, like an unresolved import,
with the file, the line and what could not be read. Today a parse failure
throws; it becomes this report.

Rulings this rests on (rixo, 2026-09-24):

- **Unknown fails `check`, exit 1.** Exit 2 means the run can't run: deblob
  declines to give a verdict (an unresolved import leaves the graph incomplete;
  a broken file cannot be read). Unknown means the run could run better: the
  line gets a verdict, unknown, which fails like red, and the message says what
  the reader could not see. The price is accepted: code that is fine can be
  blocked by the reader's limit, and the ways out say how to unblock it.
- **`check` gives the verdict under the current premises and does not comment on
  them.** A green is worth more on a codebase the checker sees better (strict
  TypeScript, the engine, no hatch on); that stays implicit. A passing test run
  proves more on a strict TypeScript codebase with full tests and lint than on a
  JavaScript one with the occasional test, and the test runner does not say so
  either.
- **The message always names the condition** — what triggered the red or the
  unknown — so the agent understands the pattern to avoid or the limit it hit.
  Ways out are a judgment call: `check` should name some, `explain` should name
  all. Should, not must: a way out may be left unnamed (one we don't want to
  promote, one that would make the message too long or cryptic), and every such
  omission from `explain` must be written down with its reason in `explain`'s
  content, so a reviewer never guesses whether it was forgotten or ruled out.
  Escape hatches are disclosed: nobody is left stranded.
- **Tight by default.** Certified claims are strong because the default is
  strict. Loosening is the exception and must be justified: an escape hatch is
  the mitigation where strict would do too much harm, it names the specific
  situation it unblocks, and it is never on by default (`noTsc` is a no-op where
  there is no TypeScript, not a hatch switched on). No silent green for a case
  the reader cannot judge.
- **Types are trusted as declared.** A proof by types is only as strong as the
  types: a cast, `as any`, a JSDoc type never checked (`jsconfig.json` without
  `checkJs`) weakens deblob's verdict the way it weakens tsc's. deblob does not
  stand in for the type system; guards against cheating it would be opt-in
  `strict*` rules.

What it buys: an agent reading a red knows whether its code is proven wrong or
not proven right, and what the reader was missing. The dogfood count (83
`stable-root` today) splits into red and unknown, and the unknown share is what
the type-names and engine steps have to shrink.

What it does not buy: fewer reds. No verdict flips green here; every unknown is
a red today and stays failing.

Out of scope: following names (type-names checkpoints 2 and 3), the engine and
its runs (see Testing: the second setup), `ambient-access` (not built; born with
the third verdict when it is).

**Scope — every rule.** Only `stable-root` judges line by line with a reader
limit today; the edge rules' limit is the unresolved import, already exit 2.
Checked on the way (Testing): no other check turns "cannot tell" into a red.

## API

**Known or unknown, the operation.** A root binding is **green** when the syntax
proves it readonly (today's census, unchanged), **red** when the syntax proves
it can be mutated or it stores a read of the machine, **unknown** otherwise. A
root statement is **red** when the reader names it as doing something on
evaluation (an assignment, a `delete`, an increment), **unknown** when the
reader does not recognise it. The unknown side is the complement: a form the
reader has no proof for, either way, is unknown — never red by default.

**No clause for a read of mutable module state** — weighed and dropped
2026-09-24 (rixo). `export const MEMBER = RECORD.a` with `RECORD` mutable: in
the same file `RECORD` is already red, and fixing it makes `MEMBER` green;
`mutableModuleState: true` is the user allowing the state. The one case left is
a spec file's root reading a blob's state (blob is exempt, and only assembly and
tests import it; an assembly's root holds only imports) — micro blast radius,
and restricting tests has hurt both ways in practice. Reassessed if a real
problem shows up. `MEMBER`, `PICKED` hold a number: truth green.

**The table of forms** (reviewed 2026-09-24; A–C trusted to the agent, D and F
dug with rixo):

- **Proven red**: `let` / `var`; a record, array or default-exported literal
  without `as const`; `new Map()`, `new Date()`; `Readonly` one level over a
  mutable inner type; `Object.freeze` one level over a mutable inner literal;
  `Readonly<Map>`; a type literal with one mutable member, a readonly member
  holding a mutable array, `Record<…>` bare, a readonly tuple holding a mutable
  array; a method signature on a non-readonly type; every machine read
  (`process.env`, its alias, the clock, entropy, through calls and callbacks);
  an assignment or `delete` at root.
- **Unknown, truth red** (`red` + `false unknown`): a type name that names a
  mutable type (`Loose`, `readonly Loose[]`, a merged or inherited mutable
  member, a generic substituted with a mutable argument).
- **Unknown, truth green** (`false unknown` alone): a type name that names a
  readonly type; method signatures under `Readonly`, index signatures, `keyof`,
  `unique symbol`; a class, `typeof`, a qualified name, a mapped type, a
  package's type; `Object.freeze` over an imported binding; a call whose result
  is a primitive (`Math.max(1, 2)`, `await Promise.resolve(1)`) and a binding
  aliasing one; a member read or destructuring that yields a primitive
  (`MEMBER = RECORD.a`, `{ a: PICKED } = RECORD`); a path built from the
  module's own location (`fileURLToPath(new URL("./x/", import.meta.url))`) —
  canon amended 2026-09-24 (rixo): the module's location is presumed not a read
  of the machine; the reader stops calling it one, and the path is unknown until
  built-in knowledge says `fileURLToPath` and `new URL` are pure.
  `import.meta.env` stays a machine read. 20 of deblob's 83 self-check
  violations are this form.
- **Unknown, truth from the case's code**: a call to a function the case defines
  (`createRates()`, `createApp()`, `Object.freeze(createTable())`) — its body
  decides between the two above.
- **Broken**: `ReadonlyMap` without type arguments, `Object.freeze()` empty.
- **Unchanged**: every `missed red` of the call shape — the calls canon makes
  red (reaching the tech, running a use case, into a local function of a file
  whose layer may touch the tech) where the reader is silent, not unknown.
  `SHADOWED` (a local `Readonly` trusted by name) stays `missed red`.

A call to a language built-in (`Math.max`, `Promise.resolve`) is not the call
shape: canon's red calls are the three above, and `Math` is the language, not
the tech. What the reader lacks is its result — `Math.max` returns a number.
Knowing it is not this step: "built-in knowledge", facts a language or a tech
guarantees, shipped with deblob as one more source beside the reader and the
engine — JavaScript first, others stackable (rixo 2026-09-24, principle agreed),
an idea card on `history/PLAN.md`.

**The violation.** `ModulesViolation` keeps its shapes and gains one field:

```ts
/** `null`: proven. Otherwise what the reader could not see. */
unknown: UnknownCondition | null
```

`UnknownCondition` is a closed union owned by `violation.model.ts`, one member
per reader limit (`type-name`, `call-result`, `statement`, … — the table fixes
the list), carrying what the message needs to name it (the type name, the
callee). `holds: "unproven"` becomes `holds: "mutable"` for the known side; an
unknown binding carries `holds: "unproven"` with its condition. The check owns
the verdict; `render.model.ts` owns the words, per condition.

**The reader's answer.** `readonly: boolean` on a definition becomes a three-way
answer (`"readonly" | "mutable" | UnknownCondition`, final shape at build).
`isReadonlyType` answers the same three: checkpoint 3 of type names rewrites it
anyway, and builds on this answer.

**The message.** Red: today's, with "use a readonly type" dropped where the
annotation already is one. Unknown: the condition, then the ways out, e.g.
`line 4 binds state at module root — unknown: the reader does not follow the type name Table yet; inline the type, add \`as
const\`, or move it inside a
factory`. Which ways out each condition names in `check`is per condition, decided in the table;`explain`
lists all of them.

**The stamps.** `red` means a known red, fully specified; the reader's unknown
never satisfies it.

- `// stubborn unknown: <slug> -- <why>` — the reader answers unknown here, and
  the limit stays: we wanted it gone, tried, and fixing it was judged too
  expensive. An assertion like `red`, the why required (it names the limit and
  what fixing it would cost). The one stamp that pins the reader's answer
  instead of the truth; the adjective says it is not a license. There is no bare
  `// unknown`: every unknown stamp says which it is.
- `// false unknown: <slug> -- <why>` — the reader answers unknown here,
  wrongly, and the limit is to be lifted. Alone, the truth is green. Stacked
  with a plain `// red: <slug>` on the same line, the truth is red: the `red` is
  the verdict the line will have, not counted while the `false unknown` holds.
- Lifecycle: every limit starts as `false unknown`; stamping turns it
  `stubborn unknown` once fixing is judged too expensive. When the reader gives
  the known verdict, `false unknown` is an unexpected pass (remove the marker,
  the stacked `red` then counts). A `stubborn unknown` is a plain claim: when
  the reader answers otherwise, it is missing and the row fails (update the
  stamp: we learned something).
- `false red`, `missed red`: unchanged, now about known reds only. `via` markers
  are unchanged too: they match a report's triggers whether the report is known
  or unknown.
- Malformed and loud: a bare `// unknown:`, `stubborn red`, `stubborn via`,
  `missed unknown`, an unknown marker without its why.
- In the model: a marker's `kind` gains `"unknown"` (`stubborn unknown` is the
  plain claim, `false unknown` the expected failure); `Reported` gains
  `unknown: true`, present only on an unknown report, as `expectedFailure` is on
  a marker. Counting keys an unknown report as `file:line unknown slug`, so
  plain `red` and `false red` match known reports, `stubborn unknown` and
  `false unknown` unknown ones.

## Testing

Red first, rows stamped before the build.

- **Corpus re-stamp**, `modules.spec.ts` and the stable-root lines elsewhere:
  every red line is judged known or unknown; unknowns get `false unknown` (+
  `red` when the truth is red), none `stubborn` yet — nothing has been tried and
  given up on; TABLE's and the type-names rows' `false red` become
  `false unknown`. A new row per condition: the message names the condition
  (asserted on the rendered line, not only the shape).
- **Grammar and counting** (`markers.model.spec.ts`): the two new forms parse
  and stack; `red` against an unknown report is missing + unexpected;
  `false unknown` + `red` counts as described, both ways of its lifecycle.
- **Broken**: the two uninterpretable rows (`BARE`, `EMPTY_FREEZE`) leave the
  red row for rows of their own asserting broken; a file that does not parse
  asserts broken instead of a throw; the CLI exits 2 on either (a CLI test, as
  for an unresolved import). How a row asserts broken, ruled 2026-09-24 (rixo,
  for consistency with the other markers): `// broken -- <why>` on the line
  deblob cannot read, alone at the end of the file for a file that does not
  parse. Broken is the whole row's outcome — a broken run gives no verdicts — so
  a broken marker makes the row expect broken, and the row passes only if deblob
  breaks on that line; a broken marker beside any verdict marker in the row is
  loud. No slug: broken is no rule's. Red first, in checkpoint 2's opening
  tests.
- **Other checks**: a sweep of every check for a "cannot tell → red" path;
  anything found becomes a row, or a line in this SPEC saying why it is not an
  unknown.
- **The second setup** (with the engine): ruled — the corpus pins both setups,
  every row runs once per setup, a row whose verdict differs gets its own given.
  No second setup exists until the engine step; this step only keeps the row
  format open to it (no per-setup machinery built ahead).

**Gates**: typecheck, prettier from the root, coverage 100, suite green,
self-check reported as `red` / `unknown` split (83 total unchanged).

## Implementation

Planned as three checkpoints, each its own commit on a go (cut as step 05 was:
the corpus migrates with the runner that reads it, or every spec file throws on
the new markers):

1. Red first: the grammar and the counting, in `markers.model.spec.ts`.
2. The runner reads the markers; the violation field; the reader's three-way
   answer (the `import.meta.url` form included); the corpus re-stamped per the
   table; suite green.
3. Broken: its marker tests red first, then the reader, the graph and the CLI's
   exit 2 (cut from 2, too much for one review).
4. Messages (`render.model.ts`, `explain`), docs, self-check split. The ways out
   depend on the file's language: in a `.js` file an unknown never suggests a
   readonly type, and `mutableModuleState: true` is named as a real way out
   (rixo 2026-09-24: a pure JavaScript codebase is unlikely to escape it). A
   `.js` row pins it.

Then type-names checkpoints 2 and 3 resume, on the three-way answer.

**Checkpoint 2, landed.** What differs from the plan above:

- The condition lives with the reading, not the violation: `UnknownCondition`
  and `Immutability` in `graph.model.ts` (the reader produces them, and
  extraction does not import the check); `ModulesViolation.unknown` reuses it. A
  condition names a form by its ESTree type (`TSTypeQuery`, `TSMethodSignature`,
  `MemberExpression`), the operator's word, or the name: the words are the
  message's (checkpoint 4).
- The definition's `readonly: boolean` became `immutability`; `holds` is
  `"state" | "machine"`, `unknown` saying whether the state is proven.
- `other` was two things: a proven write (increment, `delete`) and the reader's
  catch-all for a statement it does not know. The catch-all is now `unread`, an
  unknown; `other` stays a proven red.
- The census default flipped: a form not listed reads unknown, not mutable. So
  the mutable side is listed too: a record or array literal, `T[]`, a bare
  tuple, `Array`/`Map`/`Set`/`WeakMap`/`WeakSet`/`Date`/`Record`, a member not
  readonly outside `Readonly`, a writable index signature, a name bound in the
  file to one of those.
- `import.meta` had no case: its words `import` and `meta` read as host globals,
  a machine read. Now the location (`url`, `dirname`, `filename`, CommonJS's
  `__dirname`/`__filename`) is not a read, the rest of `import.meta` is.
  deblob's own 20 path lines move from machine read to unknown (a call's
  result). Found on the way: those lines call `fileURLToPath` and `new URL`, the
  tech's, so the call shape will make them red when it lands, until built-in
  knowledge (Node's) declares both effect-free.
- Corpus: 24 `false red` → `false unknown`; 13 `false unknown` stacked above a
  `red` (four calls returning literals, nine type names naming mutable types);
  six `red` → `false unknown` alone, truth green — the five of the forms row and
  `FROZEN_CALL`, whose `red` pinned the reader's limit (a freeze of `{ a: 1 }`
  is readonly). Three new rows, stamped by rixo at review: a root `debugger`
  (unread, truth green); the census both ways (a member of no type
  `stubborn unknown`: `any` declares nothing); the module's location.
  `Readonly<Record<string>>` joins the does-not-compile row, broken in 3.
- Gates: suite green (830), coverage 100, self-check 83 (four new root constants
  of this step typed readonly rather than added to the count).

## Docs

- `runner/README.md`: `stubborn unknown`, `false unknown`, the stack, the
  lifecycle.
- `modules.spec.ts` header: a red is known or unknown, the stamp says which.
- `explain` content for `stable-root`: every way out per condition, omissions
  justified.
- `extraction/README.md` (the reader's own doc, read by whoever works on or
  around the reader): the three answers — readonly, mutable, unknown with its
  condition — and broken; what each condition means and which step lifts it.
- `check/README.md`: a violation is known or unknown; unknown fails like red;
  broken exits 2.
- Canon: nothing. It states what holds; the reader is a port there, and a port
  implemented short of the canon is the implementation's concern (rixo
  2026-09-24). "A named type the reader cannot resolve proves nothing" stays
  true as written.

## To review

Ruled 2026-09-24 (rixo): the table (above); truth green = `false unknown` alone
— a red is a claim and needs a reason, green is only the absence of one;
`stubborn unknown` for a limit we keep; broken for what deblob cannot read; no
clause for a read of mutable module state; the split documented in the checker's
docs, not in canon.

Open: nothing.
