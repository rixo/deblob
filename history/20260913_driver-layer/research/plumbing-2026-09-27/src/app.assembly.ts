import { createStdout } from "./lib/cli/adapters/stdout.adapter.ts"
import { createMemoryStore } from "./lib/notes/adapters/memory.adapter.ts"
import { createNotesAssembly } from "./notes.assembly.ts"

// The real adapters.
export const createAppAssembly = ({ token }: { token: string | undefined }) =>
  createNotesAssembly({
    store: createMemoryStore(),
    output: createStdout(),
    token,
  })
