# Quorum report: canon split into atoms, 24 runs

## How to read this report

- I read canon in full
  (`/home/rixo/projects/deblob.longshot/docs/architecture.md`, 1473 lines) and
  checked every canon citation below against it.
- **How I counted.** A run _supports_ a cluster when one of its atoms states
  that constraint, either alone or merged with other constraints. I call that
  "present". Where the cut matters, I also give a "dedicated" count: runs where
  the constraint is the atom's whole point. I counted by hand from the JSON.
  Where a mapping was borderline I name it.
- **Notation.** Support is written `k/24 (R/W/K)`: R is the rules-first framing,
  W is whys-first, K is kinds-first, 8 runs each. Stable means 16 or more,
  contested 8 to 15, idiosyncratic 7 or fewer.
- **My own additions** are marked **[mine]**. Everything else is counted from
  the runs.

### The short version

1. **The import and graph half of canon is already made of atoms, and the quorum
   agrees on it unanimously.** The molecules are the rules for the outside
   kinds:
   - `assembly-builds-only` holds 7 to 9 atoms.
   - `hook-one-call` holds 5 or 6.
   - `stable-root` holds 3 or 4. All 24 runs split it, and canon's own config
     switch `mutableModuleState` lifts exactly one of those parts (1107-1110).
   - `boot-one-call` holds 3 to 5.
   - `test-is-outside` is mostly a list of absences.
2. **Four slugs have no atom of their own.**
   - `chain-purity`: 24/24 runs call it derived.
   - `runtime-import` and `public-unit`: 24/24 read them as scope settings of
     the composition atom.
   - `driver-calls-services`: 16/24 call it a union of other rules.
3. **In every run, the test kind's "except" list turns into a selection of
   atoms.** That selection is not "assembly plus driver". It takes the _union of
   their import rights_ and _none of their verb lists_. That reverses canon's
   own law at 234-236: "the widest import rights carry the narrowest verb
   lists".
4. **The parts that block composition** (§4):
   - The `hook-one-call` bundle, of which the test is exempted only from "the
     count".
   - "A hook does not wire" set against "each test assembles its own instance".
   - The importer lists of assemblies and drivers, which leave out the test even
     though canon makes tests import both.
   - `closed-definitions`, which is switched off for tests.
5. **The helper question.**
   - 24/24 reject "no".
   - Runs split on scope: 12 apply the straight-line check to every function the
     file defines, 9 to what is reachable from a test body, and 3 do something
     else.
   - 24/24 give the same way out: a helper that needs logic moves to a file of
     its own kind.
   - 15/24 replace the test's "defines anything" with a closed list.

---

## 1. Stable atoms (16/24 or more), ordered by support

### 1a. Present in 24/24 runs (8/8/8)

**Import graph**

| Atom                      | Statement                                                                                                                                                                                                       | Why                                                                                         | Canon                                                                      |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `inward-imports`          | A file imports only its own layer or an inner one: model < ports < service, adapter < assembly < driver < boot.                                                                                                 | The inside is built, tested and reasoned about without knowing the outside.                 | 222-224, 864-873, 929-932                                                  |
| `no-concrete-import`      | Model, ports, service, assembly and boot import no platform or I/O module. A third-party package counts as concrete unless the project declares it pure; assembly may also import a declared container library. | Concrete code bypasses the ports and needs the machine to run a test.                       | 291, 308-311, 491-495, 884-886, 939-943                                    |
| `no-ambient-access`       | Code reads or calls no environment, clock, randomness, console, timer or `globalThis` from a global, anywhere in the file.                                                                                      | Code that reaches the machine cannot be tested without setting that machine up.             | 292-294, 342-344, 944-952                                                  |
| `unit-assembly-only`      | A public `.service`/`.adapter` file is imported at runtime only by assembly. Type-only imports and the owner's own `private/` are outside the atom.                                                             | The concrete graph is resolved in exactly one place.                                        | 270-272, 374-381, 965-981                                                  |
| `blob-importers-only`     | Blob is imported only by assembly, test and other blob, type imports included.                                                                                                                                  | Code with no guarantees must not contaminate a layer that has some.                         | 268, 370-372, 487-490, 953-961                                             |
| `outside-importers`       | Assembly is imported only by drivers and assemblies; a driver only by a boot or drivers; a boot and a test by nothing. Type imports are included.                                                               | The outside kinds have no contract: they are started, never depended on.                    | 482-485, 540-543, 640-641, 713, 1011-1023, 1037-1039, 1066-1068, 1072-1074 |
| `private-sealed`          | Nothing outside a service imports its `private/` directory, type imports included.                                                                                                                              | Visibility is ownership.                                                                    | 779-788, 806, 993-997                                                      |
| `no-service-cycle`        | Imports between service packages form a DAG. Every import kind counts.                                                                                                                                          | A service in a cycle cannot be extracted, moved or reasoned about alone.                    | 817-826, 901-912, 998-1001                                                 |
| `no-runtime-cycle`        | Runtime imports between files form no cycle.                                                                                                                                                                    | Circular ESM imports fail silently in production.                                           | 914-918, 1002-1004                                                         |
| `layer-in-path`           | Every import names the layer file itself; no index or barrel file sits in between.                                                                                                                              | The matrix is enforceable only if the layer is visible at the import site.                  | 759-777, 933-934                                                           |
| `port-no-runtime`         | A port file holds types only.                                                                                                                                                                                   | A contract has no runtime code; code found there is an adapter not yet extracted.           | 136-137, 243-244, 982-984                                                  |
| `port-edge-typed`         | Every import into or out of a port file is `import type`.                                                                                                                                                       | A runtime edge on a port is a re-export, a side-effect import, or a missing `type` keyword. | 984-987                                                                    |
| `adapter-implements-port` | An adapter's factory conforms to a port it type-imports.                                                                                                                                                        | Adapters are swappable only behind one interface.                                           | 130-134, 141-147, 250-251, 368-369                                         |

Notes on this table:

