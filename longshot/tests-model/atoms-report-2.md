# Atom quorum: 24 decompositions of canon, scored

Sources: canon at `/home/rixo/projects/deblob.longshot/docs/architecture.md` (I
read all 1473 lines) and 24 decompositions. There are 8 per framing: rules-first
(R), whys-first (W) and kinds-first (K). Per-framing support is written R·W·K,
each out of 8.

## How to read this

- **Clustering.** I grouped atoms by meaning, not by name. A run supports a
  cluster when its atom list holds that meaning, either as its own atom or
  folded into a broader one. When the two numbers differ I also give the
  **standalone** count, because how the runs cut a part is itself information.
- **Thresholds.**
  - Stable: at least 16 of 24.
  - Contested: 8 to 15.
  - Idiosyncratic: 7 or fewer.
- **Precision.** Counts taken from atom lists are exact. Counts taken from the
  runs' `remainder` and `sharedParts` prose are softer (±1 to 2) and are marked
  "about".
- **"[mine]"** marks what I added. That covers anything I checked in canon or in
  code myself, and every synthesis that is not a count.

## The short version

1. **Agreement at the atom level is near total.** About 38 meanings are stable,
   and most of them are 24/24. What varies is how a part is cut (one atom or
   two) and which kind carries it.
2. **No run needed an "except" once atoms were separate.** In all 24 runs, the
   test kind's exemptions are atoms that the kind simply does not select.
3. **The death seeds are concrete [mine, built from counted atoms].** The
   assembly bundle and the driver bundle contain the same six parts with
   opposite settings: the definition list, the call set, argument reads, result
   sinks, control flow and root calls. A file that is "both" gets each part
   twice and incompatibly. Canon resolves each one by dropping the part for
   tests. That is where the exemption list comes from (§4.1).
4. **The keystone is `closed-definitions`.** It is bundled into three rules and
   missing for tests ("defines anything"). It is also the precondition that
   makes any atom scoped to a body (no loop in a test) impossible to launder.
   All 24 runs list it as shared, and 14 propose that tests get their own closed
   list.
5. **A second "two kinds in one file" bundle exists: the fractal composition
   root (canon 159-167).** A service or adapter factory does assembly work and
   carries no assembly atom. 12 of 24 runs found it on their own.
6. **Helper question.** All 24 runs say the constraint must reach helpers; none
   answers "no". They split on structure: 12 apply it to every function defined
   in the file, 9 to every function reachable from a hook, and 3 classify each
   function by role.
7. **Statistics.** These are 24 correlated runs of one model on one prompt.
   Unanimity means canon reads one way to this reader; it is not independent
   confirmation. The useful signal is where runs split, because that is where
   canon underdetermines. The framing differences are hints only (best two-sided
   Fisher p ≈ 0.12).

---

## 1. Stable atoms

All of these are at least 20/24 by meaning. Order: the 24/24 group first,
grouped by family, then 23, then 20.

### 1a. Edges (imports)

| Atom                      | Statement                                                                                                                           | Why                                                                                                         | Support                                                                                                                    | Canon                              |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `inward-imports`          | A file imports no layer outward of its own (model < ports < service, adapters < assembly < drivers < boot).                         | The inside is built, tested and reasoned about without knowing the outside.                                 | 24 (8·8·8)                                                                                                                 | 222-224, 864-873, 929-932          |
| `no-concrete-import`      | Model, ports, service, assembly and boot import no platform or IO package.                                                          | Concrete code bypasses the ports, so the file cannot run without the machine.                               | 24 (8·8·8)                                                                                                                 | 288-291, 491-495, 884-886, 939-943 |
| `purity-declared`         | A third-party package counts as pure, as a container or as claimed tech only by declaration. Otherwise it is concrete or unclaimed. | Purity cannot be read from code, and presumed purity is a false guarantee.                                  | 24 by meaning. Standalone 12 (5·4·3); the other 12 fold it into `no-concrete-import` as that atom's lookup list.           | 80-86, 308-311, 492-493, 942-943   |
| `no-ambient-access`       | Model and service read or call no ambient global (env, clock, randomness, console, timers, globalThis), anywhere.                   | Code that reaches the machine cannot be tested without setting the machine up.                              | 24 (8·8·8). Most extend it to assembly and boot, by implication from 254, 449-450 and 712-713.                             | 292-294, 342-344, 944-952          |
| `unit-assembly-only`      | A public `.service`/`.adapter` file is runtime-imported only by assembly.                                                           | Dependencies are resolved in one place.                                                                     | 24 (8·8·8)                                                                                                                 | 270-272, 965-981                   |
| `blob-importers-only`     | Blob is imported only by assembly, test and blob, type imports included.                                                            | Blob has no guarantees, so importing it contaminates the importer.                                          | 24 (8·8·8)                                                                                                                 | 268, 370-372, 892-895, 953-961     |
| `assembly-importers-only` | An assembly is imported only by drivers and assemblies, type imports included.                                                      | An assembly has no contract to depend on.                                                                   | 24 (8·8·8)                                                                                                                 | 482-485, 878-881, 1037-1039        |
| `driver-importers-only`   | A driver is imported only by a boot or a driver, type imports included.                                                             | Drivers are started, never depended on; otherwise a hook could chain calls through indirection.             | 24 (8·8·8)                                                                                                                 | 541-543, 640-641, 1066-1068        |
| `entry-not-imported`      | Nothing imports a boot or a test file.                                                                                              | The runtime or the runner loads entries; an import would run them or couple to them.                        | 24 (8·8·8)                                                                                                                 | 263-265, 712-714, 1017, 1072-1074  |
| `private-sealed`          | Nothing outside a service imports its `private/`, type imports included.                                                            | Visibility is ownership.                                                                                    | 24 (8·8·8)                                                                                                                 | 779-788, 803-806, 993-997          |
| `no-service-cycle`        | Service packages form a directed acyclic graph (DAG), every import kind counted.                                                    | A service in a cycle cannot be extracted or reasoned about alone.                                           | 24 (8·8·8)                                                                                                                 | 817-826, 901-912, 998-1001         |
| `no-runtime-cycle`        | Runtime imports between modules form no cycle.                                                                                      | Circular ESM imports fail silently in production.                                                           | 24 (8·8·8)                                                                                                                 | 914-918, 1002-1004                 |
| `layer-in-path`           | An import names the layer file itself, with no index or barrel file in between.                                                     | The layer must be visible at the import site, or no layer rule can be checked.                              | 24 (8·8·8)                                                                                                                 | 759-777, 933-934                   |
| `port-types-only`         | A port file holds only types.                                                                                                       | A contract has nothing to run; runtime code in a port is an adapter not yet extracted.                      | 24 (8·8·8)                                                                                                                 | 136-137, 243-244, 982-984          |
| `port-edges-typed`        | Every edge into or out of a port file is `import type`.                                                                             | A runtime edge on a type-only file is always a re-export, a side-effect import or a missing `type` keyword. | 24 by meaning. Split from `port-types-only` in 16 runs (6·3·7), merged in 8.                                               | 984-987                            |
| `adapter-implements-port` | An adapter's factory conforms to a port it type-imports.                                                                            | Adapters are replaceable only through the one interface.                                                    | 24 (8·8·8). 20 mark it implied, because no slug states it. Most can check it only partly (it needs the TypeScript engine). | 130-134, 141-147, 250-251, 368-369 |

