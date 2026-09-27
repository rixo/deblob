import { createRecordingOutput } from "../lib/cli/adapters/recording.adapter.ts"
import { createMemoryStore } from "../lib/notes/adapters/memory.adapter.ts"
import { createNotesAssembly } from "../notes.assembly.ts"

// The program's own wiring, test adapters handed in. Grows by one line per
// port, never by the services behind them.
export const createGateAssembly = ({
  token,
}: {
  token: string | undefined
}) => {
  const store = createMemoryStore()
  const output = createRecordingOutput()
  return { store, output, app: createNotesAssembly({ store, output, token }) }
}

export type Gate = ReturnType<typeof createGateAssembly>
