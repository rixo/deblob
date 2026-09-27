import type { Note } from "../notes.model.ts"
import type { NoteStore } from "../notes.port.ts"

export const createMemoryStore = (): NoteStore => {
  const notes: Note[] = []
  return {
    save: async (note) => void notes.push(note),
    all: async () => [...notes],
    clear: async () => void notes.splice(0),
  }
}
