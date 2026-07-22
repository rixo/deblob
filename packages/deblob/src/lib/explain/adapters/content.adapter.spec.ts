import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { readExplainEntries } from "./content.adapter.ts"

const contentRoot = fileURLToPath(
  new URL("../__fixtures__/content", import.meta.url),
)

describe("readExplainEntries", () => {
  it("assembles rule entries from the shipped summary and cards", () => {
    const entries = readExplainEntries({ contentRoot, rules: [4, 12] })
    expect(entries).toEqual([
      {
        rule: 4,
        title: "Some made-up fourth rule",
        body: "body of the made-up fourth rule.",
        cards: [
          {
            slug: "dependency-matrix",
            text: expect.stringContaining("SOME_MADE_UP_CARD_BODY") as string,
          },
        ],
        url: "https://github.com/rixo/deblob/blob/main/docs/architecture.md#rule-4",
      },
      {
        rule: 12,
        title: "Some made-up twelfth rule",
        body: "body of the made-up twelfth rule.",
        cards: [
          {
            slug: "packaging-visibility",
            text: expect.stringContaining(
              "SOME_OTHER_MADE_UP_CARD_BODY",
            ) as string,
          },
        ],
        url: "https://github.com/rixo/deblob/blob/main/docs/architecture.md#rule-12",
      },
    ])
  })

  it("throws loudly when the summary lacks the rule", () => {
    expect(() => readExplainEntries({ contentRoot, rules: [5] })).toThrow(
      /no anchor for rule 5/,
    )
  })
})
