// .dc.html -> Svelte 5 component source. Mirrors support.js semantics (line refs = tmp/design-mirror/support.js).
import { parse } from "parse5"

const RUNTIME = "/dc-runtime.svelte.js"

// support.js:326 EVENT_MAP (lowercase attr -> React prop), then React prop -> native event.
const REACT_EVENTS = {
  onclick: "onClick",
  onchange: "onChange",
  oninput: "onInput",
  onsubmit: "onSubmit",
  onkeydown: "onKeyDown",
  onkeyup: "onKeyUp",
  onkeypress: "onKeyPress",
  onmousedown: "onMouseDown",
  onmouseup: "onMouseUp",
  onmouseenter: "onMouseEnter",
  onmouseleave: "onMouseLeave",
  onfocus: "onFocus",
  onblur: "onBlur",
  ondoubleclick: "onDoubleClick",
  oncontextmenu: "onContextMenu",
  onmousemove: "onMouseMove",
  onmouseover: "onMouseOver",
  onmouseout: "onMouseOut",
  onpointerdown: "onPointerDown",
  onpointerup: "onPointerUp",
  onpointermove: "onPointerMove",
  onpointerenter: "onPointerEnter",
  onpointerleave: "onPointerLeave",
  onpointercancel: "onPointerCancel",
  onpointerover: "onPointerOver",
  onpointerout: "onPointerOut",
  ongotpointercapture: "onGotPointerCapture",
  onlostpointercapture: "onLostPointerCapture",
  ontouchstart: "onTouchStart",
  ontouchend: "onTouchEnd",
  ontouchmove: "onTouchMove",
  ontouchcancel: "onTouchCancel",
  ondragstart: "onDragStart",
  ondragend: "onDragEnd",
  ondragenter: "onDragEnter",
  ondragleave: "onDragLeave",
  ondragover: "onDragOver",
  onanimationstart: "onAnimationStart",
  onanimationend: "onAnimationEnd",
  onanimationiteration: "onAnimationIteration",
  ontransitionend: "onTransitionEnd",
}
// React's synthetic names that differ from the native event they listen to.
const NATIVE_OF = {
  doubleclick: "dblclick",
  focus: "focusin",
  blur: "focusout",
}
const VOID = new Set(
  "area base br col embed hr img input link meta source track wbr".split(" "),
)
const J = JSON.stringify

// ---- expression grammar (support.js:204 resolve) compiled to JS over a lexical scope ----
const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*/
const NUMBER_RE = /^-?\d+(\.\d+)?$/

function parensWrapWhole(e) {
  let d = 0
  for (let i = 0; i < e.length - 1; i++) {
    if (e[i] === "(") d++
    else if (e[i] === ")") {
      d--
      if (d === 0) return false
    }
  }
  return true
}
function findTopLevelEquality(e) {
  let d = 0
  for (let i = 0; i < e.length; i++) {
    const c = e[i]
    if (c === "[" || c === "(") d++
    else if (c === "]" || c === ")") d--
    else if (d === 0 && (c === "=" || c === "!") && e[i + 1] === "=") {
      if (i > 0 && (e[i - 1] === "=" || e[i - 1] === "!")) continue
      if (!e.slice(0, i).trim()) continue
      return { index: i, op: e[i + 2] === "=" ? c + "==" : c + "=" }
    }
  }
  return null
}

export function compileExpr(src, scope, warn) {
  const e = String(src).trim()
  if (!e) return "undefined"
  if (e[0] === "(" && e[e.length - 1] === ")" && parensWrapWhole(e))
    return compileExpr(e.slice(1, -1), scope, warn)
  const eq = findTopLevelEquality(e)
  if (eq)
    return `(${compileExpr(e.slice(0, eq.index), scope, warn)} ${eq.op} ${compileExpr(e.slice(eq.index + eq.op.length), scope, warn)})`
  if (e[0] === "!") return `!(${compileExpr(e.slice(1), scope, warn)})`
  if (e === "true" || e === "false" || e === "null" || e === "undefined")
    return e
  if (NUMBER_RE.test(e)) return String(Number(e))
  if (
    e.length >= 2 &&
    (e[0] === '"' || e[0] === "'") &&
    e[e.length - 1] === e[0]
  )
    return J(e.slice(1, -1))
  return compilePath(e, scope, warn)
}

