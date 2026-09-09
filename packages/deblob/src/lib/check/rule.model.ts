/**
 * Rule identity. A rule is its slug — the one token every surface speaks: the
 * violation line, the footer, `explain`, the docs anchor, the cards. There is
 * no number. `RULE_IDS` is the one ordered list and `RuleId` its union, so a
 * detector citing a rule that does not exist is a compile error.
 *
 * Naming a rule (ruled at the rule-names chapter, 2026-09-08): two or three
 * kebab words; names the constraint, not the layer word alone; `no-` only where
 * the prohibition is the whole rule (cycles); siblings share a stem so they
 * sort and read together (`service-assembly-only` / `adapter-assembly-only`);
 * names what the rule governs, never the escape hatch it grants
 * (`runtime-import`, not `type-only-exempt` — a slug is read on a violation
 * line, where the exemption is precisely what did not apply); never a check
 * name (`layers`, `dag`, …) — `explain` resolves check names first in the same
 * topic space, and `cli.model.spec.ts` fails on the overlap. A rule born later
 * is slugged in its own spec before its detector cites it, and enters this list
 * at its family's position. A slug is public API — renaming one is a breaking
 * change.
 *
 * Order = architecture.md § Summary's display order, family by family; the sort
 * key wherever output orders rules.
 */
export const RULE_IDS = [
  // layer rules
  "inward-deps",
  "layer-in-path",
  "chain-purity",
  "service-purity",
  "blob-quarantine",
  // composition rules
  "service-assembly-only",
  "adapter-assembly-only",
  "runtime-import",
  "public-unit",
  "ports-types-only",
  "unified-port",
  // packaging rules
  "private-sealed",
  "no-service-cycle",
  "no-runtime-cycle",
  // testing rules
  "test-through-contract",
  "test-setup-assembly",
  // module discipline
  "stateless-modules",
] as const

export type RuleId = (typeof RULE_IDS)[number]

export const isRuleId = (value: string): value is RuleId =>
  (RULE_IDS as readonly string[]).includes(value)

/** Position in `RULE_IDS` — the sort key for rule-ordered output. */
export const ruleOrder = (id: RuleId): number => RULE_IDS.indexOf(id)
