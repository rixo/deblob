# Atoms of canon: scoring 24 decompositions

Source: `/home/rixo/projects/deblob.longshot/docs/architecture.md`. I read all
1473 lines for this report, and line numbers refer to that file. I did all the
counts myself, run by run. Anything marked **(mine)** is my own addition and
does not come from the sample.

## How to read the counts

- A run supports a cluster when one of its atoms states that part, either alone
  or inside a larger atom. Where the question is whether a part should be split
  out, I also give the count of runs that made it **its own atom**.
- Support is written `k/24 (r·w·k)`: the counts for the rules-first, whys-first
  and kinds-first framings, 8 runs each.
- Thresholds: stable is 16 or more runs, contested is 8 to 15, idiosyncratic is
  7 or fewer.
- Many 24/24 clusters are canon's own slugs read back. Unanimity on those shows
  the model reads canon reliably. It does not show the cut is right. The real
  signal is in how the slugs get split, and in where runs agree or disagree
  about the split.

## Read this first

1. **There are 39 stable atom clusters.** 30 of them are unanimous.
2. **Three slugs are molecules, by unanimous decomposition:**
   - `hook-one-call` splits into at least 3 atoms in 24/24 runs (3 to 9).
   - `stable-root` splits into at least 3 in 24/24.
   - `assembly-builds-only` splits into 6 to 12 in 24/24.
3. **Four slugs have no atom of their own:**
   - `chain-purity`: 22/24 say it is derived (the per-edge atoms applied
     transitively); the other 2 qualify this.
   - `runtime-import` and `public-unit`: 24/24 call them scope parameters of the
     composition gate.
   - `driver-calls-services`: 16/24 call it the union of two other atoms.
   - Separately, `service-assembly-only` and `adapter-assembly-only` are one
     atom in 24/24.
4. **The shared parts that actually block** (a kind needs part of a bundle and
   canon has to write an exception):
   - the hook bundle applied to test bodies;
   - stable-root's ban on root calls, applied to boot and test;
   - the test's blanket "imports anything", set against importer lists that
     leave the test out;
   - the "adapters only when called by a test" clause on test factories;
   - the type-import scope, stated with opposite values in different places.

   Other overlaps only duplicate: ambient access versus root capture, the
   argument vocabulary, the unit gate stated in two slugs, and
   driver-calls-services.

5. **One shape sits under every blocking seed (mine, supported by 7 runs that
   already scope atoms by role).** Verb atoms are attached to _file kinds_, but
   the _roles_ they govern (build, link, register, start) occur in files of
   other kinds. When a role lands in a foreign kind, canon either writes an
   exception (test, boot, test factory) or writes nothing. The "nothing" case is
   a service or adapter factory composing its own private graph (159-167), which
   11 runs flag as unruled.
6. **The test kind.** 24/24 replace "assembly and driver in one" with a
   selection of atoms:
   - carried: reader-bound, not imported, stable root with registration allowed,
     and straight-line bodies (all 24 carry this; canon only implies it);
   - carried by most: the private/ seal and service cycles.
   - None of the 24 carries the hook count, the hook argument rule, the hook
     result rule or the concrete-import ban, and 21/24 drop the inward order
     (the other 3 keep it only trivially, with the test at the top rank).
7. **Helpers.** 24/24 say the straight-line rule must reach local helpers. This
   echoes the relayed user message, so it is not independent evidence. The runs
   split on scope:
   - every function the test file defines: 12;
   - functions reachable from a hook: 9;
   - a closed list of roles: 3.

   All 24 add the same way out: a helper that needs a loop leaves the file and
   becomes the kind it is, which extends 1017-1019 from shared code to local
   code.

8. **The contested band is almost entirely one question (mine): split by check,
   or split by why?** The authors have not fixed that criterion, and until they
   do, about eight splits cannot settle (see section 6).

---

## 1. Stable atoms (16 or more runs)

The order is by support, grouped by family within each support level.

### Imports and the graph

