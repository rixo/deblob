import { describe, expect, test } from "vitest"

import type { Layer } from "./graph.model.ts"
import type { Binding } from "./recognition.model.ts"
import { createRecognition } from "./recognition.model.ts"

type Named = Binding & { name: string }

/** A reader's binding as recognition sees it: globs and the kinds it reads. */
const binding = (
  name: string,
  kinds: readonly Layer[],
  files: readonly string[],
): Named => ({ name, kinds, files })

const SPEC_FILE = "made-up/deep/thing.spec.ts"
const PLAIN_FILE = "made-up/deep/thing.ts"

const runner = binding("made-up-runner", ["test"], ["**/*.spec.ts"])
const plain = binding(
  "made-up-plain",
  ["assembly", "driver", "boot"],
  ["**/*.ts"],
)

describe("createRecognition", () => {
  describe("kindOf", () => {
    test("no claim on the file: the flavor's word", () => {
      const { kindOf } = createRecognition({ readers: [plain] })
      expect(kindOf(PLAIN_FILE, "service")).toBe("service")
    })

    test("one config designation wins over the flavor's word", () => {
      const { kindOf } = createRecognition({
        readers: [plain],
        isDriver: (path) => path === PLAIN_FILE,
      })
      expect(kindOf(PLAIN_FILE, "service")).toBe("driver")
      expect(kindOf("made-up/other.ts", "service")).toBe("service")
    })

    test("a single-kind reader's binding designates its kind wherever the file sits — over every config designation, a conflict included", () => {
      const { kindOf } = createRecognition({
        readers: [runner, plain],
        isAssembly: () => true,
        isBoot: () => true,
      })
      expect(kindOf(SPEC_FILE, "service")).toBe("test")
    })

    test("a reader of several kinds designates nothing — its match leaves the file to the config designations and the flavor", () => {
      const { kindOf } = createRecognition({
        readers: [plain],
        isBoot: (path) => path === PLAIN_FILE,
      })
      expect(kindOf(PLAIN_FILE, "model")).toBe("boot")
      expect(kindOf("made-up/other.ts", "model")).toBe("model")
    })

    test("readers in the order given: the first single-kind binding that matches designates", () => {
      const other = binding("made-up-other", ["driver"], ["**/*.spec.ts"])
      expect(
        createRecognition({ readers: [other, runner] }).kindOf(
          SPEC_FILE,
          "service",
        ),
      ).toBe("driver")
      expect(
        createRecognition({ readers: [runner, other] }).kindOf(
          SPEC_FILE,
          "service",
        ),
      ).toBe("test")
    })

    test("two config designations on one file: an ExtractionError naming the file and both keys, config's key names", () => {
      const { kindOf } = createRecognition({
        readers: [plain],
        isAssembly: () => true,
        isDriver: () => false,
        isBoot: () => true,
      })
      expect(() => kindOf(PLAIN_FILE, "service")).toThrow(
        expect.objectContaining({
          name: "ExtractionError",
          code: "designation-conflict",
          message: `${PLAIN_FILE} is designated "assembly" and "boot" in deblob config — a file has one kind; narrow the globs`,
        }),
      )
    })
  })

  describe("readerOf", () => {
    test("the first reader, in the order given, whose binding matches the path and whose kinds hold the kind", () => {
      const { readerOf } = createRecognition({ readers: [runner, plain] })
      expect(readerOf(SPEC_FILE, "test")).toBe(runner)
      expect(readerOf(PLAIN_FILE, "driver")).toBe(plain)
    })

    test("the kinds filter: a binding that matches the path but does not read the kind is passed over", () => {
      // plain TS bound over the spec naming, first — the file is still a test
      // file, and plain TS reads no test, so it falls to the runner
      const wide = binding(
        "made-up-wide",
        ["assembly", "driver", "boot"],
        ["**/*.spec.ts"],
      )
      const { readerOf } = createRecognition({ readers: [wide, runner] })
      expect(readerOf(SPEC_FILE, "test")).toBe(runner)
      expect(readerOf(SPEC_FILE, "driver")).toBe(wide)
    })

    test("null when no reader binds the file for that kind — recognized and open", () => {
      const { readerOf } = createRecognition({ readers: [runner] })
      expect(readerOf(PLAIN_FILE, "driver")).toBeNull()
      expect(readerOf(SPEC_FILE, "driver")).toBeNull()
    })
  })
})