function compilePath(e, scope, warn) {
  const head = e.match(IDENT_RE)
  if (!head) return bad()
  // sc-for builds sub = { ...vals, [as]: item, $index: i } (support.js:589): innermost binding wins.
  let out = null
  for (let k = scope.length - 1; k >= 0 && out == null; k--) {
    if (head[0] === scope[k].as) out = scope[k].item
    else if (head[0] === "$index") out = scope[k].index
  }
  if (out == null) out = `vals[${J(head[0])}]`
  let i = head[0].length
  while (i < e.length) {
    if (e[i] === ".") {
      const m = e.slice(i + 1).match(IDENT_RE) || e.slice(i + 1).match(/^\d+/)
      if (!m) return bad()
      out += `?.[${J(m[0])}]`
      i += 1 + m[0].length
    } else if (e[i] === "[") {
      let d = 1,
        j = i + 1
      while (j < e.length && d > 0) {
        if (e[j] === "[") d++
        else if (e[j] === "]") {
          d--
          if (d === 0) break
        }
        j++
      }
      if (d !== 0) return bad()
      out += `?.[${compileExpr(e.slice(i + 1, j), scope, warn)}]`
      i = j + 1
    } else return bad()
  }
  return out
  function bad() {
    warn(`{{ ${e} }} is outside the expression grammar — resolves to undefined`)
    return "undefined"
  }
}

// support.js:401 compileAttr
function compileAttr(raw, scope, warn) {
  const whole = raw.match(/^\s*\{\{([\s\S]+?)\}\}\s*$/)
  if (whole) return compileExpr(whole[1], scope, warn)
  if (raw.includes("{{")) {
    const parts = raw.split(/\{\{([\s\S]+?)\}\}/g)
    return (
      "[" +
      parts
        .map((s, i) =>
          i & 1 ? `(${compileExpr(s, scope, warn)}) ?? ""` : J(s),
        )
        .join(", ") +
      '].join("")'
    )
  }
  return J(raw)
}

const kebabToCamel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase())

// support.js:303 RAW_WRAP: table tags are renamed before parsing, or the HTML
// table rules foster-parent the <sc-for> / <sc-if> around rows out of the
// table; walkElement names them back. Svelte also rejects text and a bare
// <tr> under <table> (React builds the DOM without the parser, so it never
// sees them): whitespace between tags inside a table is dropped, and rows
// not already in a section get a <tbody>.
const RAW_WRAP = [
  "select",
  "table",
  "tbody",
  "thead",
  "tfoot",
  "tr",
  "td",
  "th",
  "caption",
]
const RAW_UNWRAP = Object.fromEntries(RAW_WRAP.map((t) => ["sc-raw-" + t, t]))
const rawWrap = (html) =>
  html
    .replace(
      new RegExp(`(</?)(${RAW_WRAP.join("|")})(?=[\\s>])`, "gi"),
      "$1sc-raw-$2",
    )
    .replace(/<sc-raw-table[\s\S]*?<\/sc-raw-table>/gi, (t) =>
      t.replace(/>\s+</g, "><"),
    )
const SECTIONS = new Set(["thead", "tbody", "tfoot", "caption", "colgroup"])