**Importer gates, counted as one shape [mine].** 8 runs fold
`assembly-importers-only`, `driver-importers-only` and `entry-not-imported` into
a single "who may import me" table (1·5·2). Another 2 merge the driver and entry
gates only.

### 1b. Module root

| Atom                      | Statement                                                                                                                                                           | Why                                                                       | Support                                                                                  | Canon                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------- |
| `root-bindings-immutable` | Every module-root binding is provably immutable from its syntax.                                                                                                    | Each test that imports the module gets the same module.                   | 24 (8·8·8)                                                                               | 295-298, 341, 1090-1096, 1105-1110 |
| `root-no-machine-read`    | No root binding stores a value read from the tech, the clock or randomness.                                                                                         | The file could not be tested under another environment without reloading. | 24 (8·8·8)                                                                               | 1093-1105                          |
| `root-no-effect`          | Evaluating the root performs no effectful call (tech, unclaimed name, use case, local function of an effect layer) and no assignment or delete. A throw is allowed. | Loading a module must not act.                                            | 24 by meaning. 11 split the call half from the statement half (3·4·4); 13 keep one atom. | 1110-1129                          |

### 1c. Outside kinds: shared verbs

| Atom                 | Statement                                                                                                                        | Why                                                                  | Support                                                                                                                        | Canon                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| `closed-definitions` | A file defines only what its kind names: assembly functions; hooks plus at most one wiring function; nothing for a boot.         | A definition is where logic hides in a file with wide import rights. | 24 (8·8·8). One atom with a per-kind list in 23; rules-5 splits it into one atom per kind.                                     | 276-279, 443-447, 479-481, 623-628, 643-648, 710-713 |
| `args-not-computed`  | Call arguments in assembly, wiring and hooks are literals, tech values or instances, never derived.                              | A derived argument is the outside computing.                         | 24 (8·8·8)                                                                                                                     | 440-443, 458-463, 589-591, 600-602                   |
| `result-untouched`   | A call's result in an assembly or a hook is never read, computed with or branched on. A declared load's result is the exception. | The outside never looks into what it built or fired.                 | 24 by meaning. 17 use one atom with per-kind sinks (4·6·7), 7 split it. 5 of the 17 add a hook-only "never handed on" sibling. | 453-458, 510-519, 603-610, 1030-1035                 |

### 1d. Assembly

| Atom                    | Statement                                                                                                                              | Why                                                                    | Support                                                                        | Canon                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------- |
| `assembly-calls-build`  | Every call in an assembly is a factory call: composition unit, assembly, blob, or a model factory named by the flavor.                 | Assembly decides nothing but which factory to call.                    | 24 (8·8·8)                                                                     | 452-466, 510-519, 1028-1036            |
| `declared-load`         | An assembly calls a use case only if the project declares it as a load; the load's result counts as tech values.                       | Nothing in a call's shape tells a load from a use case run for effect. | 24 by meaning. Standalone 17 (6·7·4), folded into `assembly-calls-build` in 7. | 466-476, 1033-1035                     |
| `wiring-branch-only`    | A branch or loop in an assembly tests a parameter or loaded value against a literal or for truthiness, and its arms are factory calls. | A condition on an instance is a decision the map cannot show.          | 24 (8·8·8)                                                                     | 474-479, 1034-1036                     |
| `returns-services-only` | An assembly returns services and shared model instances, and adapters only if every caller is a test.                                  | Consumers type against service APIs.                                   | 24 (8·8·8). Split into two atoms by whys-1 and kinds-1.                        | 463-465, 505-508, 1033-1034, 1214-1217 |

### 1e. Driver

| Atom                                               | Statement                                                                                            | Why                                                                            | Support                                                                                                       | Canon                       |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `reader-bound`                                     | Every driver and test file is read by a reader bound to its tech.                                    | No driver rule can be judged without the reading.                              | 24 (8·8·8)                                                                                                    | 545-557, 584-588, 1044-1047 |
| `tech-claimed`                                     | A driver's tech is exactly what its bound readers claim; an unclaimed name or a pure library is red. | Tech is a claim, not a guess.                                                  | 24 by meaning. Standalone 18 (6·5·7).                                                                         | 80-86, 551-557, 616-622     |
| `driver-no-model`                                  | A driver imports and calls no model, pure libraries included.                                        | Parsing and rendering are use cases of a service.                              | 24 by meaning. Standalone 10 (4·2·4); the rest fold it into an import whitelist, a callee list or the matrix. | 616-622, 871                |
| `wiring-calls-closed`                              | Outside its hooks, a driver calls only assembly, claimed tech setup and sub-driver wiring.           | Wiring happens in one place; a hook does not wire.                             | 24 (21 standalone)                                                                                            | 589-594, 1048-1050          |
| `hook-call-count`                                  | A hook makes exactly one call, to a use case.                                                        | Two calls are a sequence nobody owns; zero is logic with no home.              | 24. Four runs split it into "at most one" and "at least one" (rules-8, whys-3, kinds-1, kinds-4).             | 595-599, 1051-1057          |
| `hook-args-whole`                                  | A hook hands on the event and host values whole and reads nothing off them.                          | Reading the event is translation, and translation is the facade service's job. | 24 (23 standalone)                                                                                            | 599-606, 1052-1054          |
| `straight-line-body`, hook scope ("unconditional") | No branch or loop around a hook's call.                                                              | Control flow is logic with no contract.                                        | 24 (18 standalone, 6·6·6; the other 6 fold it into a bare-body or branch-table atom)                          | 598-599, 606-609            |

