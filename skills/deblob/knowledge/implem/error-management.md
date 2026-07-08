---
source: docs/implementation-guide.md §7
---

# Error management — classical discipline, spelled out

Nothing exotic — spelled out because it is _not_ the instinct of the average JS
codebase:

- **Exceptions are the mechanism.** They break loudly by default when forgotten
  — that's the feature. No error-value plumbing as the default idiom.
- **Discriminate with `err.code`** — JS reality: `instanceof` breaks across
  package boundaries and realms; a `code` field + a duck-typed guard
  (`isIconsError(err)`) travels.
- **Error classes and guards live in the model.** `IconsError` + `isIconsError`
  belong in `icons.model.ts` — failure modes are domain vocabulary, and every
  layer (service, adapters, drivers) needs to reference them.
- **Catch only what you know how to handle** — in practice, orchestrator/driver
  code almost exclusively. A local `catch` is legitimate for exactly two things:
  a genuine, known recovery at that site, or **enrichment** — wrap with context
  and rethrow (`throw new Error("loading icon manifest", { cause: err })`).
- **Catch what you expect, rethrow the rest.** A `catch` block starts by
  checking the discriminant; unexpected errors propagate.
- **Absolutely no defensive catch.** No catch-just-in-case, no
  catch-log-continue, no `catch {}`. Swallowing a real failure is the worst
  outcome available (the silent-failure defect class).
- **Never lose the stack.** Wrap-and-rethrow uses `new Error(msg, { cause })`;
  the original error rides along.
- **Report at the edge.** The driver decides presentation: expected,
  user-actionable errors become a clean message (and exit code / HTTP status);
  unexpected errors are logged with full stack and fail loudly.
- **Degraded results are a domain decision, not an error-handling default.**
  Returning `[]`/`null` because extraction failed is lying to the caller. If a
  domain genuinely has partial-success semantics, model them explicitly (a
  discriminated result type naming _how_ it degraded and what recovery applies)
  — an exceptional, deliberate design, not a habit.
