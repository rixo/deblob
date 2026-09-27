# Plumbing — (A) tried for real, 2026-09-26/27

A worked example built during the lens step's stamp review, to settle what a
hook may do with the tech's event. It backs the ruling in
`04_outside-rules/04_lens/SPEC.md` § "Ruled 2026-09-27: a hook hands the event
on, untouched — (A)"; the SPEC carries the argument, this file the notes and the
code. Research material: nothing here is canon or ruled beyond that section.

Run it: `pnpm install && npx vitest run` (the folder's own `pnpm-workspace.yaml`
keeps it out of the repo's workspace), and the check with
`node ../../../../packages/deblob/src/drivers/cli/bin.ts check`. The folder was
built in `tmp/` and copied here without `node_modules`.

## What (A) means here

A hook makes one use-case call and hands the tech's event on untouched. What
reads, translates, renders or reports lives in a front service; what the tech
needs back goes through a port or through state the front service owns.

## Map

```
src/lib/notes/            the shared service — agnostic: add, list, purge; async store port
src/lib/cli/              the CLI front: commands.driver.ts (hooks), cli.service.ts (front
                          service), cli.port.ts (Output: write, fail) + stdout / recording adapters
src/lib/web/              the web front: routes.driver.ts (express.json(), auth middleware, routes),
                          web.service.ts (front service: authorize, translate, 400 on expected errors)
src/lib/ui/               the UI front: NotesApp.svelte (the component — hooks only),
                          ui.service.ts (front service; owns the view state, exposed as a store)
src/notes.assembly.ts     the shared wiring, given the ports' adapters
src/app.assembly.ts       the real adapters
src/{cli,web,ui}.driver.ts  root drivers: assembly, tech, registration, parse / listen / mount
src/gate/gate.ts          defineGate — rows × fronts, declines, dead use cases; knows nothing of notes
src/gate/gate.assembly.ts the shared wiring with test adapters
src/gate/fronts.ts        identity, cli, web, ui fronts — one entry per use case each
src/gate/notes.gate.spec.ts  the agnostic rows
src/gate/web.front.spec.ts   the web front's own rows (authorization)
```

## How it went

1. CLI only, synchronous. Hooks `(text, opts) => cli.add(text, opts)`; the gate
   builds a fresh cac, calls the driver's `registerCommands`, parses real argv.
2. The sub-driver moved into `lib/cli/`, next to its front service: canon's
   folder axis is silent on drivers, the check accepts it.
3. Async store; a bare `node:http` web front; the assembly split so the gate
   reuses the app's wiring (`createNotesAssembly(adapters)`); the generic
   `defineGate` out of the spec, which now holds rows only.
4. Hardened: express with `express.json()` and an auth middleware (a hook like
   any other: `(req, res, next) => web.authorize(req, res, next)`); expected
   errors (`NotesError`, `code`, in the model) reported by each front service;
   front-owned rows for authorization.
5. Svelte 5 in happy-dom: the component is the driver; a handler's return goes
   nowhere, so what the screen shows is state the front service owns (`ui.view`,
   Svelte's store contract, plain `subscribe`, nothing imported from svelte).
   MVVM, arrived at from the rule.

## Things learned on the way

- **Glue exists everywhere** — the marker DSL is glue too. The argument is how
  much, and whether the real tech sits inside it: a front's table writes what a
  user types, the tech produces the event, the driver's own declarations check
  the table.
- **The front service appears under (A) and (B) alike**, whenever the event
  diverges or the tech wants an effect on it (`preventDefault`). It is optional
  (cac's options often match the use case) and needs no naming convention: the
  map finds it by the hook's call.
- **Declining beats a test driver layer per tech.** A front with no entry for a
  use case declines it; identity runs everything for coverage; a use case only
  identity reaches is dead.
- **Front-owned rows are a category**: auth, exact rendering,
  `defaultPrevented`. They close the output inverse — the agnostic rows check
  meaning.
- **By standpoint, a front service and its driver are the front's program in
  small.** Vocabulary decides what is the front's (DOM, argv, HTTP) and what is
  the core's (the same on every front). The hook rule guards the tech edge; the
  core's edge is service-to-service, guarded by the gate. The two gates overlap
  on the front service: no hole at the seam, and a row passing on identity but
  not on a front (or the reverse) flags core logic living in a front.
- **What overlap does not close**: holes every gate shares — the tech's
  emulation (happy-dom) and `main`'s wiring. Every mutation that passed both
  nets was one of those.

## Mistakes caught

- The check, fairly, three times: a gate assembly destructuring what it built
  (`assembly-builds-only`); `defineGate` called at a spec's module root
  (`stable-root`); `process.env.NOTES_TOKEN ?? ""` in `main` (a decision in the
  wiring — the raw value goes through, the service decides).
- rixo: view state first sat behind a port with a store adapter (copied from the
  CLI's `Output`), and the assembly had to return the adapter. View state is not
  I/O; canon already says state lives in the factory closure. A service owns it.
- Undeclared tech: express missing from `driverTech` made the reader call
  `app.post` "the language", with a pile of misleading messages.
- happy-dom replaces the global `fetch`; its same-origin policy broke the web
  front. Turned off in `vitest.config.ts` — the web front now goes through
  happy-dom's fetch, not Node's.

## Calibration

A toy: one entity, three use cases, 28 tests, mutations hand-picked by the agent
who built it. It settles the shape of the driver side and the gate pattern at
that size; it does not settle scale, rows needing a failing adapter, real
persistence, what rules hold inside a front's program, or a real browser.
Retrofit has its own evidence (deblob on itself, the dogfood codebase); the open
question there is what we retrofit to and what it buys, not whether it works.
