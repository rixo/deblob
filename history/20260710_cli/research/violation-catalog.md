# Violation catalog — every shape v0 catches, illustrated

Research material (README-driven), third of the set
([help-screens](./help-screens.md),
[usage-walkthrough](./usage-walkthrough.md)): one entry per violation type,
grouped by check, each with the intended output line. Triple duty: message
wording drafts (the teaching channel, so wording is part of the design), the
behavior section seed for each detector step SPEC, and the test-fixture shopping
list. Wording unratified until a step SPEC absorbs it; rule numbers =
architecture.md § Summary.

Sample lines shown bare (no service grouping) — grouping is ruled separately
(service → file; `blob` and `cross-service` buckets). Paths use the stock
`ts-suffixes-factories` flavor (`ports/renderer.ts`, suffix naming); other
flavors (`renderer.port.ts`, directory-based) classify through the Flavor port —
violation semantics identical, only the paths differ.

## check dag

**Service cycle (rule 13).** Any file of A imports any file of B and vice versa
— layers involved are irrelevant, model→model counts.

```
dag  src/orders ⇄ src/billing
     orders → billing (src/orders/checkout.service.ts → billing/ports/payment.ts)
     billing → orders (src/billing/refund.service.ts → orders/model/order.ts)
     services must form a DAG (rule 13); see the sharing progression
```

**Service cycle, N-node (rule 13).** Longer loops reported as one violation with
the full path — three 2-node reports for A→B→C→A would misdirect the fix.

```
dag  src/orders → src/billing → src/customers → src/orders
     (one carrying edge quoted per hop)
     services must form a DAG (rule 13)
```

**Module runtime cycle (rule 14).** File-level, any files — including blob (the
day-one brownfield finding). Type-only cycles exempt (not an ESM hazard).

```
dag  src/lib/utils/fetchers.ts ⇄ src/lib/api/client.ts
     runtime module cycle (rule 14) — works in dev, silently fails minified
```

## check layers

The dependency matrix by suffix, runtime imports only (rule 8 exemption on by
default). One violation type per forbidden matrix cell, plus classification.

**Model imports impure (rules 1, 4).** Model reaching for IO, platform, or a lib
classified concrete.

```
layers  src/invoice/model/totals.ts
        imports node:fs — model must stay pure (rules 1, 4)
```

**Model/ports import outward (rule 1).** Any import of service, adapters, or
assembly from the two innermost layers.

```
layers  src/invoice/ports/renderer.ts
        imports ../pdf-render.service.ts — ports may only import model and
        ports (rule 1)
```

**Service imports concrete (rule 4).** The canonical violation: `node:fs`, HTTP
client, DB driver in a `.service.ts` chain.

```
layers  src/invoice/pdf-render.service.ts
        imports node:fs — service layer cannot depend on concrete (rule 4)
```

**Service imports an adapter (rule 1 / matrix).** Bypasses the port.

```
layers  src/invoice/pdf-render.service.ts
        imports ./fs-store.adapter.ts — service cannot import adapters;
        depend on the port (rule 1)
```

**Runtime import of a `.service.ts` outside assembly (rule 6).** Fires on any
importer — another service, an adapter, blob. `import type` is legal (rule 8).

```
layers  src/billing/invoice-client.service.ts
        imports ../invoice/pdf-render.service.ts — .service.ts is
        assembly-only; import type is fine (rules 6, 8)
```

**Runtime import of an `.adapter.ts` outside assembly (rule 7).** Same shape,
adapters. Also covers adapter→adapter (absorb into one, or go through ports).
`import type` is legal (rule 8), same as the service seal.

```
layers  src/invoice/fs-store.adapter.ts
        imports ../billing/stripe.adapter.ts — .adapter.ts is assembly-only;
        import type is fine (rules 7, 8)
```

**Non-assembly imports blob (rule 5).** The layered world reaching into
unextracted code — the label's guarantee would be false. Type-only imports
included (ruled at [06_rule8-scope](../06_rule8-scope/SPEC.md)): blob has no
contract shape, so rule 8's exemption never reaches this cell.

```
layers  src/invoice/pdf-render.service.ts
        imports src/lib/helpers.ts — only assembly may import blob; extract
        what the service needs (rule 5)
```

**Concrete classification, unknown lib (rule 4, config).** Not a violation of an
import cell but of classification: a lib neither built-in-classified nor in
`pureLibs` reached from model/service. Message must point at the escape hatch.

```
layers  src/invoice/model/schedule.ts
        imports luxon — unclassified third-party in a pure layer; declare it
        in pureLibs if it qualifies (rule 4)
```

### How "concrete" is decided (design note, 2026-07-17)

