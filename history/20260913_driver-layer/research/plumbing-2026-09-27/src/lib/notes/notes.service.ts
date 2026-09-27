import { type Note, NotesError } from "./notes.model.ts"
import type { NoteStore } from "./notes.port.ts"

// The shared service: agnostic, no front's vocabulary.
export const createNotes = ({ store }: { store: NoteStore }) => ({
  add: async ({
    text,
    pinned,
  }: {
    text: string
    pinned: boolean
  }): Promise<Note> => {
    if (text.trim() === "") throw new NotesError("empty-text")
    const note = { id: (await store.all()).length + 1, text, pinned }
    await store.save(note)
    return note
  },
  list: async ({
    pinnedOnly,
  }: {
    pinnedOnly: boolean
  }): Promise<readonly Note[]> =>
    (await store.all()).filter((note) => !pinnedOnly || note.pinned),
  purge: (): Promise<void> => store.clear(),
})

export type Notes = ReturnType<typeof createNotes>
