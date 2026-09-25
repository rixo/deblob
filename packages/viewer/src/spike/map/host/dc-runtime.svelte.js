// React-free host for Design Components pages. Line refs = tmp/design-mirror/support.js.
import { untrack, flushSync } from "svelte"

// support.js:817 StreamableLogic — the page's `class Component extends DCLogic`.
export class DCLogic {
  state = {}
  __host
  constructor(props) {
    this.props = props || {}
  }
  setState(update, cb) {
    this.__host && this.__host.__setLogicState(update, cb)
  }
  forceUpdate() {
    this.__host && this.__host.forceUpdate()
  }
  componentDidMount() {}
  componentDidUpdate(_prevProps) {}
  componentWillUnmount() {}
  renderVals() {
    return {}
  }
}

// support.js:843 evalDcLogic — sloppy-mode Function body, like theirs. `React` is bound to undefined.
function evalDcLogic(src) {
  const make = window.__dcFunction || ((...args) => new Function(...args))
  const fn = make(
    "DCLogic",
    "StreamableLogic",
    "React",
    src + '\n;return (typeof Component!=="undefined"&&Component)||undefined;',
  )
  return fn(DCLogic, DCLogic, undefined)
}

export function defineDc({ name, js, props, preview, helmets }) {
  let Logic = null
  if (js) {
    try {
      Logic = evalDcLogic(js)
      if (typeof Logic !== "function")
        console.error(
          `[dc] ${name}: <script data-dc-script> must define \`class Component extends DCLogic\``,
        )
    } catch (e) {
      console.error(
        `[dc] ${name}: logic class eval failed — the template renders with props only.`,
        e,
      )
    }
  }
  return {
    name,
    props,
    preview,
    Logic: typeof Logic === "function" ? Logic : DCLogic,
    helmets,
    pseudo: (list) =>
      Object.fromEntries(
        list.map(([cls, p, css]) => [cls, pseudoClass(p, css)]),
      ),
    defaults() {
      const d = {}
      for (const k in props || {})
        if (props[k]?.default !== undefined) d[k] = props[k].default
      return d
    },
  }
}

// support.js:862 StreamableComponent, reduced to the lifecycle the pages use.
export function dcInstance(def, getProps) {
  let version = $state(0)
  for (const h of def.helmets) mountHelmet(h)
  const snapshot = () => ({ ...getProps() })
  let logic
  try {
    logic = new def.Logic(untrack(snapshot))
  } catch (e) {
    console.error(`[dc] ${def.name}: constructor threw`, e)
    logic = new DCLogic(untrack(snapshot))
  }
  ;(globalThis.__dcLogics ||= []).push(logic) // spike probe hook
  let callbacks = []
  logic.__host = {
    // support.js:970 — the patch is applied eagerly, the render follows.
    __setLogicState(update, cb) {
      const prev = logic.state
      const patch = typeof update === "function" ? update(prev) : update
      logic.state = { ...prev, ...patch }
      if (cb) callbacks.push(cb)
      version++
    },
    forceUpdate() {
      version++
    },
  }
  const vals = $derived.by(() => {
    version
    const p = snapshot()
    logic.props = p
    try {
      return { ...p, ...(logic.renderVals() || {}) }
    } catch (e) {
      console.error(`[dc] ${def.name}.renderVals():`, e)
      return p
    }
  })
  let mounted = false
  let prevProps
  // After each commit: didMount once, then didUpdate(prevProps) — one argument, as support.js:1003 passes.
  $effect(() => {
    vals
    untrack(() => {
      try {
        if (!mounted) {
          mounted = true
          logic.componentDidMount()
        } else logic.componentDidUpdate(prevProps)
      } catch (e) {
        console.error(e)
      }
      prevProps = logic.props
      const cbs = callbacks
      callbacks = []
      for (const cb of cbs) cb()
    })
    return undefined
  })
  $effect(() => () => {
    try {
      logic.componentWillUnmount()
    } catch (e) {
      console.error(e)
    }
  })
  return {
    get vals() {
      return vals
    },
    logic,
  }
}

// support.js:391 cssToObj + React's per-property style update: unset what left, set what changed.
function cssToObj(css) {
  const o = {}
  for (const decl of css.split(";")) {
    const i = decl.indexOf(":")
    if (i < 0) continue
    o[decl.slice(0, i).trim()] = decl.slice(i + 1).trim()
  }
  return o
}
const kebab = (k) =>
  k.startsWith("--") ? k : k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())
export function _dc_style(get) {
  return (el) => {
    const v = get()
    const next =
      typeof v === "string" ? cssToObj(v) : v && typeof v === "object" ? v : {}
    const prev = el.__dcStyle || {}
    for (const k in prev) if (!(k in next)) el.style.setProperty(kebab(k), "")
    for (const k in next) {
      const x = next[k]
      if (x === prev[k]) continue
      el.style.setProperty(
        kebab(k),
        x == null || typeof x === "boolean" ? "" : String(x),
      )
    }
    el.__dcStyle = next
  }
}

export const _dc_list = (v) => (Array.isArray(v) ? v : [])

