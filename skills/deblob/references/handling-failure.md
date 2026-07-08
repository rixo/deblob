---
source: docs/implementation-guide.md §7
---

# Handling failure

- **Throw.** Exceptions break loudly when forgotten — that's the feature, not a
  risk to defend against.
- **Error classes and guards live in the model** (`IconsError` + `isIconsError`
  in `icons.model.ts`): failure modes are domain vocabulary every layer
  references.
- **Discriminate by `err.code`** + duck-typed guard — `instanceof` breaks across
  package boundaries and realms; a `code` field travels.
- **Catch for exactly two reasons**: (a) a known recovery at this site, or (b)
  enrichment — `throw new Error("loading icon manifest", { cause: err })`.
- **Catch what you expect.** The `catch` block checks the discriminant first;
  everything unexpected propagates.
- **No defensive catch. Ever.** No catch-just-in-case, no catch-log-continue, no
  `catch {}`. A swallowed failure ships corrupt output with no trace — worse
  than any crash.
- **Never lose the stack** — wrap-and-rethrow always carries `{ cause }`.
- **Report at the edge.** The driver decides presentation: expected,
  user-actionable errors become a clean message and exit code; unexpected errors
  log the full stack and fail loudly.
- **Degraded results are a domain decision, not an error default.** Returning
  `[]`/`null` because something failed is lying to the caller. If the domain
  truly has partial-success semantics, model them explicitly as a discriminated
  result naming how it degraded — deliberate design, not habit.

## When judgment is needed

- "Recovery" means the program genuinely continues _correctly_ — a retry, a
  fallback source honoring the same contract. "Keep going past the problem" is
  not recovery; it's deferral with interest.
- Expected-and-actionable vs bug: an error the user can fix (bad input, missing
  config) earns a message. Everything else is a bug — crashing loudly is the
  fastest path to the fix.

## Deeper

Per judgment — not required for implementation.

- [error-management](../knowledge/implem/error-management.md) — the full
  discipline
- `docs/self-review-checklist.md` — the silent-failure defect class