### 1f. Boot

| Atom               | Statement                                                                      | Why                    | Support            | Canon                       |
| ------------------ | ------------------------------------------------------------------------------ | ---------------------- | ------------------ | --------------------------- |
| `boot-imports-one` | A boot imports exactly one driver and nothing else.                            | Starting is one arrow. | 24 (22 standalone) | 260-262, 710-713, 872       |
| `boot-calls-once`  | A boot's root is one call, with no arguments, to its driver's wiring function. | The boot only starts.  | 24 (8·8·8)         | 260-262, 710-713, 1072-1074 |

### 1g. Test scope

| Atom                             | Statement                              | Why                                                | Support                                                                                                                                                                     | Canon     |
| -------------------------------- | -------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `straight-line-body`, test scope | Test bodies contain no branch or loop. | A reviewer reads each test as given, when, expect. | 24. All implied (canon states only the reviewer judgment). 14 make it one atom with the hook scope, 10 make a separate test atom (3·3·4). Probably prompt-induced (see §6). | 1150-1161 |

### 1h. At 23/24 and 20/24

| Atom                    | Statement                                                                            | Why                                                                   | Support                                                                                         | Canon              |
| ----------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------ |
| `no-default-deps`       | A composition-unit factory gives its dependencies no default value.                  | A default puts a static import and assembly logic inside the service. | 23 (8·8·7; kinds-2 has no such atom)                                                            | 374-381            |
| `driver-exports-wiring` | A driver exports its wiring function and no hook.                                    | Importers can only let it attach callbacks.                           | 23 (8·7·8; whys-3 lacks it)                                                                     | 633-636            |
| `sub-driver-call-only`  | An imported driver is used only as the callee of its wiring function, during wiring. | Otherwise one hook chains two calls.                                  | 20 (7·6·7). rules-2, whys-4, whys-5 and kinds-7 spread it over callee and export atoms instead. | 629-639, 1063-1065 |

**Cuts that are themselves information.** These are places where every run
agrees on the meaning but splits on whether it is one atom:

- purity: atom or lookup parameter, 12/12
- port content and port edges: two atoms or one, 16/8
- root call and root statement: two atoms or one, 11/13
- result sinks: one atom or split, 17/7
- straight-line for hooks and for tests: one atom or two, 14/10

---

## 2. Contested and idiosyncratic atoms

### Contested (8 to 15)