// ---- template walk ----
export function compileDc(
  source,
  { name, warn = (m) => console.warn(`[dc] ${name}: ${m}`) },
) {
  source = rawWrap(source)
  const doc = parse(source, { sourceCodeLocationInfo: true })
  const find = (n, pred) => {
    if (pred(n)) return n
    for (const c of n.childNodes || []) {
      const r = find(c, pred)
      if (r) return r
    }
    if (n.content) return find(n.content, pred)
    return null
  }
  const xdc = find(doc, (n) => n.nodeName === "x-dc")
  if (!xdc) throw new Error(`${name}: no <x-dc> block`)
  const script = find(
    doc,
    (n) =>
      n.nodeName === "script" &&
      n.attrs?.some((a) => a.name === "data-dc-script"),
  )
  const js = script ? script.childNodes.map((c) => c.value).join("") : ""
  const { props, preview } = parseDataProps(
    script?.attrs.find((a) => a.name === "data-props")?.value ?? null,
  )

  // parse5 lowercases attribute names; the source keeps their case (viewBox, onClick).
  const attrName = (node, a) => {
    const loc = node.sourceCodeLocation?.attrs?.[a.name]
    if (!loc) return a.name
    return source.slice(loc.startOffset, loc.endOffset).match(/^[^\s=]+/)[0]
  }

  const imports = new Map() // dc-import name -> local ident
  const helmets = []
  const pseudos = [] // [pseudo, css] registered at module init
  let n = 0
  const fresh = (p) => `${p}${n++}`

  const walkChildren = (node, scope) =>
    (node.childNodes || []).map((c) => walk(c, scope)).join("")

  function walk(node, scope) {
    if (node.nodeName === "#text") return walkText(node.value, scope)
    if (!node.tagName) return ""
    switch (node.tagName) {
      case "sc-for":
        return walkFor(node, scope)
      case "sc-if":
        return walkIf(node, scope)
      case "helmet":
        return walkHelmet(node)
      case "dc-import":
        return walkComponent(node, scope)
      case "x-import":
        throw new Error(`${name}: x-import is not supported by this spike`)
      default:
        return walkElement(node, scope)
    }
  }

  // support.js:552 walkText: static text kept verbatim (whitespace too, unless no space char in it).
  function walkText(txt, scope) {
    if (!txt.includes("{{")) {
      if (!txt.trim() && !txt.includes(" ")) return ""
      return `{${J(txt)}}`
    }
    return txt
      .split(/\{\{([\s\S]+?)\}\}/g)
      .map((p, i) =>
        i & 1
          ? `{@render _dc_interp(${compileExpr(p, scope, warn)})}`
          : p
            ? `{${J(p)}}`
            : "",
      )
      .join("")
  }

  function walkFor(node, scope) {
    const get = (k) => node.attrs.find((a) => a.name === k)?.value
    const as = get("as") || "item"
    const item = fresh("_dc_item"),
      index = fresh("_dc_i")
    const list = compileAttr(get("list") || "", scope, warn)
    return `{#each _dc_list(${list}) as ${item}, ${index}}${walkChildren(node, [...scope, { as, item, index }])}{/each}`
  }

  function walkIf(node, scope) {
    const v = node.attrs.find((a) => a.name === "value")?.value || ""
    return `{#if ${compileAttr(v, scope, warn)}}${walkChildren(node, scope)}{/if}`
  }

  // support.js:1418 helmet.compile: head side effects, rendered as nothing.
  function walkHelmet(node) {
    const atomics = node.attrs.some((a) => a.name === "data-dc-atomics")
    const kids = node.childNodes
      .filter((c) => c.tagName)
      .map((c) => ({
        tag: c.tagName,
        attrs: Object.fromEntries(
          c.attrs.map((a) => [attrName(c, a), a.value]),
        ),
        text: (c.childNodes || []).map((t) => t.value ?? "").join(""),
      }))
    helmets.push({ atomics, kids })
    return ""
  }

  // support.js:618 walkComponent: props from attributes (kebab -> camel), host position style from `style`.
  function walkComponent(node, scope) {
    const dcName =
      node.attrs.find((a) => a.name === "name" || a.name === "component")
        ?.value || ""
    if (!imports.has(dcName)) imports.set(dcName, fresh("DcImport"))
    const props = []
    for (const a of node.attrs) {
      let key = attrName(node, a)
      if (
        ["name", "component", "sc-name", "data-dc-tpl", "hint-size"].includes(
          key,
        )
      )
        continue
      if (key === "style") {
        props.push(
          `__hostStyle={_dc_hostStyle(${compileAttr(a.value, scope, warn)})}`,
        )
        continue
      }
      if (key.startsWith("style-")) continue
      if (key.includes("-")) key = kebabToCamel(key)
      if (key === "dcProps") {
        props.push(`{...(${compileAttr(a.value, scope, warn)} ?? {})}`)
        continue
      }
      props.push(`${key}={${compileAttr(a.value, scope, warn)}}`)
    }
    if ((node.childNodes || []).some((c) => c.tagName || c.value?.trim()))
      warn(`<dc-import name="${dcName}"> children are dropped by this spike`)
    return `<${imports.get(dcName)} ${props.join(" ")} />`
  }

  // support.js:752 walkElement + support.js:415 collectProps (kind "dom").
  function walkElement(node, scope) {
    const tag = RAW_UNWRAP[node.tagName] || node.tagName
    const attrs = []
    const classes = []
    let classExpr = null
    for (const a of node.attrs) {
      const key = attrName(node, a)
      if (
        key === "sc-name" ||
        key === "data-dc-tpl" ||
        key === "hint-size" ||
        key === "key"
      )
        continue
      if (key.startsWith("style-")) {
        // support.js:437 — the raw attribute text is the CSS, never interpolated.
        const cls = fresh("_dc_pc")
        pseudos.push([cls, key.slice(6), a.value])
        classes.push(cls)
        continue
      }
      const v = compileAttr(a.value, scope, warn)
      if (key === "class" || key === "className") {
        classExpr = v
        continue
      }
      if (key === "ref") {
        attrs.push(`{@attach _dc_ref(${v})}`)
        continue
      }
      if (/^on/i.test(key)) {
        const react =
          REACT_EVENTS[key.toLowerCase()] ||
          "on" + key[2].toUpperCase() + key.slice(3)
        let ev = react.slice(2).toLowerCase()
        ev = NATIVE_OF[ev] || ev
        if (ev === "change" && (tag === "input" || tag === "textarea"))
          ev = "input"
        attrs.push(`on${ev}={${v}}`)
        continue
      }
      if (key === "value" || key === "checked") {
        attrs.push(`${key}={(${v}) ?? ${key === "checked" ? "false" : '""'}}`)
        continue
      }
      // React diffs style per property (support.js:778 cssToObj): direct DOM writes to other properties survive a render.
      if (key === "style") {
        attrs.push(
          a.value.includes("{{")
            ? `{@attach _dc_style(() => ${v})}`
            : `style={${v}}`,
        )
        continue
      }
      attrs.push(`${key}={_dc_attr(${J(key)}, ${v})}`)
    }
    if (classes.length || classExpr) {
      const pcs = classes.map((c) => `_dc_pseudo.${c}`)
      attrs.push(
        `class={[${[classExpr ?? "undefined", ...pcs].join(", ")}].filter(Boolean).join(" ") || undefined}`,
      )
    }
    const open = `<${tag}${attrs.length ? " " + attrs.join(" ") : ""}`
    if (VOID.has(tag)) return open + " />"
    const kids =
      tag === "template"
        ? walkChildren(node.content, scope)
        : walkChildren(node, scope)
    const bare =
      tag === "table" &&
      node.childNodes.some(
        (c) => c.tagName && !SECTIONS.has(RAW_UNWRAP[c.tagName] || c.tagName),
      )
    return bare
      ? `${open}><tbody>${kids}</tbody></${tag}>`
      : `${open}>${kids}</${tag}>`
  }

  const template = walkChildren(xdc, [])
  const lines = []
  lines.push(`<script module>`)
  lines.push(
    `import { defineDc, dcInstance, _dc_list, _dc_ref, _dc_attr, _dc_hostStyle, _dc_style } from ${J(RUNTIME)}`,
  )
  for (const [dcName, ident] of imports)
    lines.push(`import ${ident} from ${J("./" + dcName + ".dc.html")}`)
  lines.push(
    `const def = defineDc(${J({ name, js, props, preview, helmets }).replace(/</g, "\\u003c")})`,
  )
  lines.push(
    `const _dc_pseudo = def.pseudo(${J(pseudos.map(([cls, p, css]) => [cls, p, css]))})`,
  )
  lines.push(`export const dcDef = def`)
  lines.push(`</script>`)
  lines.push(`<script>`)
  lines.push(`let { __hostStyle, ...userProps } = $props()`)
  lines.push(`const dc = dcInstance(def, () => userProps)`)
  lines.push(`const vals = $derived(dc.vals)`)
  lines.push(`</script>`)
  lines.push(
    `{#snippet _dc_interp(v)}{#if v === undefined || v === null || typeof v === "boolean"}{:else if Array.isArray(v)}{v.join("")}{:else}<span class="sc-interp">{String(v)}</span>{/if}{/snippet}`,
  )
  lines.push(
    `<div class="sc-host" data-sc-name={def.name} style={__hostStyle}>${template}</div>`,
  )
  return lines.join("\n")
}

// support.js:57 parseDataProps
function parseDataProps(raw) {
  if (!raw) return { props: null, preview: null }
  let o
  try {
    o = JSON.parse(raw)
  } catch {
    return { props: null, preview: null }
  }
  if (!o || typeof o !== "object" || Array.isArray(o))
    return { props: null, preview: null }
  const preview =
    o.$preview && typeof o.$preview === "object" ? o.$preview : null
  const rest = {}
  for (const k of Object.keys(o)) if (k[0] !== "$") rest[k] = o[k]
  return { props: Object.keys(rest).length ? rest : null, preview }
}
