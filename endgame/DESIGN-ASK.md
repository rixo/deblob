# Endgame — what the map is handed now, for the design side

To relay into their `data/FROM-DEBLOB.md` when the next pull happens; nothing of
theirs was edited (drop-in stays whole).

## New in the snapshot: `verdicts`

`Snapshot.verdicts: readonly Verdict[]`, beside `modules` and `edges`:

```ts
type Verdict = {
  file: string // root-relative, as a module's path
  line: number | null // null: about the file itself
  rules: readonly string[] // rule slugs, e.g. ["hook-one-call"]
  unknown: boolean // the reader could not tell: may be red
  message: string // one line, as `deblob check` prints it
}
```

Report order; a file can have many. Cycles (`no-service-cycle`,
`no-runtime-cycle`) are not listed yet — they belong to no one file.

## What would help, in their words to choose

- A file's state on the map: clean, red, unknown — count or badge.
- Its verdicts listed where the file's detail shows (the Behavior Panel's place,
  or its own).
- A filter: only red, only unknown, by rule.
- Services rolled up: how red a service's box is.

Our `#debug` outline lists them under each file today, so the data can be seen
before their pages do.