| #   | Atom                      | Statement                                                                                                                            | Why                                                                                                  | Support                         | Canon                                       |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------- |
| 1   | `inward-imports`          | A file imports only its own layer or an inner one: model < ports < service, adapter < assembly < driver < boot.                      | The inside is built, tested and reasoned about without the outside.                                  | 24 (8·8·8)                      | 107-114, 222-224, 864-873, 929-932          |
| 2   | `no-concrete-import`      | Model, ports, service, assembly and boot import no platform or I/O package; a third-party package counts as pure only when declared. | A concrete import bypasses the ports, so the file cannot run without the machine.                    | 24 (8·8·8)                      | 287-311, 491-495, 864-872, 884-887, 939-943 |
| 3   | `no-ambient-read`         | The file reads or calls no ambient global (env, clock, randomness, console, timers, globalThis), anywhere in the file.               | Code that reaches the machine cannot be tested without setting the machine up.                       | 24 (8·8·8)                      | 292-294, 341-344, 944-952                   |
| 4   | `blob-importers-only`     | Only assembly, test and blob files import blob, type edges included.                                                                 | Blob has no guarantees, so any other importer loses its own.                                         | 24 (8·8·8)                      | 268-272, 370-372, 487-490, 892-895, 953-961 |
| 5   | `unit-assembly-only`      | Only assembly runtime-imports a public `.service`/`.adapter` file; type-only edges and private/ files are outside the atom.          | The concrete graph is resolved in one place.                                                         | 24 (8·8·8)                      | 270-272, 374-381, 965-981                   |
| 6   | `private-sealed`          | Nothing outside a service imports from its private/ directory, type edges included.                                                  | Visibility is ownership.                                                                             | 24 (8·8·8)                      | 779-788, 803-815, 993-997                   |
| 7   | `no-service-cycle`        | Service packages form a DAG over every import kind.                                                                                  | A service in a cycle cannot be extracted, moved or reasoned about alone.                             | 24 (8·8·8)                      | 817-826, 898-912, 998-1001                  |
| 8   | `no-runtime-cycle`        | Runtime imports between modules form no cycle.                                                                                       | ESM cycles fail silently in production.                                                              | 24 (8·8·8)                      | 914-918, 1002-1004                          |
| 9   | `layer-in-path`           | An import path names the layer file itself; there is no barrel or index.                                                             | The layer must be visible where it is imported.                                                      | 24 (8·8·8)                      | 759-777, 933-934                            |
| 10  | `port-types-only`         | A port file holds types only.                                                                                                        | A port is a contract; runtime code in it is an unextracted adapter.                                  | 24 (8·8·8)                      | 136-137, 243-244, 982-984                   |
| 11  | `assembly-importers-only` | Only drivers and assemblies import an assembly, type edges included.                                                                 | An assembly has no contract to depend on.                                                            | 24 (8·8·8)                      | 482-486, 875-883, 1037-1039                 |
| 12  | `driver-importers-only`   | Only a boot or another driver imports a driver, type edges included.                                                                 | Only the start chain may reach a driver; otherwise hooks could chain.                                | 24 (8·8·8)                      | 540-543, 640-641, 1066-1068                 |
| 13  | `entry-not-imported`      | Nothing imports a boot or a test file, type edges included.                                                                          | The runtime or the test runner starts them; an importer would make an entry into a library.          | 24 (8·8·8)                      | 260-266, 710-714, 873, 1011-1023, 1072-1074 |
| 14  | `boot-imports-one`        | A boot imports exactly one driver and nothing else.                                                                                  | Starting is one arrow.                                                                               | 24 (8·8·8)                      | 260-262, 710-713, 872                       |
| 15  | `port-edges-typed`        | Every edge into or out of a port file is `import type`.                                                                              | A runtime edge on a type-only file is always a re-export, a side-effect import or a missing keyword. | 24 content; own atom 16 (6·3·7) | 984-987                                     |
| 16  | `driver-imports-closed`   | A driver runtime-imports only assemblies, drivers and tech a bound reader claims; never a model or a pure library.                   | Parsing and rendering are a service's use cases; a driver holding them is a model without a test.    | 17 (7·3·7)                      | 616-622, 871, 880-883                       |

Notes on the graph atoms:

- **#1, type-import scope.** 5 runs count type edges, 9 count runtime edges
  only, and 10 leave it open (see death seed DS6).
- **#2, declared purity.** 11 runs (4·4·3) make "purity is declared" its own
  atom. 4 of them (rules-8, whys-1, kinds-4, kinds-5) widen it into one
  mechanism that classifies a name or package as pure, concrete, container or
  claimed.
- **#3, reach of the ambient ban.** Canon states it for model and service only.
  21 runs extend it to assembly through "holds no tech" (254, 491); most also
  extend it to boot (712).
- **#5, scope slugs.** 24/24 treat `runtime-import` and `public-unit` as the
  scope parameters of this atom.
- **#13, grouping.** 13 runs make boot and test one atom, 3 make them two atoms,
  and 8 fold every outside importer gate into one family atom.
- **#16, framing.** The whys framing mostly drops this atom and folds the import
  ban into a callee ban.

### Module root

| #   | Atom                      | Statement                                                                                                                                               | Why                                                                       | Support                                                | Canon                              |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------- |
| 17  | `root-bindings-immutable` | Every root binding is provably immutable by syntax (primitive, `as const`, readonly, frozen literal), to its depth.                                     | A test that imports the module gets the same module every other test got. | 24 (8·8·8)                                             | 295-298, 341, 1078-1096, 1105-1110 |
| 18  | `root-no-capture`         | No root binding stores a value read from the tech, the clock or randomness; the module's own location (`import.meta.url`, `__dirname`) is exempt.       | A load-time snapshot cannot be varied without reloading the module.       | 24 (8·8·8)                                             | 1093-1106                          |
| 19  | `root-no-effect`          | No root call reaches tech, unclaimed code, a use case, or a local function of an effect-allowed file; no root assignment or delete; a throw is allowed. | Loading a module must not act.                                            | 24 content; call and statement as two atoms 11 (3·4·4) | 1109-1129                          |

### Assembly

| #   | Atom                    | Statement                                                                                                                                                                                                  | Why                                                                        | Support                                                                        | Canon                                                    |
| --- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------- |
| 20  | `build-calls-only`      | Every call in an assembly is a factory: a unit's, an assembly's, a blob file's, or a model factory (told apart by the flavor's name).                                                                      | Assembly decides nothing but which factory to call.                        | 24 (8·8·8)                                                                     | 428-461, 510-519, 1028-1036                              |
| 21  | `loads-declared`        | An assembly calls a use case only if the project declares it a load; the load's result is then a tech value.                                                                                               | Nothing in a call's shape tells a load from a use case run for its effect. | 24 content; own atom 17 (6·7·4)                                                | 466-476, 1033-1034                                       |
| 22  | `args-not-derived`      | Arguments in assembly, wiring and hook calls are literals, tech values or instances, never computed in place.                                                                                              | A derived argument is the outside doing the inside's job.                  | 24 (8·8·8)                                                                     | 440-447, 455-465, 589-591, 1028-1031, 1048-1050          |
| 23  | `result-untouched`      | A call's result in an assembly or a hook is never read, branched on, computed with or member-accessed. Assembly may pass it on; a hook only returns or drops it. A declared load's result is a tech value. | The outside never looks into what it built or fired.                       | 24 content; one atom with sinks scoped by kind 17 (4·6·7); two atoms 7 (4·2·1) | 448-449, 453-466, 510-519, 603-613, 1030-1034, 1053-1056 |
| 24  | `wiring-branch-only`    | A branch or loop in an assembly tests only a parameter or a loaded value, against a literal or for truthiness, and its arms are factory calls.                                                             | A condition on an instance is a decision the map cannot show.              | 24 (8·8·8)                                                                     | 473-481, 1034-1036                                       |
| 25  | `returns-services-only` | An assembly returns services and shared model instances; it returns adapters only when every caller is a test.                                                                                             | Drivers get contracts; only a test asserts on its fakes.                   | 24 (8·8·8)                                                                     | 459-466, 505-508, 1032-1035, 1214-1219                   |

