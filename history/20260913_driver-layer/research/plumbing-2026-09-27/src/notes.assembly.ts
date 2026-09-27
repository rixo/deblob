import type { Output } from "./lib/cli/cli.port.ts"
import { createCli } from "./lib/cli/cli.service.ts"
import type { NoteStore } from "./lib/notes/notes.port.ts"
import { createNotes } from "./lib/notes/notes.service.ts"
import { createUi } from "./lib/ui/ui.service.ts"
import { createWeb } from "./lib/web/web.service.ts"

// The program's services, given its ports' adapters. Shared: the app and the
// gate differ by the adapters they hand in, never by the wiring.
export const createNotesAssembly = ({
  store,
  output,
  token,
}: {
  store: NoteStore
  output: Output
  token: string | undefined
}) => {
  const notes = createNotes({ store })
  return {
    notes,
    cli: createCli({ notes, output }),
    web: createWeb({ notes, token }),
    ui: createUi({ notes }),
  }
}
