# Step 14 — `pure`: the rule-4 allowlist key loses its suffix

Ratified 2026-09-09 (rixo), ships in 0.0.5. The config key `pureLibs` is renamed
`pure`. Nothing else about it changes: same values (package names, builtin
specifiers, declared `external` patterns), same default-concrete polarity, same
trust stance (declared, not verified).

## Goal

The name was never chosen. It appeared in the README-driven design fiction
(`research/usage-walkthrough.md`, `research/config-options.md`) and was ratified
in 08 along with its polarity — the recorded debate is entirely about polarity;
no alternative name was ever weighed. Two reasons to fix it now:

- **Neighbours don't wear the ceremony.** `external`, `assembly`, `include`,
  `exclude`, `alias` are bare words taking a list; `pure` beside `external` is
  the same grammar — an adjective over specifier patterns. The two compound
  keys, `typeOnlyExempt` and `externalLayers`, each earn the second word;
  `pureLibs` did not.
- **"Libs" is wrong on its own terms.** The key already accepts builtin
  specifiers and `external` patterns, and the banked granular form
  (`{ import, from }` entries, config-options research) blesses bindings, not
  libraries. `pure` survives that widening; `pureLibs` would not.

Cost of waiting: one consumer config uses the key today, and the package is
0.0.x with breaking cuts free. Every later release adds a compat shim this cut
does not need.

## API

- `DeblobConfig.pure?: readonly string[]` replaces `pureLibs`; `ResolvedConfig`
  and `CheckLayersOptions` carry the same rename — one word across the surface.
- **Renamed, never aliased.** A config carrying `pureLibs` fails loud with a
  hint that names the new key
  (`config key "pureLibs" was renamed "pure" in 0.0.5 — same values, new name`).
  It does not fall through to the generic unknown-key error (which would list
  valid keys and leave the reader to guess the mapping), and it is not silently
  accepted: a stale config must stop, not keep working under a name the docs no
  longer mention.
- The unclassified-lib violation line names the key the way config-error
  remedies do: `list it under config key "pure" if it qualifies`.
- The granular form, when it comes, widens `pure` to
  `readonly (string | { import, from })[]` — the name is chosen once.

## Testing

- Config resolution: `pure` passes through; the empty default holds; the
  unknown-key regex lists `pure` in position; a `pureLibs` entry throws the
  rename hint, matched on the message.
- Renderer: the unclassified-lib message contains `config key "pure"` verbatim.
- Every existing `pureLibs` test (layers detector, loader fixtures in four
  config dialects, external-repo and aware-sibling drivers) runs unchanged under
  the new key — the rename touches names only, behavior is pinned by the same
  assertions.

## Implementation

A mechanical sweep over `packages/deblob/src`, the dogfood config, the package
README and the setup skill card, then three hand edits: the rename guard in
`config.service.ts` ahead of the unknown-key loop, the violation message, and
the tests pinning both. Frozen chapters and research notes keep `pureLibs` —
history says what was true when written; the step-08 spec is the record of the
old name, this step the record of the change.

## Docs

- Package README: config table row, the authoring example, the `external` and
  cross-package paragraphs.
- `skills/deblob/references/setup.md`: the config example and every mention.
- `src/lib/check/README.md`, `src/lib/config/README.md`: key lists.
- Consumer note, for the release: upgrading to 0.0.5 with `pureLibs` in the
  config exits 2 with the rename hint — a one-word edit.