On #25, most runs rewrite the test clause as a check on who imports the
assembly. See DS5.

### Definitions

| #   | Atom                 | Statement                                                                                                                                                                    | Why                                                                                          | Support                                                       | Canon                                                           |
| --- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------- |
| 26  | `closed-definitions` | A file defines at run time only what its kind names: an assembly its assembly functions, a driver its hooks and at most one wiring function, a boot nothing. Types are free. | A definition in a file with wide rights is where logic hides with no contract, port or test. | 24; one parameterized atom in 23 (rules-5 splits it in three) | 274-279, 443-447, 479-481, 623-628, 643-652, 710-714, 1061-1062 |

### Driver and boot

| #   | Atom                    | Statement                                                                                                                              | Why                                                                       | Support                         | Canon                                  |
| --- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------- | -------------------------------------- |
| 27  | `reader-bound`          | Every driver file and test file has a reader bound to its tech (a reader that counts it as blob counts).                               | No driver rule can be judged without the reading.                         | 24 (8·8·8)                      | 545-571, 584-588, 1044-1047            |
| 28  | `wiring-calls-closed`   | Outside its hooks, a driver calls only assembly factories, claimed tech setup and sub-driver wiring functions.                         | Wiring is done in one place; a hook does not wire.                        | 24 (8·8·8)                      | 589-594, 616-622, 1048-1050            |
| 29  | `hook-call-count`       | A hook makes exactly one use-case call; zero is red and two is red.                                                                    | Two calls hide a sequence nobody owns; zero is logic with no home.        | 24 (8·8·8)                      | 595-600, 1051-1057                     |
| 30  | `hook-unconditional`    | No branch, loop or try sits around or beside a hook's call.                                                                            | A decision in a hook is translation, which belongs to the facade service. | 24 content; own atom 19 (6·6·7) | 598-599, 606-609, 1051-1052            |
| 31  | `hook-args-verbatim`    | A hook hands the event and host values on whole; nothing is read off them and there is no default.                                     | Reading the event is translation.                                         | 24; own atom 23                 | 440-442, 599-606, 1051-1054            |
| 32  | `boot-calls-once`       | A boot's root is one call to its driver's wiring function, with no arguments.                                                          | Starting is the boot's one thing.                                         | 24 (8·8·8)                      | 260-262, 703-721, 1072-1074, 1126-1127 |
| 33  | `tech-claimed-only`     | A driver's tech is what its bound readers claim; an unclaimed import or name, or a pure library, is red.                               | What no reading claims cannot be told from logic.                         | 24 content; own atom 18 (6·5·7) | 80-91, 553-557, 616-622                |
| 34  | `driver-exports-wiring` | A driver exports its one wiring function and no hook.                                                                                  | An importer can then only let it attach its callbacks.                    | 23 (8·7·8)                      | 629-639                                |
| 35  | `sub-driver-call-only`  | A driver uses an imported driver only to call its wiring function, from its own wiring, never from a hook and never with hexagon data. | Otherwise one hook chains two calls through indirection.                  | 20 (7·6·7)                      | 629-639, 1063-1065                     |
| 36  | `root-wiring-nullary`   | A root driver's wiring function takes no parameter and the boot passes none; a sub-driver's takes tech and instances.                  | The boot touches no tech; the driver reads its own.                       | 17 (5·5·7)                      | 623-628, 710-712, 1072-1073            |

Notes on #29: 4 runs split the count into "at most one" and "at least one". 6
runs (3·1·2) make "the callee is a use case" its own atom.

### Composition units (prose only, no slug)

| #   | Atom                      | Statement                                                                      | Why                                                       | Support                | Canon                     |
| --- | ------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------- | ---------------------- | ------------------------- |
| 37  | `adapter-implements-port` | An adapter's factory returns what conforms to a port it type-imports.          | Adapters are replaceable only behind one port shape.      | 24; 20 mark it implied | 131-148, 250-252, 368-369 |
| 38  | `no-default-deps`         | A service or adapter factory gives its dependency parameters no default value. | A default is a static import and scatters assembly logic. | 23 (8·8·7)             | 374-381, 1221-1223        |

### Test

| #   | Atom                 | Statement                                                                   | Why                                                  | Support                              | Canon     |
| --- | -------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------ | --------- |
| 39  | `test-straight-line` | A test body has no branch or loop (for the helper question, see section 5). | The reviewer reads each test as given, when, expect. | 24; all 24 say canon only implies it | 1150-1161 |

---

## 2. Contested and idiosyncratic atoms

### Contested (8 to 15 runs)

