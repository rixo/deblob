# Type names — the reader follows a type name to what it names

Opened 2026-09-23, inside step 04, after `stable-root`'s bindings shape landed.
Ruled 2026-09-22 (rixo): type-name following is split — this step follows names
through the project's own files; types that come from `node_modules` are the
next step, their own; the dogfood sweep of deblob's own code comes after both.

**Drafted 2026-09-23**, amended the same day from the viewer session's notes
(the table named for what it holds, the expansion kept apart from the readonly
verdict, a lookup that names its declaration — § API). Nothing below is built
until "build".

## Goal

After this step, a root binding annotated with a type name is judged by what the
name stands for, not by the fact that it is a name:

```ts
type Table = Readonly<{ a: number }>
export const TABLE: Table = { a: 1 } // green — Table is readonly
export const WRAPPED: Readonly<Table> = { a: 1 } // green
export const INLINE: Readonly<{ a: number }> = { a: 1 } // green, as today
```

Today the first two are red and the third green: the same type, written through
a name or not. The canon accepts that as a limit ("a named type the reader
cannot resolve proves nothing") and the corpus pins it as a verdict
(`modules.spec.ts`, the row "every form the syntax does not prove is red",
`TABLE`, `WRAPPED`, `MAP_OF_UNPROVEN`). This step removes the limit for every
name the project declares; the rows flip green and are re-stamped.

Why now: deblob's own code reports 83 `stable-root` violations, and a readonly
type behind a name is a likely share of them. The dogfood sweep would read false
reds until the reader follows names.

What it does not buy: a name the reader still cannot find — a package's type, a
global declared in a `.d.ts`, a name built by a conditional or mapped type —
proves nothing, as today. The canon sentence stays true; the set of names it
applies to shrinks.

Out of scope: types from `node_modules` (next step); inference — a binding with
no annotation is judged by its initializer, as today; any rule other than
`stable-root`'s readonly half; value exports in the table (§ API).

Not TypeScript's engine, in this step. Ruled 2026-09-23 (rixo): the engine is a
second source of type knowledge next to deblob's own reader, never a
replacement, and optional. It is used for a file whose nearest config is a
`tsconfig.json` or a `jsconfig.json` — how `tsc`, tsserver and typescript-eslint
find a file's project — with that config; a file with neither is read by deblob
alone, as today. When a file's config fails to load, deblob fails loudly and the
message names the way out, `noTsc: true` (default false; `tsc` by metonymy for
the engine, which deblob drives through its API, not the command). Why loud: the
worst outcome is a verdict nobody knows the source of, not an error on a setup
that asked for the engine and cannot give it.

The engine starts at the `node_modules` step, where reading `.d.ts` by hand is
weakest, and before it in the viewer, where it only feeds display (a call's
return type) and no verdict. Two questions stay open for when it does feed a
rule: canon's readonly half proves by what the syntax shows, the engine proves
by inference as well (`export const TABLE = makeTable()` is red here, green
through the engine) — a canon question; and TypeScript 7's API ships under
`typescript/unstable/*` as of 7.0.2.

Measured 2026-09-23, TypeScript 7.0.2 through its sync API, on deblob (87 files)
and on a 1,121-file project written for TypeScript 5: the project loads in 0.07s
and 0.15s; every root binding typed in one batched call, 0.13s and 0.78s end to
end; a full check of every file, 0.15s and 1.7s — against 0.84s for
`deblob check` on deblob. The TypeScript 5 project's `baseUrl` and
`moduleResolution: "node"` are reported as removed options and the program
builds anyway: 3 unresolved modules in 1,121 files, 11 of 4,208 root bindings
typed `any`. Not measured: one call per node instead of one batch (each is a
round trip to the engine's process), incremental updates, the engine's own
memory. The engine's binary is 27 MB installed, oxc's about 4 MB. `.svelte` and
`.vue` files are outside both until something extracts their scripts.

## API

Two questions, answered by two owners: what a name stands for (the expansion),
and whether that is readonly (the verdict). The expansion knows nothing of
readonly; the verdict never resolves a name itself.

**The expansion.** A type name is resolved where it is written, the way
TypeScript resolves it — the innermost scope first: a type parameter in scope,
then a declaration in the file, then an import, then the standard library. What
it stands for is the declaration it lands on, with the type arguments
substituted for the parameters, resolved in the file that wrote it. Every way
TypeScript binds a type name is one of these:

| What the name is bound to                       | What it stands for                                                                     |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| a type alias (`type T<P> = …`)                  | its body, arguments substituted; a missing argument takes the parameter's default      |
| an interface (`interface T { … }`)              | the members of every declaration of it (merged) and of every interface it extends      |
| an enum                                         | the enum — its values are primitives                                                   |
| a type parameter left unsubstituted             | nothing known                                                                          |
| an import from a project file, type-only or not | the target's export of that name, through re-exports (`export { T } from`, `export *`) |
| a standard wrapper (`Readonly`, `ReadonlyMap`…) | the standard wrapper — unless a declaration in scope shadows the name, which then wins |

Anything else stands for nothing known in this step: a class, a package's type,
a global, a qualified name (`NS.T`), `typeof x`, a mapped or conditional type.
That is the step's boundary. Each later lands as an expansion case — `typeof`
and indexed access (`Deps["loader"]`) are the viewer's next asks — without
touching the verdict. The expansion stops on a name it already has open, and
says so; it has no opinion on cycles beyond that.

**The verdict.** `isReadonlyType` asks the expansion and judges what comes back,
by the rules it has today: an alias's body is proven as written there, an
interface when every member it gathered is `readonly` and proven, an enum
always, nothing known never. The reader stays red on every entry on the boundary
in this step. That is the reader's limit, not the verdict: where the named type
is readonly the right verdict is green, and the rows say so and admit the miss.
No verdict that is right today turns wrong.

**A cycle proves itself.** A type that reaches itself again
(`type List = { readonly head: number; readonly next: List | null }`) is proven
when everything else along the cycle is: nothing on the way back can be mutable,
so the only path to a mutable member is off the cycle. The verdict's rule, not
the expansion's: a name already being proven counts as proven, and everything
else still decides — `type Link = { readonly next: Link | null; value: number }`
is red for `value`.

**Where the knowledge comes from.** The reader stays one file at a time and
synchronous. What it cannot see — another file's declarations — is handed to it,
the way `paramKinds` is today: `ReadInput` gains a lookup from an import
(specifier, imported name) to what it lands on. A lookup's answer names the
declaration — its file and its name — not only its syntax: a future consumer (a
call's target, an adapter's `implements`, the viewer's `module#Symbol` edges)
needs to say where a name lands, and naming it costs nothing now.

**Who builds the table.** A pure model unit, `extraction/declarations.model.ts`:
given each project file's program and where its imports landed, it collects what
each file declares and exports, re-exports followed, and answers the lookup. It
holds type declarations only in this step; entries are keyed by name and
namespace (TypeScript keeps types and values apart), so the first consumer of
value exports adds them without reshaping the table. The extraction service
gains a pass before reading: parse every file, record where its imports land,
build the table, then read. Today the service reads each file in the loop that
parses it; that loop splits in two. The service only orders the passes and hands
the table over; no type logic sits in it.

## Testing

**The gate is verdict cases** in `modules.spec.ts`, stamped while red, written
before the reader changes:

- **The re-stamp**: `TABLE`, `WRAPPED` and `MAP_OF_UNPROVEN` (renamed
  `MAP_OF_PROVEN`) leave the red row for a green row, their comments rewritten
  from "the reader cannot see through" to what the name stands for. rixo
  re-stamps.
- **One row per line of the expansion table**, red and green side by side —
  except the unsubstituted type parameter, which no root binding can reach: a
  root annotation substitutes every parameter or takes its default, or does not
  compile:
  - an alias green, and an alias over a mutable literal red
    (`type Loose = { a: number }`);
  - a generic alias with its argument substituted, green and red
    (`type Frozen<T> = Readonly<T>` over a proven and an unproven argument), and
    a parameter default used;
  - an interface green (all `readonly`), red (one member not), merged across two
    declarations with the second one mutable (red), extending a mutable
    interface (red);
  - an enum-typed binding green;
  - a type imported from another project file, green and red; through a
    re-export and through `export *`, green;
  - a local `type Readonly<T> = T` shadowing the standard wrapper: red;
  - the boundary: a class type, `typeof`, a qualified name, a mapped type, a
    package's type, each naming a readonly type, so green, the right verdict.
    These lines are known to fail in this step. Each one says so in a comment
    naming what it waits for, until the `!miss` marker replaces the comments. A
    reader limit is never written as `red`.
- **The cycle**: the recursive `List` above green, and `Link` red for its
  mutable `value`.
- **Tripwire for the open set**: a name reached through a binding form no row
  lists — an import renamed on the way (`import type { Table as Grid }`),
  re-exported under a third name. The operation passes it for free; a reader
  built as one branch per row above fails it.

**Units are scaffolding**: `declarations.model.ts` gets a spec only where a case
cannot reach a line; coverage stays at 100 from cases first.

**Gates**: typecheck, prettier from the root, coverage 100, the suite red only
on the 13 known reds (plus or minus this step's own red-first rows while they
are red), the self-check count recorded before and after in Landed — it should
fall, and every violation it no longer reports is one this step's rows explain.

## Implementation

To be written as it lands. Expected shape:

1. Red first: the rows above, stamped, run red.
2. The table: `declarations.model.ts` and its lookup, the service's pass split.
3. The verdict: `isReadonlyType` asks the expansion; the rows turn green.

## Docs

- `docs/architecture.md` § `stable-root`: the proof's list gains "a name the
  project declares is followed to what it names"; "a named type the reader
  cannot resolve proves nothing" stays, its example (`Readonly<Store>`) still
  true when `Store` is mutable.
- `graph.model.ts`, the `readonly` field's comment: "no alias resolution" goes.
- `reading.model.ts`, `isReadonlyType`'s comment: "A named type proves nothing —
  no alias resolution" becomes the operation.
- `extraction/README.md`: the new unit and the service's reading order.
