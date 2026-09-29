// The design's knobs: every prop their editor exposes, with the default
// their page declares, recorded in design-knobs.txt. We keep applying their
// defaults; the record is our memory of the values we ran on. Red after a
// pull = they changed a default: `pnpm test -u`, the record's diff rides in
// the pull's commit, its message names each change.

import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { parse } from "parse5"
import { expect, test } from "vitest"

const design = join(import.meta.dirname, "design")

type Node = {
  nodeName: string
  attrs?: { name: string; value: string }[]
  childNodes?: Node[]
  content?: Node
}

const findDataProps = (node: Node): string | null => {
  if (
    node.nodeName === "script" &&
    node.attrs?.some((a) => a.name === "data-dc-script")
  )
    return node.attrs.find((a) => a.name === "data-props")?.value ?? null
  for (const c of [
    ...(node.childNodes ?? []),
    ...(node.content ? [node.content] : []),
  ]) {
    const found = findDataProps(c)
    if (found !== null) return found
  }
  return null
}

const readKnobLines = (file: string) => {
  const page = file.slice(0, -".dc.html".length)
  const raw = findDataProps(
    parse(readFileSync(join(design, file), "utf8")) as Node,
  )
  const props: Record<string, { editor?: unknown; default?: unknown }> = raw
    ? JSON.parse(raw)
    : {}
  return Object.entries(props)
    .filter(([name, p]) => name[0] !== "$" && p.editor != null)
    .map(([name, p]) => `${page}.${name} = ${JSON.stringify(p.default)}`)
}

test("the design's knob defaults match the record", async () => {
  const pages = readdirSync(design)
    .filter((f) => f.endsWith(".dc.html"))
    .sort()
  const lines = pages.flatMap(readKnobLines)
  await expect(lines.join("\n") + "\n").toMatchFileSnapshot(
    "./design-knobs.txt",
  )
})