- **`no-concrete-import`.** The "declared, not presumed" classification of
  packages appears in 24/24 runs. Only 11/24 (4/4/3) make it a separate atom;
  the other 13 treat it as a setting of this atom.
- **`no-ambient-access`.** Canon scopes it to model and service. Most runs
  extend it to assembly and boot, and mark that as implied (253-255, 491,
  712-713).
- **`unit-assembly-only`.** 24/24 runs map both `service-assembly-only` and
  `adapter-assembly-only` to this single atom.
- **`outside-importers`.** All four meanings are present in 24/24 runs, but the
  cut differs: 8 runs use one atom, 2 use two, 11 use three, 3 use four. Canon
  states a why only for assembly ("no contract", 484-485). The why for drivers,
  boots and tests is inferred in every run.
- **The two port atoms.** 16/24 (6/3/7) keep them separate; 8 merge them.
- **`adapter-implements-port`.** All 24 propose it, and 20 mark it implied (no
  slug states it). Most say a check needs the TypeScript engine.

**Module root**

| Atom                      | Statement                                                                                                                                                                 | Why                                                                                 | Canon                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------- |
| `root-bindings-immutable` | Every module-root binding is provably immutable by its syntax, to its depth.                                                                                              | A test that imports the module gets the module every other test got.                | 295-298, 341, 1088-1096, 1105-1110 |
| `root-no-machine-read`    | No root binding stores a value read from the tech, the clock or randomness. The module's own location is exempt.                                                          | The file could not be tested under another environment or moment without reloading. | 1093-1105                          |
| `root-no-effect`          | No root call reaches tech or an unclaimed name, runs a use case, or enters a local function of a side-effect layer. No root assignment or `delete`. A `throw` is allowed. | Loading a module must not act.                                                      | 1110-1121                          |

No run kept `stable-root` whole. 11/24 (3/4/4) also split `root-no-effect` into
a call part and a statement part, making four atoms; 13 keep three.

**Definitions and assembly**

| Atom                    | Statement                                                                                                                                 | Why                                                                        | Canon                                                |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------- |
| `closed-definitions`    | A file defines only what its kind lists: assembly functions; or hooks plus one wiring function; or, for a boot, nothing.                  | A definition is where logic hides in a file allowed to import anything.    | 278-279, 443-446, 479-481, 623-628, 643-652, 710-712 |
| `assembly-calls-build`  | Every call in an assembly is a factory: of a composition unit, an assembly, a blob file, or a model `create*`.                            | Assembly decides nothing but which factory to call.                        | 452-466, 510-519, 1028-1036                          |
| `declared-load`         | An assembly may call a use case only if the project declares it as a load. The load's result then counts as a tech value.                 | Nothing in a call's shape tells a load from a use case run for its effect. | 466-475, 1033-1034                                   |
| `args-not-computed`     | Arguments in assembly, wiring and hooks are literals, tech values or instances, never derived values.                                     | A derived argument is logic done where nothing has a contract or a test.   | 441-443, 458-463, 589-591, 1029-1030, 1049-1050      |
| `result-untouched`      | What an assembly built is passed on or returned, never read, branched on or computed with.                                                | Looking into what was built is a decision the map cannot show.             | 454-457, 513-519, 1030-1033                          |
| `wiring-branch-only`    | An assembly branch or loop tests only a parameter or a loaded value, against a literal or for truthiness, and its arms are factory calls. | A condition on an instance is a decision the map cannot show.              | 474-481, 1034-1036                                   |
| `returns-services-only` | An assembly returns services and shared model instances, and adapters only when its caller is a test.                                     | Consumers type against service APIs.                                       | 463-465, 505-508, 1033, 1214-1217                    |

Notes on this table:

- **`closed-definitions`.** 23 runs use one atom with a list per kind. rules-5
  writes three atoms, one per kind.
- **`assembly-calls-build`.** 22 runs make it a dedicated atom (8/8/6). kinds-7
  and kinds-8 merge the callee rules of all outside kinds into one atom.
- **`declared-load`.** 17 make it a dedicated atom (6/7/4). The other 7 fold it
  into `assembly-calls-build`.
- **`returns-services-only`.** whys-1 and kinds-1 split the "adapters only to
  test callers" part into its own atom.

**Driver and hook**

| Atom                   | Statement                                                                                                 | Why                                                                              | Canon                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------- |
| `reader-bound`         | Every driver file and test file is read by a reader bound to its tech.                                    | No driver rule can be judged without the reading.                                | 553-557, 584-588, 1044-1047 |
| `tech-claimed`         | A driver's tech is only what its bound readers claim. An unclaimed name is red, and so is a pure library. | Tech that no reading claims cannot be told apart from logic.                     | 80-91, 553-557, 619-622     |
| `driver-wiring-closed` | Outside its hooks, a driver calls only assembly, claimed tech setup, and sub-driver wiring functions.     | The driver's one thing is to connect.                                            | 589-594, 616-618, 1048-1050 |
| `hook-one-call`        | A hook makes exactly one use-case call. Zero calls and two calls are both red.                            | Two calls form a sequence nobody owns; zero is logic with no home.               | 595-599, 1051-1057          |
| `hook-unconditional`   | No branch, loop or try sits around the hook's call.                                                       | A condition there is translation, and translation belongs to the facade service. | 598-599, 605-608            |
| `hook-args-received`   | A hook passes the event and host values whole; nothing is read off them.                                  | Reading the event is translation.                                                | 599-604                     |
| `hook-result-unused`   | A hook returns its call's value or drops it. The value is never read, written, handed on or logged.       | Using the result is translation.                                                 | 602-613                     |

Notes on this table:

- **`tech-claimed`.** 18 dedicated (6/5/7).
- **`hook-one-call`.** 4 runs split it into "at least one" and "at most one".
- **`hook-unconditional`.** 19 dedicated. The other 5 fold it into a "bare body"
  atom.
- **`hook-args-received`.** 23 dedicated. It is stricter than
  `args-not-computed`: in an assembly a field of a tech value may be read, in a
  hook nothing may.
