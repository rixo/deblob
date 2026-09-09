# Chapter SPEC — rule names beside rule numbers

Opened 2026-09-08 from the CLI chapter's board (idea captured the same day,
rixo): numbers are chapter and verse — nobody remembers rule 4, everybody
remembers `no-unused-vars`. Every rule gets a kebab slug; the slug becomes the
token every surface speaks — violation lines, footer, help screens, explain,
docs, cards. Level 1: one SPEC, the change lands with it.

Ruled at open (2026-09-08, rixo, grilled at the seam): the slug is the rule's
**identity**, and the only one. One source of truth: an ordered list of rules
keyed by slug, in the package. Numbers go — no frozen table, no `#rule-N`
anchors, no `explain 4`. A 0.0.2–0.0.4 log pasted next year meets an unknown
topic whose message says rules are named now; the URLs those binaries printed
(`blob/main/…#rule-N`) land at the page top from here on. Archaeology is the
answer for old output, not a compat layer carried forever.

Why not keep numbers derived from the list: architecture.md § Summary is four
markdown ordered lists, one per family, and the renderer assigns visible numbers
by position after each list's first item (CommonMark: subsequent item numbers
are disregarded). A composition rule born tomorrow lands between 11 and 12,
renders as 12, and shifts every rule after it. Append-only numbering would keep
the anchors honest and the summary wrong, or the summary honest and a family
scattered. Once numbers cannot be shown, there is nothing left for them to do.

Folded in: **version-pinned rule URLs**, the CLI chapter's last ruled item — the
URL builder is rewritten here anyway (`#<slug>`), and a URL pinned to `main`
lies the day a slug or a paragraph moves.

## Goal

- One token per rule, everywhere: a human reading a CI log, an agent pasting the
  footer, a card, the summary, and a URL all say `service-purity`.
- The slug is the identity in code: a closed union type, so a detector citing a
  rule that does not exist is a compile error, not a runtime miss.
- Every rule cited by a shipped surface resolves from every other: violation
  line → `explain <slug>` → card → `architecture.md#<slug>` → summary entry.
- Shipped URLs survive releases: pinned to the binary's own tag, so
  `deblob 0.0.5` cites `blob/v0.0.5/…` for as long as that tag exists.
- An old number is refused loudly, never resolved wrongly: `explain 4` says
  rules are named and how to see the names, and stops.

Out of scope by choice: a rename mechanism (slug aliases). A slug is public API
from this chapter on; renaming one is a breaking change under the 0.x stance and
gets its own ruling if it ever happens. No nanny table for a case that has not
occurred.

## API

### The rules, named

Grammar (ruled at open): two or three kebab words; names the constraint, not the
layer word alone; `no-` only where the prohibition is the whole rule (cycles).
Sibling rules share a stem so they sort and read together.

| Was | Slug                    | Title (unchanged)                                 |
| --- | ----------------------- | ------------------------------------------------- |
| 1   | `inward-deps`           | Dependencies point inward                         |
| 2   | `layer-in-path`         | Layer is visible in the import path               |
| 3   | `chain-purity`          | Layer purity is a chain property                  |
| 4   | `service-purity`        | Service cannot depend on concrete implementations |
| 5   | `blob-quarantine`       | Only assembly may import from blob                |
| 6   | `service-assembly-only` | `.service.ts` can only be imported by assembly    |
| 7   | `adapter-assembly-only` | `.adapter.ts` can only be imported by assembly    |
| 8   | `runtime-import`        | Composition rules govern runtime imports          |
| 9   | `public-unit`           | Composition rules apply to public units only      |
| 10  | `ports-types-only`      | Ports are types only                              |
| 11  | `unified-port`          | One port, one interface                           |
| 12  | `private-sealed`        | `private/` is the only visibility boundary        |
| 13  | `no-service-cycle`      | No circular dependencies between services         |
| 14  | `no-runtime-cycle`      | No circular runtime dependencies between modules  |
| 15  | `test-through-contract` | Tests go through the contract                     |
| 16  | `test-setup-assembly`   | Test setup is assembly                            |
| 17  | `stateless-modules`     | Modules are stateless                             |

Amended 2026-09-10, before the first publish (the canary's read of the 0.0.5
tarball): rows 8 and 9 were `type-only-exempt` and `private-exempt`. Both named
the escape hatch, and a slug is read on a violation line, where the exemption is
precisely what did not apply — `(service-assembly-only, type-only-exempt)`
asserted the inverse of what fired. Renamed to what each rule governs; the
grammar gains the clause "never the escape hatch". The config key
`typeOnlyExempt` keeps its name: the knob names its stance, the slug names the
rule. `private-sealed` is what check-help already said in prose. Rules born
later are slugged at birth in their own spec (first customer:
`adapter-implements-port`, on the board).

