/**
 * SPIKE (2026-09-25, map feed) — rewritten 100% before anything ships; delete
 * with src/spike.
 *
 * The right panel's READMEs, live: the `README.md` of every map container, as
 * the blocks the design's Behavior Panel draws (their reply of 2026-09-25): `{
 * h, level? }` · `{ p }` · `{ ul | ol: [text | { t, ul? | ol? }] }` · `{ code,
 * lang? }` · `{ table: { head?, rows } }`; inline text keeps `code` and
 * `[text](url)`, `.` = the project root.
 *
 * The leading `# title` is dropped: the panel head already names the box.
 * Headings deeper than 3 are drawn as 3. `**bold**` loses its marks (not
 * drawn). A list item's continuation lines join its text; nesting follows
 * indentation.
 */

import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

type Item = string | { t: string; ul?: Item[]; ol?: Item[] }
type Block =
  | { h: string; level: number }
  | { p: string }
  | { ul: Item[] }
  | { ol: Item[] }
  | { code: string; lang?: string }
  | { table: { head?: string[]; rows: string[][] } }

export function readmesOf(
  root: string,
  containerIds: readonly string[],
): Record<string, Block[]> {
  const out: Record<string, Block[]> = {}
  for (const id of containerIds) {
    const file = join(root, id === "." ? "" : id, "README.md")
    if (existsSync(file)) out[id] = markdownBlocks(readFileSync(file, "utf8"))
  }
  return out
}

const LIST = /^(\s*)([-*+]|\d+\.)\s+(.*)$/

export function markdownBlocks(md: string): Block[] {
  const lines = md.split("\n")
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]!
    const fence = /^\s*```\s*(\S*)/.exec(line)
    if (fence) {
      const body: string[] = []
      for (i++; i < lines.length && !/^\s*```/.test(lines[i]!); i++)
        body.push(lines[i]!)
      i++
      blocks.push(
        fence[1]
          ? { code: body.join("\n"), lang: fence[1] }
          : { code: body.join("\n") },
      )
      continue
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      if (!(i === 0 && heading[1] === "#"))
        blocks.push({
          h: inline(heading[2]!),
          level: Math.min(heading[1]!.length, 3),
        })
      i++
      continue
    }
    if (/^\s*\|/.test(line)) {
      const rows: string[][] = []
      for (; i < lines.length && /^\s*\|/.test(lines[i]!); i++)
        rows.push(cells(lines[i]!))
      const ruled = rows.length > 1 && rows[1]!.every((c) => /^:?-+:?$/.test(c))
      blocks.push({
        table: ruled ? { head: rows[0]!, rows: rows.slice(2) } : { rows },
      })
      continue
    }
    if (LIST.test(line)) {
      const [list, next] = listAt(lines, i)
      blocks.push(list)
      i = next
      continue
    }
    if (line.trim() === "") {
      i++
      continue
    }
    const para: string[] = []
    for (
      ;
      i < lines.length && lines[i]!.trim() !== "" && !startsBlock(lines[i]!);
      i++
    )
      para.push(lines[i]!.trim())
    blocks.push({ p: inline(para.join(" ")) })
  }
  return blocks
}

const startsBlock = (line: string) =>
  /^\s*```/.test(line) ||
  /^#{1,6}\s/.test(line) ||
  /^\s*\|/.test(line) ||
  LIST.test(line)

// One list from line i: items at its indent, deeper markers nest under the
// item before them, indented plain lines continue the item's text.
function listAt(lines: string[], i: number): [Block, number] {
  const first = LIST.exec(lines[i]!)!
  const indent = first[1]!.length
  const ordered = /\d/.test(first[2]!)
  const items: Exclude<Item, string>[] = []
  while (i < lines.length) {
    const m = LIST.exec(lines[i]!)
    if (m && m[1]!.length === indent && /\d/.test(m[2]!) === ordered) {
      items.push({ t: m[3]!.trim() })
      i++
    } else if (m && m[1]!.length > indent && items.length) {
      const [sub, next] = listAt(lines, i)
      Object.assign(items.at(-1)!, sub)
      i = next
    } else if (!m && items.length && /^\s+\S/.test(lines[i]!)) {
      items.at(-1)!.t += " " + lines[i]!.trim()
      i++
    } else break
  }
  const out: Item[] = items.map((it) =>
    it.ul || it.ol ? { ...it, t: inline(it.t) } : inline(it.t),
  )
  return [ordered ? { ol: out } : { ul: out }, i]
}

const cells = (row: string): string[] =>
  row
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => inline(c.trim()))

const inline = (text: string): string =>
  text.replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, "$1$2")