| Atom                                                                                 | Support                           | What divides the runs                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------ | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wiring-no-params` (the root wiring function takes nothing, the boot passes nothing) | Meaning 24; standalone 15 (3·5·7) | Whether the callee side (`main()` takes nothing; a sub-driver takes tech and instances, 623-626) is an atom, or just the boot's empty call seen from the other file. About 9 runs flag it as one fact stated in two rules.                |
| `hook-body-bare` (a hook holds the call and its return, nothing else)                | 14 (6·4·4)                        | Whether "and nothing else" (595) adds anything beyond count, straight-line and result rules. The 10 that drop it say a log or assignment is already caught by `result-untouched` or `hook-call-count`.                                    |
| `only-driver-listens` (only a driver hands callbacks to claimed tech)                | 14 (3·7·4)                        | Whether it can be checked at all: telling inbound listening from an adapter's outbound call-with-callback needs a reader on non-driver files, and assembly and boot have none (510-512, 720-721). The absent runs call it non-mechanical. |
| Test root-call permission as its own atom (`root-registration-only`)                 | 11 (4·4·3)                        | 9 runs let the test reader declare registration calls effect-free instead (one mechanism, 1114-1116). 3 keep canon's kind exemption, and kinds-3 leaves it unresolved.                                                                    |
| `driver-callee-closed` (a driver never calls an adapter or a model, as its own atom) | 10 (1·5·4)                        | About 14 runs say `driver-calls-services` has no atom of its own: it is the union of `wiring-calls-closed`, the hook callee, `tech-claimed` and `driver-no-model`.                                                                        |

### Idiosyncratic (7 or fewer)

- **`driver-import-whitelist`**, 7 (3·1·3): the driver's imports as a positive
  list instead of the union of bans. It sits just below the contested line.
- **`no-adapter-branch`** (unified-port as an atom), 5 (2·3·0). The other 19
  call unified-port a hole: no structure marks "which adapter it got".
- **Binding agrees with flavor / kind from name**, 5 standalone (rules-1,
  rules-4, rules-8, whys-2, kinds-1). About 7 more fold it into `reader-bound`,
  and most call it a config check, not code structure.
- **Test instance isolation**, 4 (rules-5, rules-8, whys-3, whys-6). The rest
  derive it from `root-bindings-immutable`.
- **`no-prod-config`**, 3 (whys-6, kinds-4, kinds-8). All mark it as checkable
  only once production config is declared.
- **`unit-exports-factory`**, 3 (rules-7, whys-7, kinds-3).
- **Outside holds no tech, as an atom separate from `no-ambient-access`**, 2
  (kinds-3, kinds-6). Their reason is a different why: tech belongs to the
  driver, rather than testability.
- **`exemption-states-reason`**, 2 (rules-1, rules-4).
- **`test-through-contract` as an atom**, 2 (rules-1, whys-6).
- **Test support placed by kind / blob imported only by tests is red**, 2
  (whys-4, whys-7), plus whys-6's `local-helper-kinded`.
- **`one-wiring-function` as a count**, 2 (kinds-1, kinds-6).
- **One run each:** `container-declared` (rules-2), `chain-purity` (whys-2),
  `e2e-black-box` (whys-8), `unit-has-assembler` (rules-8), `tech-value-no-call`
  (kinds-5), `no-model-compute` (kinds-5), `test-assert-in-hook` (rules-8),
  `package-classified` (kinds-4).

The tail divides on one question each time. Is the sentence structure or
judgment (unified-port, test-through-contract)? Is it code or config (flavor
binding, declared lists)? Is it its own part or derived from another (instance
isolation, unit-exports-factory)?

---

## 3. Rules as molecules

| Slug                                             | Consensus decomposition (stable atoms)                                                                                                                                                                                                  | Where runs disagree                                                                                                                                                       | Remainder runs agree is not structure                                                                                                                                                                             |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `inward-deps`                                    | `inward-imports`                                                                                                                                                                                                                        | 13 runs (7·2·4) call "lateral OK" a contradiction with the service and adapter lateral bans; the rest call it a permission clause. Type-edge scope is unstated.           | "See matrix" defers; the matrix is derived.                                                                                                                                                                       |
| `layer-in-path`                                  | `layer-in-path`                                                                                                                                                                                                                         | What counts as a barrel beyond `index` (rules-1, rules-3); a barrel is blob anyway (rules-5).                                                                             | "Visible by shape" is the payoff, not a check.                                                                                                                                                                    |
| `chain-purity`                                   | No atom of its own (23/24). It is `inward-imports` + `no-concrete-import` + `blob-importers-only` + `purity-declared`, applied transitively.                                                                                            | whys-2 keeps it as a transitivity scope.                                                                                                                                  | Third-party transitive purity is an act of faith; "false guarantees" is the why.                                                                                                                                  |
| `service-purity`                                 | `no-concrete-import`, `purity-declared`                                                                                                                                                                                                 | Atom or lookup parameter (12/12).                                                                                                                                         | "Deterministic" and "untestable" are judgment and why.                                                                                                                                                            |
| `ambient-access`                                 | `no-ambient-access` (with `root-no-machine-read` overlapping at root)                                                                                                                                                                   | Whether assembly and boot carry it; kinds-3 and kinds-6 split off the outside half.                                                                                       | The global-name list is open-ended (config).                                                                                                                                                                      |
| `blob-quarantine`                                | `blob-importers-only`                                                                                                                                                                                                                   | —                                                                                                                                                                         | The rationales for the two allowed importers.                                                                                                                                                                     |
| `service-assembly-only`, `adapter-assembly-only` | `unit-assembly-only`: twins, one atom with two target kinds (24/24)                                                                                                                                                                     | —                                                                                                                                                                         | The "not by model, ports, …" lists restate other atoms.                                                                                                                                                           |
| `runtime-import`                                 | None: it is the type-only scope of `unit-assembly-only` (24/24)                                                                                                                                                                         | —                                                                                                                                                                         | The `SomeService["method"]` shorthand.                                                                                                                                                                            |
| `public-unit`                                    | None: it is the `private/` scope of `unit-assembly-only` (24/24)                                                                                                                                                                        | 12 runs flag the fractal-composition hole it opens (§4.4).                                                                                                                | —                                                                                                                                                                                                                 |
| `ports-types-only`                               | `port-types-only`, `port-edges-typed`                                                                                                                                                                                                   | One atom (8) or two (16).                                                                                                                                                 | "Adapter not yet extracted" is a diagnosis.                                                                                                                                                                       |
| `unified-port`                                   | No stable atom; the nearest checkable is `adapter-implements-port` (implied)                                                                                                                                                            | 5 runs make `no-adapter-branch` an atom that can be checked only partly.                                                                                                  | "Branches on which adapter it got" is a hole for 19.                                                                                                                                                              |
| `private-sealed`                                 | `private-sealed`                                                                                                                                                                                                                        | Several runs need a definition of the service boundary (808-815).                                                                                                         | —                                                                                                                                                                                                                 |
| `no-service-cycle`                               | `no-service-cycle`                                                                                                                                                                                                                      | —                                                                                                                                                                         | The direction law (817-826) is derived; the sharing progression is guidance.                                                                                                                                      |
| `no-runtime-cycle`                               | `no-runtime-cycle`                                                                                                                                                                                                                      | —                                                                                                                                                                         | —                                                                                                                                                                                                                 |
| `test-through-contract`                          | No atom of its own. The mechanical slice is `private-sealed` (most runs).                                                                                                                                                               | rules-1 and whys-6 make an atom.                                                                                                                                          | "Documented behavior", "implementation details" and the seam exceptions (a)/(b) at 1172-1175 are judgment.                                                                                                        |
| `test-is-outside`                                | `reader-bound`, `entry-not-imported`, `root-bindings-immutable`, `root-no-machine-read`, the root-statement half, a test root-call permission, `straight-line-body` (test scope, implied)                                               | Registration as an atom or as a reader declaration (11/9); e2e; `private-sealed`; a closed definition list for tests (§5).                                                | "Assembly and driver in one" is a label. "Imports anything", "defines anything" and "count and services-only do not apply" are atoms the kind does not carry. "Same isolation rules" for fixtures is unspecified. |
| `assembly-builds-only`                           | `assembly-calls-build`, `declared-load`, `args-not-computed`, `result-untouched`, `wiring-branch-only`, `returns-services-only`, `closed-definitions`, `root-no-effect`; plus `no-concrete-import` and `no-ambient-access` from 487-495 | `declared-load` standalone (17) or folded (7). "Nothing at root but imports" is entailed (most) or a literal collision with assembly functions defined at root (about 4). | "Decides nothing but which factory" is the why. "Shared instances flow down, never sideways" (497-500) is unchecked. `create*` is a flavor input.                                                                 |
| `assembly-driver-only`                           | `assembly-importers-only`                                                                                                                                                                                                               | The list omits tests (about 14 runs add them or flag it).                                                                                                                 | —                                                                                                                                                                                                                 |
| `driver-reader`                                  | `reader-bound`                                                                                                                                                                                                                          | Binding-flavor agreement as an atom (5) or a config check.                                                                                                                | "Counts as blob on purpose" is a declared escape; several runs call it a venue.                                                                                                                                   |
| `wiring-outside-hooks`                           | `wiring-calls-closed`, `args-not-computed`                                                                                                                                                                                              | —                                                                                                                                                                         | "Tech setup" means whatever readers claim. Branches in driver wiring are unruled (several runs).                                                                                                                  |
| `hook-one-call`                                  | `hook-call-count`, `straight-line-body` (hook), `hook-args-whole`, `result-untouched` (hook sinks), `args-not-computed`                                                                                                                 | `hook-body-bare` (14); the count split (4).                                                                                                                               | The facade diagnosis; the reader's cut; the view-model line (614-615) is open.                                                                                                                                    |
| `driver-calls-services`                          | No atom of its own for about 14 runs: a union of other atoms                                                                                                                                                                            | 10 keep a `driver-callee-closed` atom.                                                                                                                                    | "Parsing and rendering are use cases" is the why.                                                                                                                                                                 |
| `driver-hooks-only`                              | `closed-definitions` (+ `wiring-no-params`)                                                                                                                                                                                             | `wiring-no-params` standalone (15); `one-wiring-function` (2).                                                                                                            | "Residue" is a label.                                                                                                                                                                                             |
| `sub-driver-wiring`                              | `sub-driver-call-only`, `driver-exports-wiring`, `args-not-computed`                                                                                                                                                                    | 4 runs spread it over other atoms.                                                                                                                                        | A child mounted in markup is out of scope for this rule (it belongs to the reader).                                                                                                                               |
| `driver-not-imported`                            | `driver-importers-only`                                                                                                                                                                                                                 | Tests are omitted (a spec calls `registerMatchers`, 634).                                                                                                                 | —                                                                                                                                                                                                                 |
| `boot-one-call`                                  | `boot-imports-one`, `boot-calls-once`, `closed-definitions` (empty list), `entry-not-imported`                                                                                                                                          | —                                                                                                                                                                         | "One per entry point" is not checkable; "touches no tech" follows from the shape.                                                                                                                                 |
| `stable-root`                                    | `root-bindings-immutable`, `root-no-machine-read`, `root-no-effect`; the exemptions become per-kind root-call atoms                                                                                                                     | The test permission (11/9); whether it reaches blob (21 flag it).                                                                                                         | The open clause at 1088-1090 is judgment; the presumptions (a property read is free, `import.meta.url`) are rulings.                                                                                              |

Prose with no slug:

- Inversion of control (374-381) gives `no-default-deps` (23).
- "Only a driver listens" (535-543) gives `only-driver-listens` (14, contested).
- The adapter's port relation gives `adapter-implements-port` (24, implied in
  20).
- "Tests are written for the reviewer" (1150-1161) gives the test scope of
  `straight-line-body` (24, implied).
- Fractal assembly (159-167) is a hole (12 flag it).

---

## 4. Shared parts: the candidate death seeds

### 4.1 Two bundles, the same parts, opposite settings [mine, assembled from counted atoms]

| Part                                                                                   | In the assembly bundle                              | In the driver bundle                                                       | What the test kind gets                                   |
| -------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------- |
| Definition list (`closed-definitions`, 24/24)                                          | Only assembly functions (479-481)                   | Hooks plus at most one wiring function (623-628)                           | "Defines anything" (265, 1016)                            |
| Call set (`assembly-calls-build`, `hook-call-count`, `wiring-calls-closed`, all 24/24) | Factories and declared loads, no use case (452-473) | One use case per hook (595-599); wiring calls only outside hooks (589-594) | "Hook count and services-only do not apply" (1017)        |
| Argument reads (`args-not-computed` 24, `hook-args-whole` 23 standalone)               | A tech value's field may be read (441-442, 461-463) | A hook reads nothing (600-602)                                             | Nothing said                                              |
| Result sinks (`result-untouched`, 24)                                                  | Pass it on to a factory or return it (515-519)      | Return or drop it, never hand it on (603-605)                              | Nothing said; asserting means reading results             |
| Control flow (`wiring-branch-only`, `straight-line-body`, both 24)                     | Branch on parameters, factory arms (474-479)        | None: the call is unconditional (599)                                      | Nothing said; the reviewer prose implies none (1155-1158) |
| Root calls (`root-no-effect`, 24)                                                      | Nothing at root but imports (481)                   | None needed (1128-1129)                                                    | Registrations exempt by kind (1013-1015, 1127-1128)       |

How to read the table:

- **In every row the two copies disagree.** A file that is "assembly and driver
  in one" (263, 1011) gets both copies. Their intersection forbids what a test
  must do: call several things, build inputs, read results. Their union permits
  what neither kind permits.
- **Canon's fix is to drop the part for tests, row by row.** That is the
  exemption list: `test-is-outside` (1016-1017), `hook-one-call`'s "the test
  tech exempts the count" (1057), `stable-root`'s closed list (1127-1128),
  assembly's "adapters only when called by a test" (505-508), and defaults that
  are "right here" (1221-1223).
- **What a test actually needs is a third setting on most rows:**
  - definitions closed to its own list
  - calls, argument reads and results free
  - control flow none, as strict as a hook
  - registration as its only root call
- **Only the control-flow row matches a bundle**, and in `hook-one-call` it is
  glued to the call count. Taking "unconditional" therefore means taking the
  count, so canon exempted "the count" and went silent on the rest of the
  bundle. 11 runs (my count) flag this silence: rules-1, rules-3, whys-1,
  whys-2, whys-5, whys-6, whys-7, kinds-3, kinds-5, kinds-6, kinds-8. They read
  it two ways: either the other hook clauses still bind tests, which contradicts
  assertion, or they were lifted along with the no-branch part (whys-1,
  kinds-5).
- **Several runs state this in their own words.** whys-1 and whys-3 say "the
  test takes the union of import rights and none of the verb lists". rules-4,
  kinds-2 and kinds-6 say "opposite in sign", and kinds-3 says "a third kind".
  The table that assembles all six rows is mine.

**Why only the outside fails here [mine].** Canon has one bundling principle:
inside the hexagon, an outer file may host inner code and the file takes its
host's stricter constraints (274-276). It works because the inside kinds nest.
The outside verb lists do not nest: on argument reads, results and calls they
point opposite ways. So no host exists for a union of assembly and driver.

**Canon already states the anti-bundle rule [mine].** "The folder grants nothing
… a combination those rules forbid … splits into units instead" (232-234). The
test kind (263) and the fractal composition root (159-167) are the two places
canon breaks it. Only kinds-3 cites 232-234, and only for helpers.

### 4.2 The keystone: `closed-definitions`

- **Where it lives.** It is inside `assembly-builds-only` (479-481),
  `driver-hooks-only` (623-628, 1061-1062) and `boot-one-call` (712, 1074). It
  is stated in general at 276-279 and 643-648, and "definition" is defined at
  443-446. The test gets "defines anything" (1016).
- **Support.** All 24 runs list it as a shared part, and 23 make it one atom
  with a per-kind list.
- **Does it block?** Yes. The test needs its own list. Without one, every atom
  scoped to a body is bypassed one function down. That is the helper question
  (§5).
- **Fix proposed by 14 runs:** close the test kind's list (5·3·6).
- **Underweighted, 3 of 24 (whys-2, kinds-1, kinds-2).** "Definition" covers
  variables (443-446), so a local `const` inside an assembly function or inside
  `main()` is a definition that none of the lists name.
  - [mine, verified in code] The shipped CLI does exactly this.
    `packages/deblob/src/apps/cli/cli.driver.ts:13-14` binds `cli` and `router`
    inside `main()`, and `cli.assembly.ts:26` binds `fs`.
  - Read literally, the atom makes the shipped CLI red. It needs a stated depth,
    or the lists need to name local bindings of built instances.

### 4.3 `stable-root`'s root-call permission

- **Every run decomposes `stable-root`** into 3 or 4 atoms. Canon's own config
  already treats them as separate parts: `mutableModuleState: true` "lifts the
  bindings and nothing else" (1109-1110).
- **The permission to call at root differs by kind:**
  - none for most kinds
  - one start call for a boot
  - registration calls for a test
  - a legacy blob entry that canon calls green (654-658), although
    `stable-root`'s closed list (1126-1128) and its blob local-call clause
    (1110-1113) say otherwise. 21 runs flag this.
- **How the runs resolve it:**
  - Boot: 18/24 make it carry `boot-calls-once` in place of `root-no-effect`, a
    replacement atom rather than an exception (stable).
  - Test: a registration atom 11, a reader declaration 9, the kind exemption
    kept 3, unresolved 1.
- **Does it block?** Canon patched it with a closed list of exemptions, which is
  the "except" form. At least 6 runs (rules-2, rules-3, whys-1, whys-4, kinds-1,
  kinds-7) note that two mechanisms exempt the same call: the kind list
  (1126-1128) and the reader's effect-free declaration (1114-1116).
- **An ambiguity only whys-1 caught [mine: confirmed].** Does
  `mutableModuleState` also lift `root-no-machine-read`? A stored machine read
  is a binding, and 1109-1110 does not say.

### 4.4 The second bundle: the fractal composition root

- **The mechanism.** A composition unit's factory "doubles as the composition
  root for its internal hexagons" (159-167), and composition inside `private/`
  is "unrestricted" (`public-unit`, 978-981). So assembly work happens in a
  service or adapter file, where no assembly atom applies: not
  `assembly-calls-build`, `result-untouched`, `args-not-computed` or
  `wiring-branch-only`.
- **It has the same shape as the test kind:** a file that is two kinds, holding
  one kind's rights and neither kind's verb list.
- **Support:** 12 runs (5·2·5): rules-1, rules-2, rules-6, rules-7, rules-8,
  whys-5, whys-8, kinds-4, kinds-5, kinds-6, kinds-7, kinds-8.
- **Does it block?** Yes, in the authors' sense. The assembly part is needed by
  a kind that canon files as a composition unit, and because the assembly verbs
  are bundled into the assembly kind, the factory gets none of them.
- **No consensus on the fix.** The candidates are assembly atoms applied by
  role, or a private assembly file.

### 4.5 The importer lists omit tests

- **Where.** 270-272 ("only by assembly"), 482 ("only drivers and other
  assemblies") and 640 ("nothing but a boot or another driver") do not name
  tests. Canon's own text needs them as importers: test factories at 505-508 and
  1214-1217, and `registerMatchers` at 634 and 1020-1021.
- **Support.** About 14 runs add tests to these lists or flag the omission.
- **Does it block?** No, once tests are a listed importer. But the test kind has
  these rights only through the "assembly and driver" label, so removing the
  label means writing the lists out.

### 4.6 Confounded parts: one check with two whys, or one fact reported twice

1. **`no-ambient-access` and `root-no-machine-read`** (22/24 flag it).
   `export const PORT = process.env.PORT` in a model file is red twice: 944-952
   says "the same at module root", and 1093-1105 rules the stored read. They
   cannot be one atom, because adapters need only the root half. These are two
   atoms sharing one classifier (the list of machine names). Canon
   half-acknowledges this at 1122-1123 ("judged where it sits, by its layer").
2. **`straight-line-body`.** The hook's why is translation (606-613); the test's
   why is legibility (1155-1158). Runs split 14 one atom with two scopes, 10 two
   atoms.
3. **The scope of `no-ambient-access`.** The slug says model and service.
   Assembly and boot get it only through "holds no tech" (254, 449-450,
   712-713). kinds-3 and kinds-6 split off the outside half because the why
   differs.
4. **Package classification.** One mechanism, "a package's class is declared",
   is stated five times, with three declaration lists and three outcomes:
   - model's pure libraries (308-311) and `service-purity` (942-943)
   - assembly's declared container (492-495)
   - the driver's claimed tech (80-86, 619-622)
   - `stable-root`'s effect-free declaration (1114-1116)

   It is not blocking. The split is 12 atom, 12 parameter.

5. **Argument reads and result sinks.** The settings differ by kind (§4.1). This
   is resolved without blocking only by splitting off the strict hook part:
   `hook-args-whole` is standalone in 23 runs, and 5 add a hook-only "never
   handed on" sibling.

### 4.7 Redundant restatements (no blocking)

- `unit-assembly-only` is stated as two slugs by suffix, plus `runtime-import`
  and `public-unit` as scope parameters (24/24).
- `driver-calls-services` is a union of other atoms: about 14 runs say so, 10
  keep a callee atom.
- `chain-purity` is derived (23/24).
- The boot's empty call and `main()` taking nothing are one fact in two rules
  (about 9).
- The matrix states each forbidden edge from the importer's side, and the gates
  state it again from the target's side.
- "A hook does not wire" appears in three rules.
- Type-import scope is restated rule by rule. 23 runs list it as a per-atom
  parameter; whys-7 notes it in a remainder.

### 4.8 Wording contradictions the runs surfaced

| Contradiction                                                                                                 | Canon                               | Runs                                                 | Status                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `.e2e` is a test kind, yet end-to-end tests are "neither, outside the graph"                                  | 263, 567 vs 1022-1023               | 18                                                   | Open                                                                                                                                    |
| A legacy blob entry is "green", yet `stable-root`'s exemptions are a closed list and blob's local calls count | 654-658 vs 1110-1113, 1126-1128     | 21                                                   | Open                                                                                                                                    |
| Defaults: "No exceptions" vs "right here"                                                                     | 380-381 vs 1221-1223                | About 19                                             | Every run that resolves it does so the same way: the atom binds composition-unit factories, and a test factory is an assembly function  |
| Tests "import anything" vs `private-sealed` and test edges counting for cycles                                | 265, 873, 1016 vs 993-997, 909-912  | 14                                                   | [mine] 888-890 already scopes the matrix to layers, not packaging. The wording at 1016 should say "any layer"                           |
| "Lateral OK" vs the lateral bans for service and adapter                                                      | 224, 930 vs 965-970                 | 13                                                   | A permission clause inside a set of negative rules                                                                                      |
| Type imports "free … from any layer" for drivers and assemblies vs type imports counted against them          | 881-883 vs 959-961, 1066-1067, 1074 | About 4 (rules-7, rules-8, kinds-6, …)               | [mine, checked] A real conflict for an assembly type-importing a driver, a driver type-importing blob, and anyone type-importing a boot |
| "Nothing at module root but imports" vs assembly functions defined at root                                    | 481, 1036 vs 479-480                | About 4 call it a collision; most say it is entailed | Wording                                                                                                                                 |
| "Definition" includes variables vs local bindings in assembly and driver bodies                               | 443-446                             | 3                                                    | See §4.2                                                                                                                                |

**[mine] Every contradiction above sits on a positive clause.** Canon says its
hard rules "are negative" and "don't conflict with each other" (850-853). Yet
every row in the table is a positive grant inside that negative set: lateral OK,
imports anything, defines anything, defaults right here, adapters when the
caller is a test, private composition unrestricted, type imports free. All 24
runs reduce two of these (`runtime-import`, `public-unit`) to scope parameters
of an atom.

That suggests a line-by-line test for canon: a positive clause is either the
scope parameter of one atom, or the trace of a bundle.

---

## 5. The test kind

### Consensus selection

| Atom                                                                                                 | Carried by the test kind?                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reader-bound`                                                                                       | Yes, 24                                                                                                                                                                                   |
| `entry-not-imported` (test as target)                                                                | Yes, 24                                                                                                                                                                                   |
| `root-bindings-immutable`                                                                            | Yes, 24. Several note this is what makes "each test assembles its own instance" (1196-1198) structural.                                                                                   |
| `root-no-machine-read`                                                                               | Yes, 22. whys-6 omits it; kinds-6 leaves it open because `stable-root`'s why (an importer gets the same module) is moot for a file nothing imports, though the isolation why still holds. |
| Root statement half (no assignment or delete)                                                        | Yes, about 24                                                                                                                                                                             |
| Root-call permission                                                                                 | Registration atom 11 / reader declaration 9 / exemption 3 / unresolved 1                                                                                                                  |
| `straight-line-body` (test scope)                                                                    | Yes, 24, all implied                                                                                                                                                                      |
| `private-sealed`                                                                                     | Yes, 21. Left open by rules-8, kinds-3 and kinds-5.                                                                                                                                       |
| `no-service-cycle`, `no-runtime-cycle`, `layer-in-path`                                              | Yes, as universal atoms (909-912 counts test edges)                                                                                                                                       |
| `inward-imports`, `no-concrete-import`, and the import gates as limits on the test                   | No, 24 (the test is a listed importer, not a limited one)                                                                                                                                 |
| `hook-call-count`, `hook-args-whole`, `result-untouched`, `args-not-computed`, `wiring-calls-closed` | No, 24 (a test calls several things, builds inputs and reads results)                                                                                                                     |
| `no-default-deps`                                                                                    | No, 24                                                                                                                                                                                    |
| Assembly verb atoms                                                                                  | Not by the kind. 7 runs apply them to local setup functions by role (rules-1, rules-4, rules-8, whys-5, whys-6, kinds-1, kinds-5).                                                        |
| `closed-definitions`                                                                                 | Canon's "anything" kept by 10; 14 propose a closed list of the test's own                                                                                                                 |
| `no-ambient-access`                                                                                  | Recommended by 3 (rules-2 as a candidate, whys-8, kinds-7). All note that determinism (1193-1194) has no atom.                                                                            |

