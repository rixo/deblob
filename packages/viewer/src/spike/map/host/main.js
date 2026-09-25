import { mount } from "svelte"
import { bootPage } from "./dc-runtime.svelte.js"

const pages = {
  "Sequence Panel": () => import("@design/Sequence Panel.dc.html"),
  "Deblob Map Host": () => import("@design/Deblob Map Host.dc.html"),
}
const name =
  new URLSearchParams(location.search).get("page") || "Deblob Map Host"
const mod = await pages[name]()
bootPage(mod.default, mod.dcDef, document.getElementById("dc-root"), mount)