| Cluster                                                                                    | Support                                                                                                        | What divides the runs                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `only-driver-listens`: a callback handed to claimed tech exists only in a driver or a test | 14 (3·7·4)                                                                                                     | It has no slug and the check is weak. Telling listening apart from an outbound call that takes a callback needs a reader on non-driver files, and assembly, boot and adapters have none. The whys framing keeps it for its strong why; the rules framing drops it because it has no slug. |
| Straight-line: one atom carried by hook and test, or two atoms                             | 14 one (5·5·4) / 10 two (3·3·4)                                                                                | It is the same check with two whys: translation belongs to the facade, versus reviewer legibility.                                                                                                                                                                                        |
| Test root registration                                                                     | own atom 11 (4·4·3) / reader declares it effect-free 9 (4·2·3) / kind exemption kept 3 (0·2·1) / not carried 1 | Discussed in DS2.                                                                                                                                                                                                                                                                         |
| Purity declaration as its own atom                                                         | 11 (4·4·3) / folded into the concrete ban 13                                                                   | Whether a config list counts as an atom or as a parameter.                                                                                                                                                                                                                                |
| Root call and root statement as two atoms                                                  | 11 (3·4·4) / one 13                                                                                            | Same why, two checks.                                                                                                                                                                                                                                                                     |
| Hook "nothing else in the body" as its own atom                                            | 10 (4·3·3)                                                                                                     | Whether "nothing else" is a check of its own or part of the count.                                                                                                                                                                                                                        |
| One importer-gate family atom (assembly, driver, boot, test)                               | 8 (1·5·2) / per-kind atoms 16                                                                                  | The whys framing merges them because they share a why: no contract, so not a dependency.                                                                                                                                                                                                  |
| `driver-calls-services` as an atom of its own                                              | 8 (1·5·2) / derived 16 (7·3·6)                                                                                 | It has its own why ("an adapter call is an effect no contract covers", 617-618) but no check of its own.                                                                                                                                                                                  |
| Assembly atoms applied to test setup or helper functions                                   | 8 (3·2·3)                                                                                                      | It runs into 1196 (setup happens inside the hook; see section 6).                                                                                                                                                                                                                         |
| Branches and loops in driver wiring left unruled (flagged as a hole)                       | 8 (2·3·3)                                                                                                      | Canon is silent. Assembly has a branch rule; wiring has none.                                                                                                                                                                                                                             |

### Idiosyncratic (7 or fewer)

| Cluster                                                       | Support   |
| ------------------------------------------------------------- | --------- |
| Callee-is-use-case as its own atom                            | 6 (3·1·2) |
| `binding-agrees-flavor` / `kind-by-name`                      | 5 (3·1·1) |
| `no-adapter-branch` (the mechanical shadow of `unified-port`) | 5 (2·3·0) |
| One generalized declaration atom                              | 4 (1·1·2) |
| One instance per test at describe scope                       | 4 (2·2·0) |
| Separate count of "at most one wiring function"               | 4 (2·0·2) |
| Hook count split into at-most and at-least                    | 4 (1·1·2) |
| `no-prod-config`                                              | 3 (0·1·2) |
| Wiring and hook region split as its own atom                  | 3 (1·0·2) |
| `exemption-states-reason`                                     | 2 (2·0·0) |
| `unit-exports-factory`                                        | 2 (0·1·1) |
| A blob imported only by tests is red                          | 2 (0·2·0) |
| `tech-only-in-driver` / `boot-no-tech`                        | 2 (0·0·2) |

Singletons:

- `chain-purity` as an atom (whys-2)
- `container-declared` (rules-2)
- `unit-has-assembler`, `test-assert-in-hook` (rules-8)
- `e2e-black-box` (whys-8)
- `local-helper-kinded` (whys-6)
- `root-imports-only` (whys-1)
- `tech-value-no-call` (kinds-5)

What divides them:

- the atom criterion (check versus why);
- whether config-level checks count as atoms;
- judgment calls with weak shadows (`no-adapter-branch`, `no-prod-config`,
  `unit-has-assembler`).

Idiosyncratic atoms worth a second look (mine):

- **`e2e-black-box`** resolves the e2e contradiction that 17 runs flag.
- **One instance per test at describe scope** catches a real gap: stable-root
  does not reach `let x; beforeEach(() => { x = create() })`.
- **"A blob imported only by tests is red"** closes the blob way out for
  helpers.

---

## 3. Rules as molecules