### Dissent

- **e2e** (18 flag it). Either it is its own kind with its own reader, or it
  leaves the test kind.
- **`private-sealed` vs "imports anything"** (14 flag it). This is likely
  settled by 888-890 (§4.8).
- **Is there a setup region for assembly atoms to apply to?**
  - whys-5 applies assembly atoms to non-hook functions by position.
  - whys-1 objects that 1196-1198 puts instance-building inside the hooks, so
    setup and assertion cannot be separated.
  - kinds-3 notes that the stock cut makes `describe`/`beforeEach` callbacks
    hooks (558-560).
  - [mine] These two points together mean a spec file has no setup region
    outside its hooks. The "setup half is assembly" of 1187-1189 is a role
    inside hook bodies, not a place in the file. Only whys-1 and kinds-3 saw
    this.

### The helper question

**Distribution.** All 24 runs say the constraint must reach helpers, and none
answers "no".

| Primary structure                                                                      | Runs | R·W·K |
| -------------------------------------------------------------------------------------- | ---- | ----- |
| Every function defined in the test file carries the atom (no call graph)               | 12   | 4·5·3 |
| Every file-local function reachable from a hook carries it                             | 9    | 3·2·4 |
| Every local function is classified by role (hook, assembly function, …); no third role | 3    | 1·1·1 |

