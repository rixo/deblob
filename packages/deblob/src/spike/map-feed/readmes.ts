/**
 * SPIKE (2026-09-25, map feed) — rewritten 100% before anything ships; delete
 * with src/spike.
 *
 * The right panel's READMEs, live: the `README.md` of every map container, as
 * the blocks their `data/behavior-lorem.js` defines (`readmes[containerId] → [{
 * h } | { p }]`, backticks = code spans, `.` = the project root).
 *
 * Their block format has headings and paragraphs only, so: a heading is `h`
 * (the leading `# title` is dropped, the panel head already names the box), a
 * paragraph is `p` (lines joined), each list item is its own `p`. Fenced code
 * and tables are left out: no block kind for them yet (asked in FROM-DEBLOB).
 * Links keep their text, `**bold**` loses its marks.
 */

import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

type Block = { h: string } | { p: string }

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

export function markdownBlocks(md: string): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  let fenced = false
  const flush = () => {
    if (para.length) blocks.push({ p: inline(para.join(" ")) })
    para = []
  }
  for (const [i, line] of md.split("\n").entries()) {
    if (/^\s*```/.test(line)) {
      flush()
      fenced = !fenced
      continue
    }
    if (fenced) continue
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      flush()
      if (!(i === 0 && heading[1] === "#"))
        blocks.push({ h: inline(heading[2]!) })
      continue
    }
    if (/^\s*\|/.test(line)) {
      flush()
      continue
    }
    if (line.trim() === "") {
      flush()
      continue
    }
    const item = /^\s*(?:[-*+]|\d+\.)\s+(.*)$/.exec(line)
    if (item) {
      flush()
      para.push(item[1]!)
      continue
    }
    para.push(line.trim())
  }
  flush()
  return blocks
}

const inline = (text: string): string =>
  text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, "$1$2")
