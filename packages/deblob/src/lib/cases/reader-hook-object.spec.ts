import { describe, expect, test } from "vitest"

import { assembleCase } from "./runner/cases.assembly.ts"
import { HOOK_OBJECT } from "./hook-object-reader.model.ts"
import type { Row } from "./runner/markers.model.ts"
import { AS_MARKED } from "./runner/markers.model.ts"

/**
 * A reader whose cut points at functions (the reader revealer,
 * `longshot/revealer/README.md`): a tech handed an object, whose methods it
 * calls — a bundler's plugin. The third pointer through the one addition, with
 * the callback (the reading's own cut) and the switch (`reader-cut.spec.ts`): a
 * hook is a function the reader points at, its parameters the event, as a
 * callback's are. canon: "a technology whose hooks are not handed callbacks …
 * needs a reader with a cut of its own".
 *
 * The driver rules do not change: a method is judged as a callback hook is.
 * Written red first, before a cut could point at a function; the reader is
 * `hook-object-reader.model.ts`.
 */

const CONFIG = { readers: { driver: [HOOK_OBJECT] } } as const

/** The bundler's package, the notes service and its assembly. */
const NOTES = {
  "node_modules/vite/package.json": JSON.stringify({
    name: "vite",
    main: "./index.js",
  }),
  "node_modules/vite/index.js": "module.exports = {}",
  "src/lib/notes/notes.service.ts": `
    export const createNotes = () => ({
      transform: async (code: unknown, id?: unknown) => (id ? code : null),
      flush: async (context?: unknown) => (context ? 1 : 0),
    })
  `,
  "src/notes.assembly.ts": `
    import { createNotes } from "./lib/notes/notes.service.ts"
    export const createNotesAssembly = () => ({ notes: createNotes() })
  `,
} as const

const IMPORTS = `
  import type { Plugin } from "vite"
  import { createNotesAssembly } from "./notes.assembly.ts"
`

const ROWS: readonly Row[] = [
  {
    // The thin plugin, and nothing else: every other row is this one with a
    // defect. Without the cut the methods are not read at all.
    name: "the thin plugin: wiring, then the object returned, one call per method, the event handed as received",
    config: CONFIG,
    files: {
      ...NOTES,
      "src/notes.driver.ts": `
        ${IMPORTS}
        export const notesPlugin = (): Plugin => {
          const { notes } = createNotesAssembly()
          return {
            name: "notes",
            transform(code, id) {
              return notes.transform(code, id)
            },
            buildEnd: () => notes.flush(),
          }
        }
      `,
    },
  },
  {
    // canon: `hook-one-call` — "Zero calls is a violation too"; "Two calls
    // mean the sequence between them is a use case nobody owns"; nothing read
    // off the event.
    name: "a method with no call, two calls, or handing a part of its event is red, as a callback hook is",
    config: CONFIG,
    files: {
      ...NOTES,
      "src/notes.driver.ts": `
        ${IMPORTS}
        export const notesPlugin = (): Plugin => {
          const { notes } = createNotesAssembly()
          return {
            name: "notes",
            buildStart() {}, // red: hook-one-call -- no call
            transform(code, id) { // red: hook-one-call -- two calls
              notes.flush()
              return notes.transform(code, id)
            },
            buildEnd: (context) => notes.flush(context.meta), // red: hook-one-call -- a part of the event handed
          }
        }
      `,
    },
  },
]

describe("reader hook object", () => {
  test.each(ROWS)("$name", async (row) => {
    const { judge } = assembleCase(row.files)
    const { expectedFailures, ...match } = await judge(row)
    if (expectedFailures.length > 0) console.info(expectedFailures.join("\n"))
    expect(match).toEqual(AS_MARKED)
  })
})