- **`hook-result-unused`.** The meaning is present in 24/24, but only 10 (6/2/2)
  make it its own atom. The other 14 merge it with the assembly's
  `result-untouched` and give each kind a different list of allowed uses (§4.7).

**Boot and test**

| Atom                     | Statement                                                                            | Why                                                                                    | Canon                       |
| ------------------------ | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | --------------------------- |
| `boot-imports-driver`    | A boot imports exactly one driver and nothing else.                                  | Starting is its one thing.                                                             | 260-261, 710-712, 872       |
| `boot-calls-once`        | The boot's root holds one call, to that driver's wiring function, with no arguments. | It is the one module whose evaluation performs a call.                                 | 260-262, 710-713, 1072-1074 |
| `scenario-straight-line` | No branch or loop in a test body.                                                    | The reviewer reads each test as given X, when Y, expect Z, written in the test itself. | 1150-1161                   |

Notes on this table:

- **The two boot atoms.** 22 runs make each a dedicated atom. kinds-7 and
  kinds-8 merge them into cross-kind atoms.
- **`scenario-straight-line`.** Every run marks it implied: canon states only
  the reviewer prose, never a rule. 10 runs (3/3/4) make it a separate atom from
  `hook-unconditional`; 14 use one control-flow atom carrying two whys.

### 1b. Below 24 but still stable

| Atom                    | Statement                                                                                                                                | Why                                                                | Support                                                 | Canon              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------- | ------------------ |
| `no-default-deps`       | A composition unit's factory gives its dependency parameters no default value.                                                           | Defaults create static imports and scatter assembly into services. | 23/24 (8/8/7), missing kinds-2                          | 374-381, 1221-1223 |
| `driver-exports-wiring` | A driver exports its one wiring function and no hook.                                                                                    | An importer can then only let it attach callbacks.                 | 23/24 (8/7/8), missing whys-3                           | 633-636            |
| `sub-driver-call-only`  | A driver uses an imported driver only to call its wiring function, during its own wiring, never from a hook and never with hexagon data. | Otherwise one hook could chain two calls through another file.     | 20/24 (7/6/7), missing rules-2, whys-4, whys-5, kinds-7 | 629-639, 1063-1065 |
| `root-wiring-nullary`   | A root driver's wiring function takes nothing and reads its tech itself; the boot passes nothing.                                        | The boot touches no tech.                                          | 17/24 (5/5/7)                                           | 623-626, 710-711   |

Notes:

- **`no-default-deps`** is prose only; no slug states it. whys-1, whys-4 and
  whys-6 scope it to service factories only. The rest scope it to composition
  units.
