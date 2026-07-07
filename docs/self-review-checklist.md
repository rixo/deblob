# Self-review checklist (working material)

> Scratch notes, not polished methodology — to sort out later. Observed pattern:
> the model reliably honors the **explicit** architecture rules (the hard
> negative rules in the service-arch doc) but reliably misses **judgment**
> defects (stale comments, broken promises, silent failures) unless a concrete
> checklist forces the pass. Ambient "think harder" doesn't work; an enumerated
> list does. So: enumerate it.

## When

Run before each "pause for review" — i.e. before handing a checkpoint back. Not
after the user asks; that's them doing the QA the pass is meant to replace.

## The checklist

Each item = a concrete question to run against the diff, plus the tool that
actually catches it (the tool matters — see "what catches what" below).

1. **Stale comments / docs** — every comment, JSDoc, error message, spec
   illustration I touched (or that describes something I changed): still true?
   _Caught by: manual grep + read. No compiler sees these._
   - sweep prose for old shapes/names/URLs (e.g. a renamed type still named in a
     comment, a URL pattern that gained a segment).

2. **Broken promises** — does any API accept more than the code handles?
   _The array-accepted-but-only-last-honored class._ If a type says "many",
   prove many works (or reject the extras loudly). _Caught by: thinking about
   the type's full domain; sometimes tsc if the shape is strict enough._

3. **Silent failure** — any `?? null`, `?.`, skip, or `catch` that swallows a
   real problem instead of surfacing it? Distinguish "capability absent"
   (legitimate) from "declared-but-broken" (must be fatal/named). _Caught by:
   reading every nullish/optional/catch on the changed path._

4. **Consistency** — same concept handled the same way across sites? (null-vs-
   throw semantics, naming, error-message shape). One resolver helper, not two
   that can drift. _Caught by: grep the concept across the diff._

5. **Dead / changed refs** — anything referencing a name/shape/file I
   renamed or removed? _Caught by: tsc for structural (imports, renames, types);
   grep for string-level (comments, messages, spec); **before removing a field,
   grep its consumers** — don't trust "looks unused"._

6. **tsc clean** — `--noEmit` on the package; and the **downstream** build, not
   just the package's own units. A package can be green while a consumer breaks
   (removed a type a consumer's config used). Run the real consumer build.

7. **Coverage where it belongs** — 100% on touched **runtime** (service / model
   / pure helpers). Adapters: e2e-covered, not unit (don't mock what you don't
   own — GOOS). A new method with no test drops the number; a new spec file can
   mask it. Check the actual %.

8. **Specs / docs accuracy** — fix = **update the spec** in place; for **user
   docs**, fix = track in spec until the docs phase (post-implementation), don't
   write them inline.

## What catches what (don't conflate)

- **tsc** → structural: dead imports, renamed symbols, type mismatches. NOT
  string staleness, NOT dead-but-valid branches.
- **coverage** → dead/unreachable branches, untested new logic.
- **manual grep + read** → string staleness (comments, messages, docs), broken
  promises, silent-failure swallowing. The judgment class.
- **real consumer build** → integration breaks units hide (a package green in
  isolation, broken downstream).

## Honest limits (observed)

- The model does NOT spontaneously run this pass well without the explicit list.
  It pattern-matches "tests green → done" and stops. The list is the
  intervention.
- Items 1–3 (comments / promises / silent-failure) are where the value
  concentrates — exactly what tsc/coverage can't see. Items 5–6 mostly
  duplicate what the compiler already enforces (still worth the glance for the
  string-level slice).
- "Units green in the package" repeatedly lied about integrated state (a stale
  single-element array in a downstream consumer broke the integration build
  while every unit passed). Treat the real consumer build as part of "done", not
  a follow-up.

## Examples (invented, for calibration of the defect classes)

- silent drop on an unresolvable dependency → would produce broken output with
  no error → made fatal + named.
- a resolver dependency marked optional "for test convenience" → fragilized the
  nominal path → made required, the factory supplies the stub.
- stale port doc claiming null-on-missing after the contract changed to throw.
- an array input accepted but all-but-last entry silently dropped → process each
  entry + dup-guard.
- duplicate registration key when multiple entries collide → derive a unique key
  per entry.
- removed a config field; a fixture still set it (tsc caught) — should have
  grepped consumers first (item 5).
- a stale single-element array in a downstream consumer broke the real build
  while units stayed green (item 6).
