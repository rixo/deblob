import { createConfig } from "./config/config.service.ts"
import { createNotes } from "./notes/notes.service.ts"

export const createNotesAssembly = async ({ cwd }: { cwd: string }) => {
  const settings = await createConfig({ cwd }).load()
  return { notes: createNotes(settings) }
}
