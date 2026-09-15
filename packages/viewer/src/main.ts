import { mount } from "svelte"

import App from "./App.svelte"
import { createWsSource } from "./lib/snapshot/adapters/ws-source.adapter.ts"

const target = document.getElementById("app")
if (target === null) throw new Error("viewer: no #app element to mount on")

// the data server, behind Vite's proxy in dev (vite.config.ts)
const source = createWsSource(`ws://${location.host}/deblob/ws`)
mount(App, { target, props: { source } })