Two further patterns:

- 14 runs also close the test kind's definition list.
- All 24 use canon's placement rule as the way out (1017-1021, 1217-1219): a
  helper that needs a loop leaves the file and becomes the kind it is. The runs
  extend that rule from shared helpers to local ones.

**The problem statement.** rules-5 wrote the general form:

> when an atom is scoped to a position P of a kind K, and K lets code be defined
> outside P and called from P, the atom must follow the call or the definition
> space must be closed; otherwise K's own "defines anything" is an exception to
> the atom.

Canon already closed this hole once, for drivers: a local `parseFoo` is residue
(627-628).

[mine] Sharpened: an atom scoped to a body is only as strong as its kind's
definition list. Asking whether the no-loop rule reaches helpers is asking
whether the test kind carries `closed-definitions`. A "no" would be the §4.2
death seed again.

**The strongest structure that avoids a laundering venue** (my synthesis of the
quorum):

1. **The test kind carries `closed-definitions` with its own list:** hooks,
   straight-line local functions, provably immutable data, and optionally
   assembly-shaped setup functions that carry the assembly atoms (14 runs).
2. **`straight-line-body` applies to every function defined in the test file**,
   not to a call closure (12 primary). The reachability runs' own caveats are
   the reason: callbacks, functions passed as values and aliases escape a call
   graph (rules-3, rules-8, whys-1, whys-2). A local loop that no hook ever
   reaches is dead code, so the stricter scope costs nothing.
