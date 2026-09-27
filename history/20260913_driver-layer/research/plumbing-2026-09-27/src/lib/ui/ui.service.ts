import { isNotesError, type Note } from "../notes/notes.model.ts"
import type { Notes } from "../notes/notes.service.ts"

// What the DOM hands a hook, as far as this service reads it — structural.
type Field = { value: string; checked: boolean }
type Form = { elements: { namedItem(name: string): unknown }; reset(): void }
type Submit = { preventDefault(): void; currentTarget: Form }
type Toggle = { currentTarget: { checked: boolean } }

export type ViewState = {
  readonly notes: readonly Note[]
  readonly error: string | null
  readonly pinnedOnly: boolean
}

// The front service: owns what the screen shows (its closure state, exposed
// over Svelte's store contract — `subscribe`, plain TS, nothing imported from
// svelte), reads the form, translates, reports. `currentTarget` is read before
// the first await — the DOM clears it after dispatch.
export const createUi = ({ notes }: { notes: Notes }) => {
  let state: ViewState = { notes: [], error: null, pinnedOnly: false }
  const subscribers = new Set<(state: ViewState) => void>()
  const set = (next: Partial<ViewState>) => {
    state = { ...state, ...next }
    for (const run of subscribers) run(state)
  }
  const refresh = async () =>
    set({ notes: await notes.list({ pinnedOnly: state.pinnedOnly }) })

  return {
    view: {
      subscribe: (run: (state: ViewState) => void) => {
        subscribers.add(run)
        run(state)
        return () => void subscribers.delete(run)
      },
    },
    start: refresh,
    add: async (event: Submit) => {
      event.preventDefault()
      const form = event.currentTarget
      const text = (form.elements.namedItem("text") as Field).value
      const pinned = (form.elements.namedItem("pinned") as Field).checked
      try {
        await notes.add({ text, pinned })
      } catch (error) {
        if (!isNotesError(error)) throw error
        return set({ error: error.code })
      }
      set({ error: null })
      form.reset()
      await refresh()
    },
    filter: async (event: Toggle) => {
      set({ pinnedOnly: event.currentTarget.checked })
      await refresh()
    },
  }
}

export type Ui = ReturnType<typeof createUi>