### The model — one list, one type

Identity lives with its producer: a new `check/rule.model.ts` — the detectors
cite rules, explain consumes citations, and today's arrow (`cli` and `check`
importing `RULE_COUNT` from `explain`) points the wrong way. Explain keeps what
is editorial to explaining (cards, URL).

`check/rule.model.ts`:

- `RULE_IDS`: an ordered readonly tuple of slugs, order = the summary's display
  order (family by family, as today). `RuleId` = the union of its members
  (`as const`), so the union and the list cannot drift.
- `ruleOrder(id)`: position in `RULE_IDS`, the sort key wherever output orders
  rules (violation blocks, explain entries). Replaces sorting by number.
- `RULE_COUNT` goes; consumers iterate `RULE_IDS`.

`explain/rule-content.model.ts`:

- `RULE_CARDS: Readonly<Record<RuleId, readonly string[]>>` — the editorial
  mapping as today, re-keyed; totality now enforced by the type.
- `canonicalRuleUrl(id, version)`:
  `https://github.com/rixo/deblob/blob/v<version>/docs/architecture.md#<id>`.
  The version is the binary's own (`package.json`, already read by the bin for
  `--version`) and injected into the content adapter — no model file reads the
  filesystem. A dev build cites a tag that does not exist yet; the release flow
  tags before it publishes, so every published binary's URLs resolve.

### Citations in code

`Violation.rules` (every variant in `violation.model.ts`) becomes
`readonly RuleId[]`; every detector literal follows (`rules: [13]` →
`rules: ["no-service-cycle"]`), and the layers matrix's per-cell rule lists with
them. `CHECK_RULES` in `cli.model.ts` maps check names to slugs. Branching on a
rule inside render (`rules.includes(8)` for the type hint) branches on the slug.
A typo in any of these is now a type error.

### Output

- **Violation line**: `(service-purity)`; several:
  `(service-purity, runtime-import)`. The word `rule` leaves the parenthesis —
  the slug is self-describing. The wrap-merge that kept `(rule 5)` unsplit keeps
  only the comma-list case: a slug is one token already; a list of slugs must
  not break between the comma and the next slug.
- **Footer**:
  `why: deblob explain service-purity runtime-import · or rerun with --explain`.
  Longer than `explain 4 8`; the observed reflex was an agent pasting it, and a
  slug in the footer teaches where a number did not.
- **Help screens** (`help`, `check --help`): every `(rule N)` becomes
  `(<slug>)`; the explain usage line's examples become slugs.
- **Explain**: topics are a slug or a check name. A bare number or `rule-N` is
  an unknown topic with its own teaching line: rules are named since this
  version, `deblob check` prints the names, `deblob explain layers` lists a
  check's. Entry heading
  `service-purity — service cannot depend on concrete implementations`. The
  `full text:` line prints the pinned URL.
- A slug never collides with a check name (`layers`, `dag`, …): the topic
  grammar resolves check names first and a test forbids the overlap.

### Docs

- **architecture.md § Summary**: the numbered lists become bullet lists keyed by
  slug — each entry `<a id="<slug>"></a>`<slug>` — **Title** — body`, the slug
  in code font, the title bold as today. The `rule-N` anchors leave. Family
  headers stay. Body prose that cites another rule by number
  (`rule 8's exemption`) cites the slug.
- The parser `ruleSummaryOf` locates an entry by its slug anchor, strips the
  anchor and the leading slug token, and reads the title from the first bold
  span as today; the shipped `rules-summary.md` excerpt is the same section,
  unchanged mechanism.
- **Knowledge INDEX**: the Rules column lists slugs instead of number ranges
  (`inward-deps … blob-quarantine` written out — five names is the widest row).
- **The sweep** — every citation of a specific rule by number outside `history/`
  becomes the slug in code font: skills cards and references, architecture.md
  body, implementation-guide.md, package README (prose and the sample output
  block). Provenance stamps that point at a summary family by range
  (`§ Summary (rules 6–11)`) point at the family by name
  (`§ Summary, composition rules`). Not swept: `history/` (frozen), and
  `docs/contributing/prompt-optimized-authoring.md`, whose "rule 1 / rule 2" are
  that document's own rules — the grep audit's one false positive, listed so the
  next sweep does not "fix" it.

### Breaking

