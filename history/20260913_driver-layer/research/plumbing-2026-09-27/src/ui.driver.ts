import { mount } from "svelte"

import { createAppAssembly } from "./app.assembly.ts"
import NotesApp from "./lib/ui/NotesApp.svelte"

// The root driver: wiring only.
export const main = () => {
  const notes = createAppAssembly({ token: undefined })
  mount(NotesApp, { target: document.body, props: { ui: notes.ui } })
}