- **`sub-driver-call-only`.** whys-1 and rules-3 widen it to a general atom ("an
  imported driver is used only through its wiring function") that also covers
  the boot and the spec file.
- **`root-wiring-nullary`.** rules-7 folds it into `closed-definitions`, so the
  dedicated count is 16.

---

## 2. Contested and idiosyncratic atoms

### Contested (8 to 15)

| Atom or cut                                                                                              | Support                                                      | What divides the runs                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hook-bare-body` (no statement in a hook besides the call)                                               | 14 (6/4/4); 17 if "no other call" inside a count atom counts | Whether "nothing else" (595) is its own part, or follows from count plus unconditional plus result-unused.                                                                                |
| `only-driver-listens` (callbacks handed to claimed tech exist only in drivers and tests)                 | 14 (3/7/4)                                                   | Sensitive to framing. Every run that has it says it cannot really be checked: telling listening from an outbound callback needs a reader, and assembly, boot and adapter files have none. |
| Package classification as its own atom (pure / concrete / claimed / container, "declared, not presumed") | 11 (4/4/3)                                                   | Atom versus a setting of `no-concrete-import` and `tech-claimed`. Several runs say there is one mechanism with three or four declaration lists (rules-2, kinds-2, kinds-4, whys-1).       |
| Test registration as its own root atom (`root-registration-only`)                                        | 11 (4/4/3)                                                   | Alternatives: the test reader declares registration calls effect-free (10: 4/2/4); keep the kind exemption (whys-6, whys-7); no root-call atom for tests (kinds-3).                       |
| Stable-root in four atoms (call separate from statement)                                                 | 11 (3/4/4)                                                   | 13 runs merge call and statement into one effect atom.                                                                                                                                    |
| `driver-no-model` as its own atom                                                                        | 10 (4/2/4)                                                   | The rest fold it into a driver import list or callee atom. Canon itself wavers: the matrix row is about imports (871), while 883 says "the driver row's prohibition is about calls".      |
| `hook-result-unused` as its own atom                                                                     | 10 (6/2/2)                                                   | One result-flow atom with a different allowed use per kind, versus two atoms (§4.7).                                                                                                      |
| Test straight-line separate from the hook's                                                              | 10 (3/3/4)                                                   | Same check, two whys: translation belongs to the facade, versus reviewer legibility. whys-4 says this decision is owed to the authors.                                                    |
| Whole-driver callee atom ("never adapter, never model"), separate from the wiring atom                   | 8 (1/5/2)                                                    | The rest say `driver-calls-services` adds no atom of its own (§3).                                                                                                                        |

### Idiosyncratic (7 or fewer)

| Atom                                                                                       | Support | Runs                                                                                                                                                  |
| ------------------------------------------------------------------------------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Positive import list for drivers (assemblies, drivers, claimed tech only)                  | 7       | rules-1, rules-3, rules-7, whys-3, kinds-6, kinds-7, kinds-8                                                                                          |
| `kind-by-name` / `binding-agrees-flavor`                                                   | 5       | rules-1, rules-4, rules-8, whys-2, kinds-1. Most others call it a config check, not code structure.                                                   |
| `no-adapter-branch`                                                                        | 5       | rules-2, rules-7, whys-3, whys-4, whys-6. All say it is barely checkable.                                                                             |
| `test-owns-instance` (no instance shared across test hooks, including at `describe` scope) | 4       | rules-5, rules-8, whys-3, whys-6. Others say `root-bindings-immutable` already forces it, but rules-8 notes that `describe` scope is not module root. |
| Hook count split into minimum and maximum                                                  | 4       | rules-8, whys-3, kinds-1, kinds-4                                                                                                                     |
| Hook callee is a use case, as a dedicated atom                                             | 4       | rules-3, rules-5, kinds-1, kinds-2                                                                                                                    |
| Positional split (use-case calls only inside hooks, wiring only outside)                   | 3       | rules-8, kinds-5, kinds-8                                                                                                                             |
| `no-prod-config`                                                                           | 3       | whys-6, kinds-4, kinds-8                                                                                                                              |
| `unit-exports-factory`                                                                     | 3       | rules-7, whys-7, kinds-3                                                                                                                              |
| `exemption-states-reason`                                                                  | 2       | rules-1, rules-4                                                                                                                                      |
| Contract testing as a structural atom                                                      | 2       | rules-1, whys-6                                                                                                                                       |
| One-wiring-function as a separate atom                                                     | 2       | kinds-1, kinds-6                                                                                                                                      |
| Tech only in drivers / boot touches no tech                                                | 2       | kinds-3, kinds-6                                                                                                                                      |
| A blob file imported only by tests is red                                                  | 2       | whys-4, whys-7 (proposed, canon 1218-1219)                                                                                                            |
| `container-declared`                                                                       | 1       | rules-2                                                                                                                                               |
| `unit-has-assembler`                                                                       | 1       | rules-8                                                                                                                                               |
| `test-assert-in-hook`                                                                      | 1       | rules-8                                                                                                                                               |
| `tech-value-no-call`                                                                       | 1       | kinds-5                                                                                                                                               |
| `no-model-compute`                                                                         | 1       | kinds-5                                                                                                                                               |
| `local-helper-kinded`                                                                      | 1       | whys-6                                                                                                                                                |
| `e2e-black-box`                                                                            | 1       | whys-8                                                                                                                                                |
| `root-imports-only`                                                                        | 1       | whys-1                                                                                                                                                |
| `chain-purity` as an atom                                                                  | 1       | whys-2, which itself calls it "a scope on other atoms"                                                                                                |

---

## 3. Rules as molecules

| Slug                                             | Consensus atoms                                                                                                                                                             | Where runs disagree                                                                                                                                                                                              | Agreed: not structure                                                                                                                                                                                                                   |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `inward-deps`                                    | `inward-imports`                                                                                                                                                            | Whether type-only edges count: canon says model takes "no ports" (291) but a type import is "legal anywhere" (974). "Lateral OK" is called false for service-to-service and adapter-to-adapter by 14/24 (7/2/5). | "See matrix" points to a derived table, not a rule.                                                                                                                                                                                     |
| `layer-in-path`                                  | `layer-in-path`                                                                                                                                                             | What counts as a barrel beyond `index.ts`.                                                                                                                                                                       | —                                                                                                                                                                                                                                       |
| `chain-purity`                                   | none                                                                                                                                                                        | —                                                                                                                                                                                                                | 24/24: it is the per-edge atoms applied through the import chain. Only third-party purity is left, and that is taken on declaration.                                                                                                    |
| `service-purity`                                 | `no-concrete-import` + the declared classification                                                                                                                          | Classification as an atom (11) or a setting.                                                                                                                                                                     | "Pure, deterministic" can only be declared.                                                                                                                                                                                             |
| `ambient-access`                                 | `no-ambient-access`                                                                                                                                                         | Extension to assembly and boot (implied).                                                                                                                                                                        | —                                                                                                                                                                                                                                       |
| `blob-quarantine`                                | `blob-importers-only`                                                                                                                                                       | —                                                                                                                                                                                                                | Its justifications for letting assembly and tests import blob.                                                                                                                                                                          |
| `service-assembly-only`, `adapter-assembly-only` | `unit-assembly-only` (24/24, one atom)                                                                                                                                      | Whether the test is a listed importer.                                                                                                                                                                           | —                                                                                                                                                                                                                                       |
| `runtime-import`, `public-unit`                  | none: scope settings of `unit-assembly-only` (24/24)                                                                                                                        | rules-3 attaches `port-edge-typed` to `runtime-import`.                                                                                                                                                          | —                                                                                                                                                                                                                                       |
| `ports-types-only`                               | `port-no-runtime` + `port-edge-typed`                                                                                                                                       | Split 16 versus merged 8.                                                                                                                                                                                        | "A sign the adapter isn't extracted" is a diagnosis.                                                                                                                                                                                    |
| `unified-port`                                   | `adapter-implements-port` (implied)                                                                                                                                         | 5 add `no-adapter-branch`; 10 map nothing.                                                                                                                                                                       | 24/24: "branches on which adapter it got" is judgment.                                                                                                                                                                                  |
| `private-sealed`                                 | `private-sealed`                                                                                                                                                            | —                                                                                                                                                                                                                | The service boundary needs a path convention (808-815).                                                                                                                                                                                 |
| `no-service-cycle`                               | `no-service-cycle`                                                                                                                                                          | —                                                                                                                                                                                                                | The direction law (817-826) is derived; the sharing progression is guidance.                                                                                                                                                            |
| `no-runtime-cycle`                               | `no-runtime-cycle`                                                                                                                                                          | —                                                                                                                                                                                                                | —                                                                                                                                                                                                                                       |
| `test-through-contract`                          | at most a shadow of `private-sealed`                                                                                                                                        | 2 runs make a public-API atom.                                                                                                                                                                                   | "Documented behavior", "implementation details", exceptions (a) and (b).                                                                                                                                                                |
| `test-is-outside`                                | `reader-bound`, `outside-importers` (test imported by nothing), the root atoms, a registration mechanism, `scenario-straight-line`                                          | The registration mechanism (§4.5).                                                                                                                                                                               | "Assembly and driver in one" is a label. Its clauses ("imports anything", "defines anything", count and services-only) are atoms not selected, not constraints.                                                                         |
| `assembly-builds-only`                           | `assembly-calls-build`, `declared-load`, `args-not-computed`, `result-untouched`, `wiring-branch-only`, `returns-services-only`, `closed-definitions`, root atoms           | Load as its own atom (17); the returns clause split (2).                                                                                                                                                         | "Decides nothing but which factory"; "shared instances flow down, never sideways" (497-500). "Nothing at root but imports" (481, 1036) collides with assembly functions defined at root (flagged by whys-8, kinds-1, kinds-2, kinds-6). |
| `assembly-driver-only`                           | `outside-importers` (assembly target)                                                                                                                                       | Test in the importer list (16/24 put it there).                                                                                                                                                                  | —                                                                                                                                                                                                                                       |
| `driver-reader`                                  | `reader-bound`                                                                                                                                                              | `binding-agrees-flavor` as atom (5) or config check.                                                                                                                                                             | The "reader that counts it as blob on purpose" escape (587-588).                                                                                                                                                                        |
| `wiring-outside-hooks`                           | `driver-wiring-closed` + `args-not-computed`                                                                                                                                | Positional split atom (3).                                                                                                                                                                                       | What "tech setup" covers is the reader's claim list. Canon is silent on branches and loops in wiring (flagged by rules-1, rules-8, whys-4, kinds-3 and others).                                                                         |
| `hook-one-call`                                  | `hook-one-call` (count), `hook-unconditional`, `hook-args-received`, `hook-result-unused`; bare body (14); callee is a use case (mostly folded)                             | How the result and bare-body parts are cut.                                                                                                                                                                      | Facade advice; the reader's cut ("ruled for the stock cut", 614-615).                                                                                                                                                                   |
| `driver-calls-services`                          | none of its own (16/24) + `tech-claimed` + driver-no-model                                                                                                                  | 8 runs give it a whole-driver callee atom.                                                                                                                                                                       | "Parsing and rendering are use cases" is a why.                                                                                                                                                                                         |
| `driver-hooks-only`                              | `closed-definitions` + `root-wiring-nullary` (17)                                                                                                                           | One-wiring-function as its own atom (2).                                                                                                                                                                         | "Residue" is a label.                                                                                                                                                                                                                   |
| `sub-driver-wiring`                              | `sub-driver-call-only` (20) + `driver-exports-wiring` (23)                                                                                                                  | 4 runs fold the call part into callee or export atoms.                                                                                                                                                           | A parent rendering a child in markup is reader scope (638-639).                                                                                                                                                                         |
| `driver-not-imported`                            | `outside-importers` (driver target)                                                                                                                                         | Test in the importer list (9/24).                                                                                                                                                                                | —                                                                                                                                                                                                                                       |
| `boot-one-call`                                  | `boot-imports-driver`, `boot-calls-once`, `closed-definitions` (empty list), `root-wiring-nullary`, `outside-importers`                                                     | —                                                                                                                                                                                                                | "One per entry point" is not checkable per file.                                                                                                                                                                                        |
| `stable-root`                                    | `root-bindings-immutable`, `root-no-machine-read`, `root-no-effect` (as call + statement in 11 runs)                                                                        | 3 versus 4 atoms; the exemption mechanism (§4.5).                                                                                                                                                                | 24/24: the open clause "a shape nobody has written down yet is judged by the rule" (1088-1090) cannot be checked. Its presumptions (property reads free; `import.meta.url` fixed) are rulings.                                          |
| Prose with no slug                               | `no-default-deps` (23), `adapter-implements-port` (24 propose, 20 implied), `driver-exports-wiring` (23), `only-driver-listens` (14), `scenario-straight-line` (24 implied) | —                                                                                                                                                                                                                | "Orchestrates, does not compute"; an adapter "holds nothing of the hexagon's" (277-278); "meaningful port"; "taste".                                                                                                                    |

---

## 4. Shared parts: the candidate death seeds

These are ordered by whether the overlap blocks composition, meaning a kind that
needs one part of a bundle without the rest.

### 4.1 `hook-one-call`, applied whole to test bodies (blocks)

- **The parts of the slug** (595-615, 1051-1057):
  - (a) exactly one call;
  - (b) the callee is a use case;
  - (c) the call is unconditional;
  - (d) arguments are passed as received, nothing read off them;
  - (e) the value is returned or dropped, never read;
  - (f) nothing else in the body;
  - (g) "a hook does not wire" (592-593).
- **How canon scopes it to tests.** "The test bodies are hooks" (1012-1013). The
  exemption is worded two ways in two places: "the test tech exempts the count"
  (1057) and "the hook count and services-only do not apply" (1016-1017).
- **What a test needs.** Only (c), if anything. An assertion reads the value, so
  (e) fails. Building inputs breaks (d). An `expect(...)` call is "something
  else", so (f) fails **[mine: no run names the assertion call itself; the runs
  argue from reading the result]**.
- **It blocks.** By the text, a test body that asserts is red under (e) and (f).
- **Quorum.** All 24 drop (a), (b), (d) and (e) for tests, and keep (c) as the
  test's straight-line atom. Runs that explicitly say the text still binds the
  other parts to tests: rules-1, rules-3, whys-2, whys-5, whys-6, whys-7,
  kinds-3, kinds-8. whys-1 reads 1057 the opposite way ("exempts the whole rule,
  losing body-straight-line with it"). That the text supports two readings is
  itself the defect.

### 4.2 "A hook does not wire" versus the test's assembly half (blocks) [mine, building on whys-1, kinds-3, kinds-5]

- **The parts involved.**
  - `wiring-outside-hooks`: wiring happens only outside hooks (589-594).
  - `root-bindings-immutable`: a root binding that is not provably immutable is
    red (1090-1095).
  - `test-is-outside`: "the setup builds units" (1012).
  - Test isolation: "each test assembles its own instance" (1196-1198).
- **Where can a spec build its unit?**
  - At root: `const svc = createX(...)` is red under the root binding atom, and
    also contradicts 1196.
  - Inside a hook: that is an assembly call inside a hook, which is wiring in a
    hook. That part is not among the test exemptions.
  - Through a local test factory called from the body: still an assembly call
    inside a hook.
- **It blocks.** By the text, the assembly half of a test has no legal place to
  sit.
- **A related point.** Under the stock cut, every callback handed to claimed
  tech is a hook (558-560). So `describe` and `beforeEach` callbacks are hooks
  too, and a `test()` registered inside a `describe` is a registration made
  inside a hook.
- **Quorum.** No run states the whole dilemma. Parts of it are seen by:
  - whys-1: setup and assertion "are not separable regions";
  - kinds-3: "describe callbacks are themselves hooks under the stock cut";
  - kinds-5: tests do not carry the wiring/hook split "because each test builds
    inside its hook".
- **Resolution implied.** The positional split ("use-case calls only in hooks,
  wiring only outside") is a driver part that the test kind must not select.
  Only 3 runs make it an atom at all.

### 4.3 Importer gates that leave out the test (blocks)

- **The assembly gate.** `assembly-driver-only` says "only by drivers and other
  assemblies" (482-485, 1037-1039). But a shared test factory is "an assembly
  function in an assembly file", and its "only caller it may have" is a test
  (1214-1217, also 505-508). The spec that imports it is red by the text.
- **The driver gate.** `driver-not-imported` says "nothing but a boot or another
  driver" (640-641, 1066-1068). But a spec file calls a shared
  `registerMatchers(expect)` (633-634, 1020-1021, 1218). That spec is red by the
  text too.
- **Two more statements disagree.** The composition rule says "only assembly"
  (270-272). The matrix's test row says the test imports "anything" (873).
- **The shared part.** One atom per target kind, "who may import kind K", with a
  list of allowed importers. The test belongs on those lists as a member, not as
  an exception.
- **Quorum.**
  - 16/24 (7/4/5) put the test in the assembly importer list in the atom itself.
  - 9/24 (3/2/4) put it in the driver importer list.
  - Most of the others flag the gap in remainders.
  - The returns clause "adapters only when called by a test" makes one atom
    depend on who imports the file. rules-1, rules-3, kinds-2 and others recast
    it as a gate on importers.

### 4.4 `closed-definitions`, switched off for the test (blocks; this is the helper venue)

- **Where canon states it.** The same check is written with four lists: 278-279,
  443-446, 479-481 (assembly), 623-628 (driver), 712 (boot). For tests, 1016
  says the opposite: "defines anything".
- **A wording clash.** Canon says the outside kinds "define nothing" (184, 278).
  It also says a driver's "only definitions are its hooks and one wiring
  function" (623). The definition of "definition" at 443-446 excludes exactly
  the things it names.
- **Quorum.** 24/24 list this as a shared part, and 15/24 (6/3/6) give the test
  its own closed list.
- **It blocks.** The test needs the atom with a list of its own. "Anything" is
  the place where a loop can hide in a helper.

### 4.5 `stable-root`: one molecule, and its exemptions live in four places

- **The parts.** Immutable bindings, no stored machine read, no effecting root
  call, no effecting root statement. The evidence that this is a molecule:
  config `mutableModuleState` "lifts the bindings and nothing else" (1107-1110).
- **Where it is restated.**
  - Model (295-298).
  - Service (341).
  - Assembly (480-481, 1036). The assembly version is stricter ("nothing at root
    but imports") and collides with assembly functions sitting at root.
  - Test (1014-1015).
  - Test isolation (1196-1198).
- **The four homes of its exemptions** (the boot's call and a spec's
  registration calls):
  - the closed list in stable-root itself (1125-1128);
  - the reader declaring a call effect-free (1113-1116);
  - the reader's "exemption stated with its reason", whose example is "a test
    runner's registration" (559-562);
  - the parenthesis in `test-is-outside` (1014-1015).
- **Quorum on the boot.** 18/24 (8/6/4) give the boot its own root atom
  (`boot-calls-once` replaces `root-no-effect`, so there is no exception). 5
  keep the kind exemption (whys-6, whys-7, kinds-6, kinds-7, kinds-8). kinds-3
  is ambiguous.
- **Quorum on the test.** 11 use a replacement atom, 10 a reader declaration, 2
  keep the exemption, and 1 (kinds-3) has no root-call atom for tests.
- **Does it block?** The binding part does not. The exemption list is an
  "except" inside the rule; the replacement route removes it. The two routes
  (replacement atom versus reader declaration) are about evenly split, so this
  is the authors' ruling.

### 4.6 `driver-calls-services`: a bundle whose test exemption has no edge (blocks for tests)

- **The parts** (616-622): calls services ("services-only"); may also call
  assembly, sub-driver wiring and its own tech; never an adapter; never a model;
  an unclaimed name is red; a pure library is red. Its callee sets are also
  stated in `wiring-outside-hooks` (589-594) and `hook-one-call` (595-599).
- **The problem.** The test is exempted from "services-only" (1017). Canon does
  not say which of the other parts go with it.
- **Quorum.** rules-6 and whys-8 keep `tech-claimed` on tests (an unclaimed
  `node:fs` in a spec is red, so fixtures must become adapters); the other 22
  drop it. 16/24 say the slug adds no atom of its own; rules-1 additionally
  points out that its "its own tech" contradicts `hook-one-call`'s "nothing
  else".

### 4.7 The argument list and the result's allowed uses

- **Arguments.** The same list (literal, tech value, instance) appears at
  441-443, 458-463, 589-591, 599-604, 630-633, 711, with different read rights:
  - assembly and wiring may read a field of a tech value (441-442);
  - a hook reads nothing (601-602);
  - a boot passes no argument (711).

  24/24 flag this. 23 resolve it as one base atom plus a stricter hook atom.

- **The result.** What may be done with a call's result also differs:
  - assembly: pass it on or return it (454-457, 513-519);
  - hook: return it or drop it, never hand it on (602-605);
  - sub-driver: never pass it a use-case result (636-637).

  18/24 (5/6/7) flag this. The cut splits: 10 runs make a separate hook atom, 14
  keep one atom with a per-kind list of allowed uses.

- **When this blocks.** As one undivided part, a kind that needs the assembly's
  allowed uses but not the hook's (or, like the test, neither) gets an
  exception.

### 4.8 Ambient read versus root machine read

- **The overlap.** One check (a machine name is read), two scopes, two whys:
  - `ambient-access`: model and service, anywhere in the file (944-952);
  - `stable-root`: every kind, at root (1095-1101).
- **Quorum.** 22/24 flag it.
- **Does it block?** Adapters and drivers need the root half without the
  anywhere half, so these must stay two atoms. All 24 already keep them apart.
  Today, `export const PORT = process.env…` in a model or service is red twice.

### 4.9 Whether type imports count, restated rule by rule

- **Where.** 291, 875-883, 959-961, 971-977, 995-997, 999-1001, 1037-1039,
  1066-1067. 23/24 flag the scattering.
- **Concrete clashes.**
  - 881-883 says "a driver or an assembly may type-import from any layer".
    `blob-quarantine` says "type-only imports included" (959-961). kinds-6
    catches this.
  - Model takes "no ports" (291), but a type import is "legal anywhere" (974).
    So it is undecided whether a model may type-import a port.
- **Resolution in the runs.** A type-edge flag on each import atom, stated once.

### 4.10 `inward-deps` "lateral OK" versus `unit-assembly-only`

Two rules give opposite answers for service-to-service and adapter-to-adapter
imports. 14/24 (7/2/5) flag it.

### 4.11 The matrix's test row versus the graph atoms

The test row says "imports anything / imported by nothing" (264-265, 873, 1016).
Against it:

- `private-sealed` (993-997);
- `no-service-cycle`, which counts test edges (909-912);
- "nothing imports a boot" (1074).

20/24 carry `private-sealed` on tests anyway; 4 leave it open (rules-1, rules-8,
kinds-3, kinds-5).

### 4.12 Fractal assembly inside a composition unit (the same shape as the test venue)

- **The parts.** A unit's factory is "the composition root for its internal
  hexagons" (159-167). `public-unit` leaves `private/` composition unrestricted
  (978-981). No assembly atom reaches that factory.
- **Quorum.** 11/24 (5/2/4) flag it. kinds-5 names the parallel with the test
  file.
- **Does it block?** Not composition, but it is a laundering venue with the same
  structure as the test's "defines anything".

### 4.13 `no-default-deps`: "No exceptions" versus "right here"

Canon says "No exceptions" (381) and then calls defaults "right" for test
factories (1221-1223). The runs resolve it by scope: the atom binds
composition-unit factories, and a test factory is an assembly function. Once
scoped, it does not block. Runs disagree on the scope: service factories only
(whys-1, whys-4, whys-6) or composition units in general (the rest).

### 4.14 Harmless duplication

These overlaps repeat parts but do not block composition:

- The twin composition slugs: 24/24 merge them into one atom.
- The four outside-importer slugs.
- The callee sets in `driver-calls-services` (16/24).
- `chain-purity` (24/24 derived).

---

## 5. The test kind

### Selection by atom count

**Carried by the test:**

| Atom                                                                                   | Support |
| -------------------------------------------------------------------------------------- | ------- |
| `reader-bound`                                                                         | 24      |
| `outside-importers` as target (nothing imports a test)                                 | 24      |
| `root-bindings-immutable`                                                              | 24      |
| `scenario-straight-line` (every run marks it implied)                                  | 24      |
| A root-call atom of some kind: replacement 11, reader declaration 10, kind exemption 2 | 23      |
| `root-no-machine-read` (rules-2 and kinds-6 leave it open; whys-6 does not carry it)   | 21      |
| `private-sealed`                                                                       | 20      |

The graph atoms (cycles, `layer-in-path`) are carried in most runs.

**Not carried, close to unanimous:** `inward-imports`, `no-concrete-import`, the
unit and blob gates as importer (the test is a listed importer, not an
exception), `hook-one-call` (count), callee-is-a-use-case, `hook-args-received`,
`hook-result-unused`, the assembly verb atoms on the test body,
`driver-no-model`, `no-default-deps`, `driver-wiring-closed`. The shared
reasoning: a test builds, calls many things and reads results, and nothing
imports it.

### Dissent

| Question                                   | Positions                                                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `no-ambient-access` on tests               | Carried by whys-8 and kinds-7; left open by rules-2, rules-7, whys-6; not carried by 19. Canon's "determinism" (1193-1194) is never made a rule. |
| `tech-claimed` on tests                    | Carried by rules-6 and whys-8 only.                                                                                                              |
| `test-owns-instance` as its own atom       | 4 runs.                                                                                                                                          |
| `no-prod-config`                           | 3 runs.                                                                                                                                          |
| Assembly atoms on setup functions, by role | rules-1, rules-8, whys-5, kinds-1, kinds-5, kinds-8.                                                                                             |
| `.e2e`                                     | 19/24 flag the contradiction: listed as a test kind (263, 567), then "neither, outside the graph" (1022-1023).                                   |

### Why the selection is not "assembly plus driver"

- The test takes the union of the two kinds' import rights and none of their
  verb lists.
- Canon's own law says the opposite: "the widest import rights carry the
  narrowest verb lists" (234-236). whys-3 and whys-6 make this point.
- 232-234 says a combination the rules forbid "is not made legal by sharing a
  folder; it splits into units instead". kinds-3 cites it. **[mine]** It is the
  strongest argument inside canon for the authors' thesis: "assembly and driver
  in one" is exactly such a combination, held in one file.

### The helper question

**Answer.** 24/24 say yes, the straight-line constraint must reach local
helpers. None accepts "no". Caveat: rixo's elimination of "no" was in the
prompt, so this is not independent evidence (§6).

**How the constraint reaches the helpers:**

| Mechanism                                                                    | Support    | Runs                                                                                                  |
| ---------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| Every function defined in the test file, with no call-graph walk             | 12 (4/5/3) | rules-2, rules-5, rules-7, rules-8, whys-1, whys-2, whys-3, whys-4, whys-8, kinds-2, kinds-5, kinds-7 |
| What is reachable from test bodies through the file's own call graph         | 9 (3/2/4)  | rules-1, rules-3, rules-6, whys-6, whys-7, kinds-1, kinds-3, kinds-6, kinds-8                         |
| Classify every local definition by role (step, assembly function, and so on) | 2          | rules-4, whys-5                                                                                       |
| No local helpers at all; the test defines hooks and registrations only       | 1          | kinds-4 (with a reachability fallback)                                                                |

**Two parts nearly everyone shares:**

- 24/24: a helper that needs a branch or loop leaves the file and becomes what
  it is. A data builder becomes a model, a fake an adapter, a test factory an
  assembly function, a matcher a driver. This extends canon's "shared test code
  is placed by what it is" (1017-1021) from shared code to local code.
- 15/24 (6/3/6): "defines anything" becomes an explicit closed list.

**The strongest structure supported by the quorum:**

1. **Scope the atom by where a function is defined, not by what calls it.** The
   case against a call-graph walk: it misses callbacks, aliases and functions
   passed as values (rules-8, whys-2, whys-3). It also leaves inline fakes that
   are never reached from a body unjudged; rules-6 lists that as a residual
   hole, while rules-3 accepts it on the grounds that those fakes count as
   adapters. **[mine]** Nothing reads a local fake as an adapter inside a spec,
   so under a call-graph walk the fake is the venue. That is the deciding
   argument against it.
2. **Replace "defines anything" with a closed list for the test kind:** hooks,
   straight-line local functions, provably immutable data. Optionally add
   assembly-shaped test factories, which carry `assembly-calls-build` and
   `wiring-branch-only` (kinds-1, kinds-5, kinds-8). This uses the same
   mechanism that keeps drivers safe: no room for a local helper (623-628).
3. **The way out is placement, never an exemption.** Logic moves to a file whose
   kind rules it.
4. **Count other spellings of a loop as loops.** That means `.map`, `.forEach`
   and `.reduce` with callbacks, recursion, and loops or `test.each` tables at
   module root around registrations. Many runs raise this; canon calls
   "data-driven indirection" a defeat of review (1157-1158) but has no rule for
   it. The `test.each` case needs a ruling.

**Venues still open:**

- **Blob imported only by tests.** Canon says no shared test code is blob
  (1218-1219), but nothing checks it. A check is proposed by whys-4 and whys-7,
  and the hole is flagged by whys-1, kinds-1, kinds-2.
- **A loop inside an imported model data builder.** It is lawful in model;
  whether it hides the scenario is judgment (kinds-2, kinds-3, whys-8).
- **A shared "step" that fires a unit and returns its value** fits no kind. It
  is not an assembly (no use-case calls), not a driver (it cannot export a
  hook), not an adapter and not a model (rules-3, rules-4). **[mine]** That gap
  may be what canon wants (1155-1156: "visible in the test, not reconstructed
  from helpers"), but it should be ruled on purpose.

**The clearest problem statement in the sample** (one run's, rules-5, so
idiosyncratic but useful): when an atom is scoped to a position P inside a kind
K, and K lets code be defined outside P and called from P, then either the atom
follows the call or K's definition space is closed. Otherwise K's open
definitions are an exception to the atom. **[mine]** The statement covers three
cases with one test:

- drivers are safe (closed definitions);
- tests are not ("defines anything");
- composition-unit factories are not either (fractal assembly, §4.12).

---

## 6. Confidence

**What the counts can and cannot support.**

- Under independence, k/24 near the two-thirds line has a standard error of
  about 0.10, so about ±4.5 runs at 95%. Counts of 14 and 18 cannot be told
  apart, so everything in 14 to 18 should be read as one band. Only the extremes
  (20 or more, 4 or fewer) separate clearly.
- The runs are not independent. They share one model, one canon and one prompt
  template, and the prompt asked about the helper question and told the runs
  about the test's "about ten exemptions". So these agreements are primed, not
  discovered:
  - 24/24 rejecting "no";
  - 24/24 "test exemptions become a selection";
  - 24/24 test straight-line.
- The effective sample may be closer to the three framings than to 24 runs.
- A 24/24 means the part is reliably salient in canon _to this model_. It does
  not mean the part is an atom. Canon's own slugs bias recall: everything canon
  names gets found, and things canon does not name get low counts however
  important they are.

**Signs of framing sensitivity** (counts given as R/W/K):

| Atom                              | Split |
| --------------------------------- | ----- |
| `only-driver-listens`             | 3/7/4 |
| `root-wiring-nullary`             | 5/5/7 |
| `driver-no-model` as its own atom | 4/2/4 |
| Boot replacement atom             | 8/6/4 |
| `declared-load` as its own atom   | 6/7/4 |

For these, the count reflects the lens as much as canon.

**My clustering is a source of variance.** Treating merged atoms as "present"
raises counts. The dedicated counts are the stricter figure. A second counter
could move borderline cases by one or two: bare body, the boot cases in kinds-3
and kinds-7, and the root-machine-read status of rules-2 and kinds-6.

**What every run or nearly every run missed [mine]:**

1. **The assembly half of a test has no legal place to sit by the text** (§4.2).
   No run states it whole. whys-1, kinds-3 and kinds-5 each see one part.
2. **`describe` and `beforeEach` callbacks are hooks under the stock cut**
   (558-560). Only kinds-3 notices. The per-hook atoms then land on `describe`
   blocks too.
3. **The assertion call itself** (`expect(...)`) against "nothing else" (595,
   1051). No run names it.
4. **The test exemptions live in four places** (1016-1017, 1057, 559-562,
   1125-1128). kinds-2, kinds-3 and kinds-4 see parts of this; no run lists all
   four.
5. **Canon's own law against combined kinds** (232-236). It is the clearest
   support in the text for the atom thesis, and only a few runs use it (whys-3,
   whys-6, kinds-3).
6. **Graph membership by import** (575-580: "being imported" pulls a file in,
   not matching a glob). No run atomizes it. It is classification machinery, not
   a rule, so this miss is minor.
