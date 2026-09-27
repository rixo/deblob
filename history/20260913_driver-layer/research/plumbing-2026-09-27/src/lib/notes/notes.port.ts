import type { Note } from "./notes.model.ts"

export type NoteStore = {
  save(note: Note): Promise<void>
  all(): Promise<readonly Note[]>
  clear(): Promise<void>
}
