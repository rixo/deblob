/**
 * A README as the map's panel draws it: markdown read into the contract's
 * blocks — headings, paragraphs, lists, code, tables. What the panel does not
 * draw is simplified here: the leading `# title` goes (the panel's head already
 * names the box), a heading deeper than 3 is drawn as 3, bold loses its
 * markers. Inline code spans and links stay as written: the panel reads them.
 * Pure: a string in.
 */

import type { ReadmeBlock, ReadmeItem } from "@deblob/viewer/snapshot.model"

const FENCE = /^\s*```\s*(\S*)/
const HEADING = /^(#{1,6})\s+(.*)$/
const TABLE_ROW = /^\s*\|/
const LIST_ITEM = /^(\s*)([-*+]|\d+\.)\s+(.*)$/
const SEPARATOR_CELL = /^:?-+:?$/

/**
 * A list item's parts, or `null`. Every group of the pattern takes part in any
 * match, so a match has them all.
 */
const listItemOf = (
  line: string,
): { indent: string; marker: string; text: string } | null => {
  const match = LIST_ITEM.exec(line)
  return match === null
    ? null
    : {
        indent: match[1] as string,
        marker: match[2] as string,
        text: match[3] as string,
      }
}

/** Bold markers dropped; everything else inline as written. */
const inline = (text: string): string =>
  text.replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, "$1$2")

const cellsOf = (row: string): string[] =>
  row
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => inline(cell.trim()))

const startsBlock = (line: string): boolean =>
  FENCE.test(line) ||
  /^#{1,6}\s/.test(line) ||
  TABLE_ROW.test(line) ||
  LIST_ITEM.test(line)

type OpenItem = { t: string; ul?: ReadmeItem[]; ol?: ReadmeItem[] }

/**
 * One list from line `start`: the items at its indent and of its kind (ordered
 * or not); a deeper marker nests a list under the item before it; an indented
 * plain line continues that item's text. Returns the list and the first line
 * past it.
 */
const listAt = (
  lines: readonly string[],
  start: number,
): { block: ReadmeBlock; next: number } => {
  // `start` is a list line: the caller matched it
  const { indent, marker } = listItemOf(lines[start] as string) as {
    indent: string
    marker: string
  }
  const ordered = /\d/.test(marker)
  const items: OpenItem[] = []
  let at = start
  while (at < lines.length) {
    const line = lines[at] as string
    const item = listItemOf(line)
    const last = items.at(-1)
    if (
      item !== null &&
      item.indent.length === indent.length &&
      /\d/.test(item.marker) === ordered
    ) {
      items.push({ t: item.text.trim() })
      at++
    } else if (
      item !== null &&
      item.indent.length > indent.length &&
      last !== undefined
    ) {
      const nested = listAt(lines, at)
      Object.assign(last, nested.block)
      at = nested.next
    } else if (item === null && last !== undefined && /^\s+\S/.test(line)) {
      last.t = `${last.t} ${line.trim()}`
      at++
    } else break
  }
  const out: ReadmeItem[] = items.map((item) =>
    item.ul !== undefined || item.ol !== undefined
      ? { ...item, t: inline(item.t) }
      : inline(item.t),
  )
  return { block: ordered ? { ol: out } : { ul: out }, next: at }
}

export const readmeBlocksOf = (markdown: string): ReadmeBlock[] => {
  const lines = markdown.split("\n")
  /** The line at `index`; every caller stays within the lines. */
  const lineAt = (index: number): string => lines[index] as string
  const blocks: ReadmeBlock[] = []
  let at = 0
  while (at < lines.length) {
    const line = lineAt(at)
    const fence = FENCE.exec(line)
    if (fence !== null) {
      const body: string[] = []
      for (at++; at < lines.length && !/^\s*```/.test(lineAt(at)); at++)
        body.push(lineAt(at))
      at++
      // the language group matches, empty or not, whenever the fence does
      const lang = fence[1] as string
      blocks.push(
        lang === ""
          ? { code: body.join("\n") }
          : { code: body.join("\n"), lang },
      )
      continue
    }
    const heading = HEADING.exec(line)
    if (heading !== null) {
      const hashes = heading[1] as string
      // the leading title: the panel's head already names the box
      if (!(at === 0 && hashes === "#"))
        blocks.push({
          h: inline(heading[2] as string),
          level: Math.min(hashes.length, 3),
        })
      at++
      continue
    }
    if (TABLE_ROW.test(line)) {
      const rows: string[][] = []
      for (; at < lines.length && TABLE_ROW.test(lineAt(at)); at++)
        rows.push(cellsOf(lineAt(at)))
      const [head, separator, ...body] = rows
      const ruled =
        head !== undefined &&
        separator !== undefined &&
        separator.every((cell) => SEPARATOR_CELL.test(cell))
      blocks.push({ table: ruled ? { head, rows: body } : { rows } })
      continue
    }
    if (LIST_ITEM.test(line)) {
      const { block, next } = listAt(lines, at)
      blocks.push(block)
      at = next
      continue
    }
    if (line.trim() === "") {
      at++
      continue
    }
    const paragraph: string[] = []
    for (
      ;
      at < lines.length && lineAt(at).trim() !== "" && !startsBlock(lineAt(at));
      at++
    )
      paragraph.push(lineAt(at).trim())
    blocks.push({ p: inline(paragraph.join(" ")) })
  }
  return blocks
}
