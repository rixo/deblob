import { describe, expect, it } from "vitest"

import { readmeBlocksOf } from "./readme.model.ts"

const lines = (...text: string[]) => text.join("\n")

describe("readmeBlocksOf", () => {
  it("drops the leading title and draws a heading deeper than 3 as 3", () => {
    expect(
      readmeBlocksOf(
        lines("# service", "", "## API", "", "### Ports", "", "#### Deeper"),
      ),
    ).toEqual([
      { h: "API", level: 2 },
      { h: "Ports", level: 3 },
      { h: "Deeper", level: 3 },
    ])
  })

  it("keeps a title that is not the first line", () => {
    expect(readmeBlocksOf(lines("intro", "", "# Later"))).toEqual([
      { p: "intro" },
      { h: "Later", level: 1 },
    ])
  })

  it("joins a paragraph's lines with spaces, a blank line ending it", () => {
    expect(
      readmeBlocksOf(lines("one line", "  the next", "", "another")),
    ).toEqual([{ p: "one line the next" }, { p: "another" }])
  })

  it("strips bold markers and keeps code spans and links as written", () => {
    expect(
      readmeBlocksOf(
        "a **bold** and __strong__ word, `code` and [a link](./x)",
      ),
    ).toEqual([{ p: "a bold and strong word, `code` and [a link](./x)" }])
  })

  it("keeps a fence's code verbatim with its language, and runs an unclosed one to the end", () => {
    expect(
      readmeBlocksOf(
        lines("```ts", "const a = **1**", "", "  indented", "```", "```", "x"),
      ),
    ).toEqual([
      { code: "const a = **1**\n\n  indented", lang: "ts" },
      { code: "x" },
    ])
  })

  it("reads a table with a head when its second row is a separator, as plain rows otherwise", () => {
    expect(
      readmeBlocksOf(
        lines(
          "| key | meaning |",
          "| --- | :-: |",
          "| `a` | **one** |",
          "",
          "| x | y |",
          "| z | w |",
        ),
      ),
    ).toEqual([
      { table: { head: ["key", "meaning"], rows: [["`a`", "one"]] } },
      {
        table: {
          rows: [
            ["x", "y"],
            ["z", "w"],
          ],
        },
      },
    ])
  })

  it("nests list items by indent, continues an item on indented lines, and starts a new list on another marker kind", () => {
    expect(
      readmeBlocksOf(
        lines(
          "- first",
          "  continued",
          "- second",
          "  1. inner one",
          "  2. inner two",
          "- **third**",
          "1. numbered",
        ),
      ),
    ).toEqual([
      {
        ul: [
          "first continued",
          { t: "second", ol: ["inner one", "inner two"] },
          "third",
        ],
      },
      { ol: ["numbered"] },
    ])
  })

  it("ends a paragraph where a block starts", () => {
    expect(
      readmeBlocksOf(lines("text", "- item", "text", "| a |", "text", "## h")),
    ).toEqual([
      { p: "text" },
      { ul: ["item"] },
      { p: "text" },
      { table: { rows: [["a"]] } },
      { p: "text" },
      { h: "h", level: 2 },
    ])
  })
})