| Slug                                             | Consensus atoms                                                                                                                                                             | Where runs disagree                                                                                                                                                       | Agreed remainder (not structure)                                                                                                                                                              |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `inward-deps`                                    | inward-imports (24)                                                                                                                                                         | Type-edge scope (5 count type edges, 9 runtime only, 10 open). 13 call "lateral OK" a contradiction with the unit gate; the rest call it a permission the matrix narrows. | The matrix is derived ("their intersection", 861).                                                                                                                                            |
| `layer-in-path`                                  | layer-in-path (24)                                                                                                                                                          | —                                                                                                                                                                         | What counts as a barrel beyond `index` is unstated.                                                                                                                                           |
| `chain-purity`                                   | none of its own (22; whys-2 makes it a "scope" atom, rules-3 keeps the purity declaration under it)                                                                         | —                                                                                                                                                                         | Transitive purity of third-party code is taken on declaration and cannot be seen.                                                                                                             |
| `service-purity`                                 | no-concrete-import (+ purity declaration)                                                                                                                                   | Whether the declaration is its own atom (11).                                                                                                                             | "Pure, deterministic" is judgment, made mechanical only by declaration.                                                                                                                       |
| `ambient-access`                                 | no-ambient-read                                                                                                                                                             | Some add the overlap with root-no-capture.                                                                                                                                | The list of ambient names is not enumerated.                                                                                                                                                  |
| `blob-quarantine`                                | blob-importers-only (24)                                                                                                                                                    | —                                                                                                                                                                         | The reasons given for allowing assembly and test are rationale.                                                                                                                               |
| `service-assembly-only`, `adapter-assembly-only` | unit-assembly-only: one atom (24)                                                                                                                                           | —                                                                                                                                                                         | Their "not by …" lists restate other edges.                                                                                                                                                   |
| `runtime-import`, `public-unit`                  | none: scope parameters (24)                                                                                                                                                 | —                                                                                                                                                                         | The type exemption is denied again in five other rules (DS6).                                                                                                                                 |
| `ports-types-only`                               | port-types-only + port-edges-typed                                                                                                                                          | Split 16, bundled 8.                                                                                                                                                      | "Sign the adapter is not extracted" is a diagnosis.                                                                                                                                           |
| `unified-port`                                   | judgment. Mechanical shadow: adapter-implements-port 12, nothing 10, no-adapter-branch only 2                                                                               | —                                                                                                                                                                         | "Branches on which adapter it got" has no structural mark (24).                                                                                                                               |
| `private-sealed`                                 | private-sealed (24)                                                                                                                                                         | —                                                                                                                                                                         | Service boundaries versus layer directories need a path convention.                                                                                                                           |
| `no-service-cycle`                               | no-service-cycle                                                                                                                                                            | —                                                                                                                                                                         | The direction law (817-826) follows from this plus the unit gate.                                                                                                                             |
| `no-runtime-cycle`                               | no-runtime-cycle                                                                                                                                                            | —                                                                                                                                                                         | —                                                                                                                                                                                             |
| `test-through-contract`                          | judgment. Mechanical shadow: private-sealed 15, nothing 7, its own atom 2                                                                                                   | —                                                                                                                                                                         | "Documented behavior" and "implementation details" (24).                                                                                                                                      |
| `test-is-outside`                                | reader-bound, entry-not-imported, root atoms, straight-line (implied)                                                                                                       | How root registration is handled (DS2).                                                                                                                                   | 24/24 call it a list of exemptions, not of atoms; e2e is called "neither" (flagged by 17).                                                                                                    |
| `assembly-builds-only`                           | build-calls-only, loads-declared, args-not-derived, result-untouched, wiring-branch-only, returns-services-only, closed-definitions, root discipline (6 to 12 atoms, 24/24) | Whether the root clause is stable-root or a stricter atom (DS3).                                                                                                          | "Shared instances flow down, never sideways" (497-500) has no check; "decides nothing but which factory" is the overall wish.                                                                 |
| `assembly-driver-only`                           | assembly-importers-only                                                                                                                                                     | The list omits test (12 runs flag it).                                                                                                                                    | —                                                                                                                                                                                             |
| `driver-reader`                                  | reader-bound (+ binding-agrees-flavor in 5)                                                                                                                                 | —                                                                                                                                                                         | "Counts as blob on purpose" is a declared escape hatch.                                                                                                                                       |
| `wiring-outside-hooks`                           | wiring-calls-closed, args-not-derived                                                                                                                                       | —                                                                                                                                                                         | "Tech setup" means whatever the reader claims; branches in wiring are unruled (8).                                                                                                            |
| `hook-one-call`                                  | hook-call-count, hook-unconditional, hook-args-verbatim, result-untouched; plus callee-is-use-case or "nothing else" in some runs (at least 3 atoms in 24/24)               | Bare body as its own atom (10); count split (4).                                                                                                                          | The hook cut belongs to the reader; techs without callbacks have no cut; "a reader with a cut of its own says where the line sits" (614-615) reopens the "no open part" of 558-562 (rules-7). |
| `driver-calls-services`                          | none of its own (16) / its own callee whitelist (8)                                                                                                                         | —                                                                                                                                                                         | —                                                                                                                                                                                             |
| `driver-hooks-only`                              | closed-definitions, root-wiring-nullary                                                                                                                                     | —                                                                                                                                                                         | "Residue" is a label.                                                                                                                                                                         |
| `sub-driver-wiring`                              | sub-driver-call-only, driver-exports-wiring, args-not-derived                                                                                                               | —                                                                                                                                                                         | Markup children belong to the reader.                                                                                                                                                         |
| `driver-not-imported`                            | driver-importers-only                                                                                                                                                       | The list omits test (registrars, 634, 1021).                                                                                                                              | —                                                                                                                                                                                             |
| `boot-one-call`                                  | boot-imports-one, boot-calls-once, closed-definitions (empty list), entry-not-imported                                                                                      | Ambient and concrete bans: stated or implied.                                                                                                                             | "One per entry point" is not a property of one file.                                                                                                                                          |
| `stable-root`                                    | root-bindings-immutable, root-no-capture, root-no-effect (24/24 at least 3 atoms); the boot exemption becomes boot-calls-once (24)                                          | The test exemption (DS2).                                                                                                                                                 | "A shape nobody has written down yet is judged by the rule" (1088-1090) is open judgment (24/24).                                                                                             |
| _(no slug)_ Inversion of Control                 | no-default-deps (23)                                                                                                                                                        | —                                                                                                                                                                         | "No exceptions" (381) versus defaults that are "right here" (1221-1223).                                                                                                                      |

---

## 4. Shared parts: candidate death seeds

The test for each one: does some kind need part of a bundle without the rest, so
that canon must write an exception? I rank the blocking seeds first.

### DS1. The hook bundle applied to test bodies. Blocks.

- **The shared part:** `hook-unconditional`.
- **Its bundle:** `hook-one-call` (595-615) welds it to:
  - the count (595-599),
  - the callee being a use case (616-622, through driver-calls-services),
  - arguments as received (599-602),
  - a result that is never used, read, written, handed on or logged (603-610).
- **Scope:** "a hook" by the stock cut (558-560). Test bodies are hooks as well
  (545-546 "a `test()` body"; 1013 "the test bodies are hooks").
- **Who needs only part of it:** the test needs no-branch (24/24 carry it) and
  must break the other parts, because asserting hands the result on.