The CLI never guesses purity — it applies a declared classification, per import
specifier, three sources in order:

1. **Shipped baseline** — Node builtins are enumerable: concrete by default; the
   stock flavor may carry a small curated pure set (`node:path`,
   `node:querystring` — string-only, deterministic). Finite and auditable =
   baseline, not heuristic.
2. **Config** — `pureLibs`: third-party purity is a judgment call, so it lives
   in `deblob.config.ts` — reviewable, versioned, repo-ratified judgment,
   mechanically applied. (The GOAL's line holds: "is this lib pure" stays
   judgment; the CLI only enforces the declaration.)
3. **Default polarity for the unlisted — ruled default-concrete (2026-07-17,
   rixo, safe by default)**: unknown lib in a pure layer fires the unclassified
   violation above; the violation is the surfacing mechanism.

Ruled out: package-inspection heuristics (dep scans, `browser` field) — the "no
shaky heuristics inside the tool" decision. Assisted classification, if ever, is
the CLI↔agent hop: CLI surfaces the unclassified list, agent proposes, human
ratifies into config.

Honest limit: a `pureLibs` declaration is trusted, not verified — the CLI does
not audit the lib's own imports for IO. A wrong declaration silently weakens
rule 4 for that lib; the guarantee is only as good as the config review.

## check private

**Foreign `private/` import (rule 12).** Any file outside service S importing
`S/private/…` — including S's own nested child services, including type-only?
(open: rule 12 says "nothing outside", rule 8 exempts composition rules only —
type-only foreign private import is plausibly still a violation; settle at spec
time.)

```
private  src/billing/stripe.adapter.ts
         imports src/invoice/private/totals.ts — private/ is sealed outside
         its service (rule 12)
```

## check barrels

**Barrel file in a service (rule 2).** An `index.ts` re-exporting layered files
— the layer disappears from the importer's path.

```
barrels  src/invoice/index.ts
         re-exports ./pdf-render.service.ts — no index.ts indirection; the
         layer must be visible in the import path (rule 2)
```

**Directory import (rule 2).** Importing `../invoice` (resolving to an index)
instead of the layered file.

```
barrels  src/billing/refund.service.ts
         imports ../invoice (resolves to index.ts) — import the layered file
         directly (rule 2)
```

## check ports

**Runtime export in a port file (rule 10).** Constants, functions, enums,
classes in `ports/` — sign of an unextracted adapter.

```
ports  src/invoice/ports/renderer.ts
       exports const DEFAULT_DPI — ports are types only; runtime belongs in
       an adapter or model (rule 10)
```

## Explicit non-violations (the fixtures that must stay green)

The catalog's other half — shapes that look wrong to naive tooling and must
never fire; each is a deliberate design point:

- `import type` of a `.service.ts` / `.adapter.ts` anywhere (rule 8, default
  flavor) — including the inline `{ mk, type Thing }` mixed form's type
  specifiers.
- Blob importing blob, model, or ports — blob is legal, only rules 6, 7, 12, 14
  bind it as an importer.
- `.adapter.ts` / `.service.ts` importing their own service's `private/` (rule
  9).
- Adapter importing concrete (`node:fs`, drivers) — that's its job.
- Model importing a `pureLibs`-classified third-party (rule 4 carve-out).
- Model of service A importing model of service B (matrix is layers, not
  packaging) — provided no service cycle results.
- Type-only module cycles (rule 14 scope).
- Assembly importing anything (bottom row of the matrix).

## Open (for detector step SPECs)

- Rule-5 findings: report under `layers` (shown here — it's a matrix-shaped
  fact) or a dedicated name so the blob vocabulary surfaces in the check name
  too?
- Rule 12 × type-only: does the private/ seal bind `import type` (rule 8 exempts
  composition rules only — lean yes, it binds)?
- Rule-13 cycles double-reporting rule 14 (a service cycle is usually also a
  file cycle): suppress the module-level echo when the service-level finding
  covers the same edges?
- N-node cycle reporting: full path as one violation (shown) — confirm, and cap
  path length in output?
- Rule 3 (chain purity): fully derived from the above or worth its own violation
  type at the first impure link? (coverage table says "maybe" for v0.)
- **Arch touch — rules 6/7 enumeration omits blob** (2026-07-17, rixo probing):
  "only imported by assembly" covers blob, but the "not by …" enumeration
  doesn't list it — a strict list-reading would let unsuffixed files bypass the
  composition seals, gutting them (any file could dodge every seal by staying
  unlabeled). Ruling here: blob binds — outlaw about itself, not above others'
  seals (6, 7, 12, 14 all bind blob as importer); the enumeration gets blob
  added, touch rides with the layers detector step alongside the rule-4 prose
  clarification.