// React callback ref: fn(el) on attach, fn(null) on detach; a new fn identity re-attaches.
const refs = new WeakMap()
export function _dc_ref(fn) {
  if (typeof fn !== "function") return undefined
  let a = refs.get(fn)
  if (!a) {
    a = (el) => {
      fn(el)
      return () => fn(null)
    }
    refs.set(fn, a)
  }
  return a
}

// React drops `false` on plain attributes, keeps it as "false" on data-/aria-.
export function _dc_attr(key, v) {
  if (v === false && !/^(data|aria)-/.test(key)) return undefined
  return v
}

// support.js:450 hostPositionStyle: only the placement properties reach the child's host div.
const HOST_STYLE_PROPS = new Set([
  "position",
  "left",
  "right",
  "top",
  "bottom",
  "inset",
  "width",
  "height",
  "z-index",
  "transform",
])
export function _dc_hostStyle(style) {
  if (typeof style !== "string") return undefined
  const out = []
  for (const decl of style.split(";")) {
    const i = decl.indexOf(":")
    if (i < 0) continue
    const prop = decl.slice(0, i).trim()
    if (HOST_STYLE_PROPS.has(prop))
      out.push(prop + ":" + decl.slice(i + 1).trim())
  }
  return out.length ? out.join(";") : undefined
}

// support.js:1566 createPseudoSheet (+ importantify for pseudo-classes).
let sheet = null
const pseudoCache = new Map()
let pseudoN = 0
function pseudoClass(pseudo, css) {
  const k = pseudo + "|" + css
  if (pseudoCache.has(k)) return pseudoCache.get(k)
  if (!sheet) {
    const el = document.createElement("style")
    document.head.appendChild(el)
    sheet = el.sheet
  }
  const cls = "scp" + (pseudoN++).toString(36)
  const element = pseudo === "before" || pseudo === "after"
  const decls = element ? css : importantify(css)
  try {
    sheet.insertRule(
      "." + cls + (element ? "::" : ":") + pseudo + "{" + decls + "}",
      sheet.cssRules.length,
    )
  } catch (e) {
    console.warn("[dc] pseudo rule rejected", pseudo, css, e)
  }
  pseudoCache.set(k, cls)
  return cls
}
function importantify(css) {
  // support.js:1532, minus comment/url scanning (none in the pages).
  return css
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => (/!\s*important$/i.test(d) ? d : d + " !important"))
    .join(";")
}

// support.js:1418 helmet: scripts/links/metas once per document, other tags live per page.
const ATOMIC_CSS =
  ".fx{display:flex}.col{display:flex;flex-direction:column}.grid{display:grid}.ac{align-items:center}.jc{justify-content:center}.jb{justify-content:space-between}.f1{flex:1}.noshrink{flex-shrink:0}.wrap{flex-wrap:wrap}.fw5{font-weight:500}.fw6{font-weight:600}.fw7{font-weight:700}.fw8{font-weight:800}.fs11{font-size:11px}.fs12{font-size:12px}.fs13{font-size:13px}.fs14{font-size:14px}.fs15{font-size:15px}.fs16{font-size:16px}.fs20{font-size:20px}.fs22{font-size:22px}.upper{text-transform:uppercase}.tc{text-align:center}.nowrap{white-space:nowrap}.gap8{gap:8px}.gap10{gap:10px}.gap12{gap:12px}.gap16{gap:16px}.gap24{gap:24px}.m0{margin:0}.mt8{margin-top:8px}.mt12{margin-top:12px}.mt16{margin-top:16px}.mb8{margin-bottom:8px}.mb12{margin-bottom:12px}.mb16{margin-bottom:16px}.posrel{position:relative}.posabs{position:absolute}.round{border-radius:50%}.ohide{overflow:hidden}.bbox{box-sizing:border-box}.pointer{cursor:pointer}.w100{width:100%}.b0{border:none}"
const mountedHead = new Set()
function mountHelmet({ atomics, kids }) {
  if (atomics && !mountedHead.has("__dc-atomics")) {
    mountedHead.add("__dc-atomics")
    const el = document.createElement("style")
    el.id = "__dc-atomics"
    el.textContent = ATOMIC_CSS
    document.head.appendChild(el)
  }
  for (const { tag, attrs, text } of kids) {
    const key =
      tag === "script"
        ? "SCRIPT|" + (attrs.src || text)
        : tag.toUpperCase() +
          "|" +
          (attrs.href || attrs.src || JSON.stringify(attrs) + text)
    if (mountedHead.has(key)) continue
    mountedHead.add(key)
    const el = document.createElement(tag)
    for (const k in attrs) el.setAttribute(k, attrs[k])
    if (text) el.textContent = text
    document.head.appendChild(el)
  }
}

// support.js boot: full-page CSS unless the page declares a $preview, root props = data-props defaults.
export function bootPage(Component, def, target, mount) {
  if (!def.preview) {
    const s = document.createElement("style")
    s.textContent =
      "html,body{height:100%;margin:0}#dc-root,#dc-root>.sc-host{height:100%}"
    document.head.appendChild(s)
  }
  return mount(Component, { target, props: def.defaults() })
}

export { flushSync }
globalThis.__dcFlush = flushSync // spike probe hook