Output format changes for anyone grepping `rule 4` in a CI log — the package's
typed surface (`defineConfig`, `DeblobConfig`, flavor types) is untouched. 0.0.x
stance: allowed; the mechanism commit's subject carries `!` and its API section
says what moved.

## Testing

- **The list**: 17 entries; ids unique; every id matches the grammar
  (`^[a-z]+(-[a-z]+){1,2}$`); no id is a known check name; every card exists in
  the repo (existing test, re-keyed).
- **Anchors**: for every rule, architecture.md § Summary carries `#<slug>`, and
  no `rule-N` anchor survives; the slug anchors appear in `RULE_IDS` order (the
  summary's display order and the model's sort key are the same list).
- **Parser**: `ruleSummaryOf` by slug — title/body split, wrap join, anchor and
  slug token stripped; every real rule parses out of the shipped excerpt
  (existing suite, re-keyed).
- **INDEX**: every rule's slug appears on its card's row (the range test,
  re-keyed).
- **Topics**: slug and check name resolve; a bare number, `rule-N`, and a
  slug-shaped unknown return null, and the number forms get the teaching line
  (main.spec pins it).
- **Render**: single and multi-slug citations; the wrap never splits a slug list
  at its comma; footer prints slugs; explain heading and pinned URL; block order
  follows `ruleOrder`. Goldens (`bare`, `check-help`, `check-violating`, `help`)
  regenerated and read line by line at review — a golden diff is the review
  artifact, not a rubber stamp.
- **URL**: `canonicalRuleUrl("service-purity", "0.0.5")` pins
  `blob/v0.0.5/…#service-purity`; the bin passes its real version (main.spec
  asserts the explain output cites the package's version).
- **Sweep**: not a test. The audit command and its residual list ride in the
  commit body:
  `grep -rnE '\brules? [0-9]' skills docs README.md packages/deblob/README.md`
  must return only the prompt-optimized-authoring lines after the sweep.
- Coverage bar unchanged: 100% through the public API, `deblob check` green on
  itself.

## Implementation

Order follows the dependency chain — the type first, so every later edit is
compiler-guided:

1. `check/rule.model.ts` born: `RULE_IDS`, `RuleId`, `ruleOrder`.
   `rule-content.model.ts`: cards re-keyed, `canonicalRuleUrl(id, version)`,
   parser by slug; `RULE_COUNT` removed.
2. `violation.model.ts` and the detectors (`dag`, `layers`, `barrels`,
   `private`, `ports`, `surface`): `RuleId` everywhere a number was.
3. `cli.model.ts`: `CHECK_RULES` re-keyed, `rulesForTopic` grammar.
4. `render.model.ts`: citation, wrap-merge, footer, help text, explain heading,
   sort by `ruleOrder`. `main.ts`: pass the version to the content adapter; sort
   fired rules by `ruleOrder`.
5. `content.adapter.ts`: keyed by slug, version in.
6. architecture.md § Summary rewritten as above; `build-content` unchanged.
7. Goldens regenerated; specs re-keyed.
8. The sweep (skills, docs, READMEs), one pass, audited by the grep.

Commits: one for the mechanism (this SPEC, model through goldens, the summary —
the parser needs the anchors, they cannot land apart), one for the prose sweep
and README. Whether the second folds into the first is decided at the seam;
never more than two.

## Docs

- architecture.md § Summary (form change) and body cites; implementation-guide
  cites; knowledge INDEX column; skills cards and references cites; package
  README (check list, explain paragraph, sample output block); help screens
  (shipped, golden-pinned).
- The `deblob-sdd` and `deblob` skills carry no rule-number convention to
  update; the rule-names policy (slug at birth, grammar) lives in this SPEC and
  in the model file's doc comment — the next rule's spec cites both.
- Outer board: the CLI item's "version-pinned rule URLs" line dissolves here;
  this chapter's own card leaves the board at its closing commit.

## Grilled at the seam (2026-09-08)

Six questions, operator answering blind to the text; the draft's own guesses
flushed out: the summary keeps no visible number (prototyped, form ruled), and
no legacy compat at all — the draft carried a frozen number table for old
`explain 4` pastes and `#rule-N` anchors; ruled out (rixo: archaeology is the
answer for old output). Ratified from the draft: identity as one tuple in the
check domain, compile-time citation errors; footer stays the pasteable command
only; prose cites in cards swept to slugs.

## Open

- None on the mechanism. The slug table itself rode rixo's review at open; edits
  to a name are a one-line change until the chapter's first publish, and a
  breaking change after.