3. **Loops written as calls count as loops:** iteration by callback (`forEach`,
   `map`, `reduce`, `test.each`) and recursion. The reader must name the list.
4. **Control flow around registrations at root** (loops, case tables) must be
   ruled explicitly. Canon's "data-driven indirection" at 1157-1158 leans red.
   rules-4, rules-8 and kinds-5 flag it.
5. **The exit is placement.** The loop moves to a kind that rules it: a model
   data builder, an adapter fake or launcher, an assembly test factory, or a
   driver registrar.
6. **Close the blob door.** A blob file imported only by tests is red (whys-4's
   atom; canon already says it in prose at 1218-1219). About 7 runs name blob as
   the remaining venue (rules-1, whys-1, whys-4, whys-5, whys-7, kinds-1,
   kinds-2).
7. **What stays judgment, and should be confessed as such:** a loop inside a
   legitimate model builder, or indirection through an imported helper that
   takes a table or a callback (kinds-6). Both stay reviewer judgment
   (1155-1159).

**Where `run()` (a helper that starts the CLI) goes, split three ways:**

- If it is a straight-line wrapper, it stays local (most runs).
- If it spawns and loops, it becomes an adapter (whys-7, kinds-2).
- It is a driver or end-to-end concern (rules-1, rules-6, kinds-1).
- kinds-5 adds that a `run()` that builds, fires and collects mixes two roles
  and must split.

