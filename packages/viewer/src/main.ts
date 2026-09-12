import { mount } from "svelte"

import App from "./App.svelte"
import { once } from "./lib/snapshot/snapshot.model.ts"

const target = document.getElementById("app")
if (target === null) throw new Error("viewer: no #app element to mount on")

// a stream of one — the placeholder until a real source feeds the app
mount(App, {
  target,
  props: { source: once({ generatedAt: new Date().toISOString() }) },
})
