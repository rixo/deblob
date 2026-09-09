import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vitest"

import { readExplainEntries } from "./content.adapter.ts"

const contentRoot = fileURLToPath(
  new URL("../__fixtures__/content", import.meta.url),
)

describe("readExplainEntries", () => {
  test("assembles rule entries from the shipped summary and cards, URLs pinned to the given version", () => {
    const entries = readExplainEntries({
      contentRoot,
      rules: ["service-purity", "private-sealed"],
      version: "9.9.9-made-up",
    })
    expect(entries).toEqual([
      {
        rule: "service-purity",
        title: "Some made-up fourth rule",
        body: "body of the made-up fourth rule.",
        cards: [
          {
            slug: "dependency-matrix",
            text: expect.stringContaining("SOME_MADE_UP_CARD_BODY") as string,
          },
        ],
        url: "https://github.com/rixo/deblob/blob/v9.9.9-made-up/docs/architecture.md#service-purity",
      },
      {
        rule: "private-sealed",
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
        url: "https://github.com/rixo/deblob/blob/v9.9.9-made-up/docs/architecture.md#private-sealed",
      },
    ])
  })

  test("throws loudly when the summary lacks the rule", () => {
    expect(() =>
      readExplainEntries({
        contentRoot,
        rules: ["blob-quarantine"],
        version: "9.9.9-made-up",
      }),
    ).toThrow(/no anchor for blob-quarantine/)
  })
})