- **How canon patches it:** two clauses are named and three are left: 1057 "the
  test tech exempts the count", 1017 "the hook count and services-only do not
  apply". The sample splits on how to read that patch:
  - 8 runs (2·4·2) read the remaining parts as still binding a test body, so
    `expect(result)` is red;
  - whys-1 reads the exemption as lifting the whole slug, so no-branch is lost.
- **Verdict:** either reading fails, so the shared part blocks. This is the
  cleanest seed in the sample.
- **(mine)** The word "hook" itself names two things:
  - a callback the tech invokes (the reader's cut, 558-560);
  - the driver's link from an event to a use case (400-402).

  A test body is a hook in the first sense only. The driver-hook atoms take the
  second sense as their subject.

### DS2. Stable-root's root-call ban on boot and test. Blocks; patched three ways.

- **The shared part:** `root-no-effect` (1110-1121).
- **Who needs the bundle without it:**
  - the boot (one start call, 710-714);
  - the test (registration calls at root, 1013-1015).
- **Canon has three owners for one exemption** (8 runs flag this, 3·2·3):
  1. a closed list by kind (1125-1128);
  2. the reader declaring a call effect-free (1114-1117);
  3. the reader exempting a role "with its reason" ("a test runner's
     registration, say", 562).
- **Canon's own proof that the parts separate:** `mutableModuleState` lifts the
  bindings and nothing else (1107-1110).
- **How the sample resolves it:**
  - The boot gets its own positive atom (24/24).
  - The test splits four ways: own atom 11, reader declaration 9, kind exemption
    kept 3, not carried 1.
- **(mine) Weighing the test options:** the reader-declaration route labels
  registration "effect-free", which it is not, since it changes the runner's
  state. That bends the why ("loading must not act") to fit the case. Giving the
  test its own atom keeps the why honest and mirrors the boot.
- **A second root seed:** `assembly-builds-only` says "nothing sits at module
  root but imports" and cites `stable-root` (481). That is stricter than
  stable-root, so it is a different atom sitting under stable-root's name
  (whys-1 gives it its own atom, `root-imports-only`). 4 runs also find it
  collides with assembly functions, which are defined at root.

### DS3. Closed definitions. Not an exception but an open parameter; this is the venue.

- **Stated in:**
  - `assembly-builds-only` (479-481),
  - `driver-hooks-only` (623-628),
  - `boot-one-call` (712),
  - the prose at 278-279 and 643-648, with the term defined at 443-447.
- **The test's version:** "it defines anything" (264, 1016). The test gets the
  shape with no restriction, which is exactly the venue for local helpers.
- **Support:** 24/24 call it one atom; 15 (6·3·6) propose a closed list for the
  test kind.
- **Sub-seed:** "definition" counts variables (445), but assembly functions bind
  built instances to consts (the CLI shape, 664-667). Flagged by whys-2, kinds-1
  and kinds-2.

### DS4. The test as an importer. Blocks.

- **The parts involved:** the importer lists of `unit-assembly-only` (270-272),
  `assembly-driver-only` (482-484), `driver-not-imported` (640-641), plus
  `private-sealed` and `no-service-cycle`.
- **What canon gives the test:** a blanket "imports anything" (264, 873, 1016)
  instead of membership in those lists.
- **What canon's own text needs:**
  - specs that import units (1187-1189);
  - specs that call shared test factories living in assembly files (1214-1217);
  - specs that call shared registrar drivers (634, 1021);
  - test edges that still count for service cycles (909-912).
- **What the blanket swallows:**
  - `private-sealed` (15 runs flag the collision, 5·3·7);
  - "nothing imports a boot" (1074 versus 873; only kinds-1 sees this).
- **Omission flagged:** 12 runs (3·4·5) note the lists leave test out.
- **Consensus fix:** name the test as a member of each list; keep
  `private-sealed` and `no-service-cycle` on it.

### DS5. "Adapters only when called by a test". Blocks on test factories.

- **Where it appears:** 463-465, 505-508, 1033, 1215-1217. A returns rule whose
  verdict depends on who imports the file is really two atoms: "returns
  services" plus "an assembly that returns adapters is imported only by tests".
  Most runs rewrite it that way.
- **(mine) The collision:** combined with `assembly-driver-only`, which allows
  only drivers and assemblies to import an assembly, a shared test factory has
  no legal importer at all, unless the test is a driver. That is the very bundle
  under question. kinds-2, kinds-7, kinds-8 and whys-5 come close to saying
  this.

### DS6. Type-import scope, stated with opposite values. Blocks on concrete edges.

- **The parameter as canon states it, rule by rule:**
  - runtime only: 875-877, 971-977, 1002-1004;
  - type edges counted: 484, 880, 959-961, 995-997, 999-1001, 1067.
- **The contradictions:**
  - 881-883 says "a driver or an assembly may type-import from any layer". That
    contradicts 959-961 (a driver may not import blob, type imports included)
    and 880 (nothing imports a boot, type included).
  - `inward-deps` is silent, and 291 ("no ports") sits against 875 for a model
    type-importing a port.
- **A concrete case (mine):** `import type { Legacy } from './legacy'` in a
  driver is green under 881-883 and red under 959-961.
- **Support:** 23 runs treat type scope as a per-atom parameter that should be
  stated once.

### DS7. The assembly role outside assembly files. A hole: the same seed seen from the other side.

- Fractal assembly (159-167) plus `public-unit` (978-981): a unit factory
  composes its private sub-adapters, and no assembly atom reaches it. 11 runs
  flag this (4·2·5).
- rules-7 adds the container library: "an assembly by imports" (493-495), whose
  dynamic resolution the checker cannot see.
- **(mine)** DS1, DS3, DS5 and DS7 share one root. Verb atoms are keyed to the
  file kind, and the roles show up in other kinds:
  - the test file builds, links and registers;
  - the unit factory builds;
  - the shared test factory builds for a test.

  7 runs already scope their atoms by role or region and treat a kind as a set
  of regions: rules-4, rules-8, whys-5, whys-6, whys-8, kinds-1, kinds-5. whys-8
  puts it most directly: "it is a region composition, not an exemption list."

### DS8. The machine-name classifier. Duplicates only.

- `ambient-access` judges a name anywhere in model and service (944-952);
  `stable-root` judges the same name stored at root, in every kind (1093-1106).
  1122-1123 defers between them. About 22 runs flag the double verdict:
  `const T = Date.now()` in a model is red twice.
- One class of names is also sorted under five vocabularies: ambient (944),
  tech/claimed (80-91), concrete (884), unclaimed (85-86, 620-622), declared
  pure (942-943). 11 runs (3·3·5) flag this.
- **Not blocking:** canon already keeps the two rules separate, and adapters
  carry the root half alone.

### DS9. Arguments and results with rights that vary by kind. Resolved by splitting.

- **Arguments:** in assembly and wiring a tech value's field may be read
  (441-442); a hook reads nothing (601-602); a boot passes nothing. 24/24 split
  out the strict hook atom.
- **Results:** an assembly must pass its result on (453-466); a hook must not
  hand it on (603-605). 17 runs keep one atom with sinks scoped by kind; 7 split
  it.
- **Verdict:** not blocking once split. It blocks only if read as one bundle,
  which is how the text of `hook-one-call` reads.

### DS10. Scope, not bundle: no-default-deps versus the test factory.

- "No exceptions" (381) versus "right here" (1221-1223).
- Resolved if the atom is carried by service and adapter factories only, with
  the test factory treated as an assembly function. Many runs say exactly this.

### Duplications that do not block

- `driver-calls-services` restates the union of wiring-calls-closed and the hook
  callee rule (16).
- "A hook does not wire" appears three times (592-593, 636-639, 1055).
- `entry-not-imported` is stated separately for boot (713, 1074) and test (265,
  1017).
- "The root wiring function takes nothing" is stated at both ends (625, 711).
- The blob importer list is restated in about five places.
- "Holds no tech" restates the ambient and concrete bans for assembly and boot
  (254, 491, 712).
- `chain-purity` is the transitive closure of the edge atoms (22).

---

## 5. The test kind

### Carried (consensus)

| Atom                                             | Runs                                                                                                |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| reader-bound                                     | 24                                                                                                  |
| entry-not-imported (as the target)               | 24                                                                                                  |
| root-bindings-immutable                          | 24                                                                                                  |
| test-straight-line                               | 24 (all implied)                                                                                    |
| root-no-capture                                  | 22 (whys-6 and kinds-6 leave it open because stable-root's why is empty for a file nothing imports) |
| root effect discipline with registration allowed | 23 (kinds-3 carries only the statement half); mechanism split 11/9/3, see DS2                       |
| no-service-cycle                                 | 20                                                                                                  |
| private-sealed                                   | 18 carry, 6 leave it open against "imports anything"                                                |

A factual slip in the sample: kinds-4 calls cycle atoms "vacuous" for tests.
That holds for module cycles but not for service cycles. A test file's edges are
its package's edges, and 909-912 rules them.

### Not carried (consensus)

| Atom                                                                   | Runs not carrying it                                    |
| ---------------------------------------------------------------------- | ------------------------------------------------------- |
| hook-call-count, hook-args-verbatim, result-untouched (on test bodies) | 24                                                      |
| no-concrete-import                                                     | 24                                                      |
| closed-definitions in its canon form                                   | 24                                                      |
| no-default-deps                                                        | 24                                                      |
| inward-imports                                                         | 21 (3 keep it trivially, with the test at the top rank) |

The reason given: a test builds units, calls them and asserts, and nothing
imports it. Atoms that guard importers have nothing to protect, and atoms that
keep bodies boring would forbid asserting.

### Dissent

| Position                                                                                                             | Runs                                                               |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| no-ambient-read on tests                                                                                             | carried 3 (rules-2, whys-8, kinds-7), left open 6, not carried 15  |
| tech-claimed-only on tests (an unclaimed `node:fs` would be red, so fixtures must be adapters, consistent with 1191) | 2 (rules-6, whys-8)                                                |
| sub-driver-call-only, for shared registrars                                                                          | 7 (2·4·1)                                                          |
| assembly atoms on setup or helper functions, by position                                                             | 8                                                                  |
| one instance per test at describe scope                                                                              | 4                                                                  |
| no-prod-config                                                                                                       | 3                                                                  |
| e2e taken out of the test kind                                                                                       | proposed by several; whys-8's `e2e-black-box` is the cleanest form |

### The helper question

**Distribution of answers:**

- "Yes, it must reach the helpers": 24/0. This is prompt-led, see section 6.
- How the straight-line rule is scoped:
  - by definition site (every function the test file defines): 12 (4·5·3);
  - by reachability from a hook: 9 (3·2·4);
  - by a closed role list as the main mechanism: 3 (1·1·1).
- The way out ("a helper that needs a loop leaves the file and becomes the kind
  it is"): 24.
- Iteration callbacks, `test.each` or recursion counted as loops: 16 (5·6·5).

**Residual venues the runs name:**

- a model data builder that loops: 9 (2·3·4);
- loops around registration (`test.each`, describe-level loops): 7 (3·1·3);
- blob helpers, since a test may import blob: 6 (0·4·2);
- functions passed as values, which defeat reachability: rules-8, whys-2,
  whys-3.

**The strongest structure without a laundering venue** (assembled from the
sample; the weighing is mine):

1. **Give the test kind a closed definition list instead of "defines
   anything":**
   - hooks;
   - straight-line local functions;
   - immutable data;
   - optionally a named local test factory carrying the assembly atoms.

   This puts DS3's open parameter back in place.

2. **Scope straight-line by definition site, not by reachability.** It needs no
   call graph and cannot be dodged by passing a function as a value.
   Reachability is both weaker and heavier, as rules-8, whys-2 and whys-3 argue.
   Count iteration methods and recursion as loops.
3. **Anything that needs control flow leaves the file and becomes the kind it
   is:**
   - a fake becomes an adapter;
   - a builder becomes a model;
   - a factory becomes an assembly function;
   - a registrar becomes a driver.

   This is 1017-1019 extended from shared code to local code. The loop is not
   banned; it is given a home under rules.

4. **Close the two ways out of the file:**
   - a blob file imported only by tests is red (whys-4, whys-7);
   - loops around registration need an explicit ruling.
5. **Residue to confess:** a model builder may loop, which is legal under
   model's atoms and visible as an import. Whether a test "hides the scenario"
   stays a judgment.

**Caveat:** the 8 positional proposals assume a "setup" region exists. 1196
places assembly inside the hook (see section 6, item 3), so the setup region
exists only as a named local test factory, which is kinds-5's hypothesis.

---

## 6. Confidence

### What the sample supports

- **Unanimous clusters** (30 of the 39) are robust as "what this model reliably
  reads in canon". If the runs were independent, a 24/24 result would put the
  true rate above roughly 88% (rule of three).
- **Clusters at 7 or below** are robustly marginal.
- **The 16-run boundary is not sharp.** Under independence, 16/24 has a 95%
  interval of roughly 11 to 21 runs. The 17s and the 14-15s are within noise of
  each other.

### What it does not support

- **The runs are correlated.** They share one model, one prompt template and one
  canon, so the effective sample size is unknown, somewhere between 3 (the
  framings) and 24. With an effective sample of around 3, unanimity only bounds
  the rate above roughly 37%.
- **Agreement measures reproduction, not correctness.**
- **The prompt led some answers.** The computed task carried the authors'
  framing ("molecules", "except", "laundering venue", and helpers that "can't be
  no"). The 24/0 on helpers and the universal "test = selection" are at least
  partly prompt-led.

### The framing check

A cluster can be framing-sensitive (one framing gives it 7 runs or more, another
3 or fewer):

- `only-driver-listens`: 3·7·4
- `driver-imports-closed`: 7·3·7
- own atom for driver-calls-services: 1·5·2
- importer-gate family: 1·5·2
- port-edges as its own atom: 6·3·7
- lateral-OK flagged as a contradiction: 7·2·4

**(mine)** The pattern is consistent. The whys framing merges parts that share a
why and keeps parts with a strong why even when their check is weak. The rules
and kinds framings keep canon's statement shape. So the contested band is a
disagreement about the atom criterion:

- same check, two whys: straight-line on hook versus test; ambient versus root
  capture; boot versus test entry;
- same why, two checks: port content versus edges; root call versus statement;
  result sinks;
- a why with no check of its own: driver-calls-services; only-driver-listens.

whys-6 is the only run that states its criterion: split when the whys differ, or
when sharing or exemption needs it.

### Errors in the sample

- kinds-4 treats service cycles as vacuous for tests, and rules-1 and rules-8
  drop them from tests. 909-912 says otherwise.
- 9 runs declare registration "effect-free", which it is not.

### What the sample missed or barely saw (mine)

1. **Hooks in test files are under-defined.** Under the stock cut, every
   callback a test hands its tech is a hook (558-560), including mock
   implementations (`vi.fn(impl)`) and matcher callbacks. No run named these.
   kinds-3 came closest by noting that describe callbacks are hooks. So
   hook-scoped atoms on a test file have an unclear subject.
2. **Canon's own principle condemns the test kind.** 234-236 says "the widest
   import rights carry the narrowest verb lists". The test kind imports anything
   and defines anything, which breaks that principle in canon's own words. Only
   whys-3 cites it.
3. **"Assembly and driver in one" has no region boundary inside a test body.**
   1196 ("each test assembles its own instance") and 1187-1189 put the assembly
   half inside the hooks. Only whys-1 and kinds-3 say so.
4. **1022 may already settle private-sealed.** "Test edges count for rights and
   coverage" can be read as: the import rules judge a test's edges. If that
   reading holds, canon itself settles the private-sealed collision (15 runs) in
   favor of sealing. No run cites it. My confidence in this reading is low.
5. **Is a test file an "effect-allowed" file?** 1111-1112 ("a local function of
   a file whose layer is allowed side effects") does not say. That decides
   whether a spec's root `const fx = buildFixture()` is judged at the call or
   only at the binding. No run raised it.
6. **Describe scope escapes stable-root.** `let x; beforeEach(...)` is not at
   module root. Only 4 runs saw this.

### What this hands the next session

1. **The atom criterion:** split by check, by why, or by both. This settles
   about eight contested splits.
2. **Test registration:** its own atom (as for boot), a reader declaration, or a
   kind exemption.
3. **Helper scope and the closed definition list for tests:** definition site or
   reachability; and the ruling on loops around registration.
4. **The test as an importer:** a named member of the importer lists, and
   whether `private-sealed` binds it.
5. **Type-import scope:** one value per atom, and a fix for 881-883.
6. **Atoms by role, kinds as sets of roles:** whether atom subjects become roles
   (root, hook, wiring function, assembly function, test body), with kinds as
   role sets. This also reaches the fractal assembly hole (159-167).
7. **Remaining smaller rulings:**
   - e2e as its own kind outside the graph;
   - splitting the word "hook" into its two meanings;
   - whether tests carry the ambient ban and tech-claimed-only.