---

## 6. Confidence

**What the counts measure.** Under independence:

| Count | 95% interval for the proportion (Wilson) |
| ----- | ---------------------------------------- |
| 24/24 | at least 0.86                            |
| 20/24 | 0.64 to 0.93                             |
| 16/24 | 0.47 to 0.82                             |
| 14/24 | 0.39 to 0.76                             |

Even under independence, then, the two-thirds line cannot be told apart from a
coin flip at 95%.

The runs are not independent: one model, one prompt, one text. The effective
number of samples is n / (1 + (n−1)ρ), which is about 4 at a modest correlation
of ρ = 0.2. So:

- **Unanimity** (most of §1) means canon states the atom plainly enough that
  this reader extracts it every time. A single careful reader would likely get
  it too. It is not 24 confirmations.
- **The signal is in the splits.** One-or-two-atom cuts, carriage choices and
  the contested atoms are where canon's text underdetermines. They are also
  where independent noticing shows: fractal composition (12), blob vs
  `stable-root` (21), e2e (18).
- **Framing effects are hints only.** The largest gaps are `wiring-no-params` (K
  7 vs R 3), the merged importer table (W 5 vs R 1) and `only-driver-listens` (W
  7 vs R 3). Each gives a two-sided Fisher p ≈ 0.12. no-adapter-branch (K 0 vs
  W 3) is weaker still, at about 0.2.

**Results that are probably prompt-induced.** Several runs echo the task's
wording ("laundering venue", "no except"). So these unanimous results reflect
the framing staying consistent, not independent evidence:

- the helper answer, 24 "yes"
- the no-branch rule for tests, 24 implied
- test selections written without "except"

**What the sample cannot settle:**

- whether two whys make two atoms (that is the authors' criterion)
- whether "nothing else" in `hook-one-call` is a part
- whether being checkable is a condition for being an atom
- the margins of my own clusters: a different cluster boundary would move the
  contested counts by a few

**What every run missed or underweighted [mine]:**

1. **232-234 is canon's own anti-bundle principle** ("splits into units
   instead"). Tests and the fractal root break it. Only kinds-3 cites it, and
   only for helpers.
2. **The inside bundles cleanly and the outside cannot** (274-276): inside kinds
   nest, outside verb lists are opposed. No run tied the "opposite in sign"
   point to this line.
3. **888-890 already scopes "imports anything" to layers.** No run cited it.
4. **A spec file has no setup region outside its hooks.** The stock cut
   (558-560) and 1196-1198 together put setup inside hooks. Only whys-1 and
   kinds-3 saw it.
5. **Code vs canon, verified in code, not a canon reading.**
   - The shipped root driver runtime-imports and calls a model factory
     (`createRouter` from `router.model.ts`,
     `packages/deblob/src/apps/cli/cli.driver.ts:3,14`). That is red under
     `driver-no-model` (24/24 by meaning; 616-622, 871), because a model cannot
     be claimed tech (621-622).
   - Either the code or the atom has a gap. This may be the "configLoads" bug
     your notes already owe to driver-layer, but I have not checked that.
6. **The CLI example prose lags the code.** The code hands `process` whole into
   the assembly (`cli.driver.ts:13`, `cli.assembly.ts:46-51`), which is
   consistent with 441-442. The canon example says the assembly is built "from a
   working directory and an environment" (664-666). That would need a call on a
   tech value in the wiring, which 441-442 does not allow.

**Decisions this hands back, not decided:**

1. Does the test kind get its own closed definition list, and what is on it?
2. Is `straight-line-body` one atom with two scopes, or two atoms with two whys?
3. Is the test root-call permission its own atom, or a reader declaration?
4. Does private composition inside a unit's factory carry assembly atoms?
5. Is e2e its own kind, or out of the test kind?
6. Does `stable-root` reach blob, and how is the legacy blob entry green?
7. How deep does "definition" reach (local bindings)?
8. Do you accept the double report from ambient access and root machine read, or
   subordinate one to the other?
9. Is `driver-calls-services` retired as a union?
