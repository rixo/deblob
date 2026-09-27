import { isNotesError } from "../notes/notes.model.ts"
import type { Notes } from "../notes/notes.service.ts"
import type { Output } from "./cli.port.ts"

// The front service: takes cac's event as cac hands it, translates, renders,
// reports expected failures. A plain service — it imports nothing from cac.
export const createCli = ({
  notes,
  output,
}: {
  notes: Notes
  output: Output
}) => ({
  add: async (text: string, opts: { pin?: boolean }) => {
    try {
      const note = await notes.add({ text, pinned: opts.pin === true })
      output.write(`added #${note.id}`)
    } catch (error) {
      if (!isNotesError(error)) throw error
      output.fail(`error: ${error.code}`)
    }
  },
  list: async (opts: { pinned?: boolean }) => {
    for (const note of await notes.list({ pinnedOnly: opts.pinned === true })) {
      output.write(`#${note.id} ${note.pinned ? "* " : ""}${note.text}`)
    }
  },
})

export type Cli = ReturnType<typeof createCli>
