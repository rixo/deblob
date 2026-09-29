/**
 * Recognition — which kind a covered file is, and which readers read it. One
 * operation for the extraction service and the bare status alike, so the two
 * commands count the same files the same way. Pure over the readers' bindings
 * and the config's designation matchers; the flavor's word arrives as data.
 *
 * The flavor names every kind; readers and config only add (04/07 rulings 4,
 * 12): a driver or test reader's binding, or a designation, may give a kind to
 * a file the flavor leaves blob, or agree with the flavor. A disagreement is a
 * config error, and so are readers of two groups on one file.
 */

import picomatch from "picomatch"

import type { Layer } from "./graph.model.ts"
import { ExtractionError } from "./graph.model.ts"

/**
 * Which files a reader reads: `include` over the files, less `exclude`. An
 * absent `include` is the group's own files — every file for a language or host
 * reader, the files the flavor names a driver (a test) for a driver (a test)
 * reader; it gives no kind. A written `include` binds those files wherever they
 * sit, and gives its group's kind to a file the flavor leaves blob.
 */
export type ReaderBinding = {
  readonly include?: readonly string[]
  readonly exclude?: readonly string[]
}

type Named = ReaderBinding & { readonly name: string }

export type Designations = {
  /**
   * The config's globs for the kinds a framework names itself — a kind claim
   * over a file whose name does not say it. Absent = nothing designated.
   */
  isAssembly?: (path: string) => boolean
  isBoot?: (path: string) => boolean
}

type Matcher = {
  /** The written `include` matches (and `exclude` does not). */
  explicit: (file: string) => boolean
  /** The binding reads the file; `natural` = the file is of the group's own. */
  reads: (file: string, natural: boolean) => boolean
}

const matcherOf = (binding: ReaderBinding): Matcher => {
  const excluded =
    binding.exclude && binding.exclude.length > 0
      ? picomatch([...binding.exclude])
      : () => false
  const included =
    binding.include === undefined
      ? null
      : binding.include.length > 0
        ? picomatch([...binding.include])
        : () => false
  return {
    explicit: (file) => included !== null && included(file) && !excluded(file),
    reads: (file, natural) =>
      !excluded(file) && (included === null ? natural : included(file)),
  }
}

export type Recognition<D extends Named, T extends Named> = {
  /**
   * The file's kind: the flavor's name; else a driver or test reader's written
   * binding (the group gives the kind), or a designation; else blob. Throws a
   * config error, the file and the claims named, when a claim disagrees with
   * the flavor or two claims disagree.
   */
  kindOf(file: string, flavorLayer: Layer): Layer
  /**
   * The driver readers of a driver file, the test readers of a test file, in
   * the order written: every one whose binding reads it — they stack. A binding
   * left to its default reads the files the flavor names of its kind, never one
   * another binding gave the kind. Empty for any other kind, and for a driver
   * or test file no reader binds. Takes the flavor's word, as `kindOf` does.
   */
  driverReadersOf(file: string, flavorLayer: Layer): readonly D[]
  testReadersOf(file: string, flavorLayer: Layer): readonly T[]
  /** The language or host readers bound to a file — every file by default. */
  boundOf<R extends Named>(readers: readonly R[], file: string): readonly R[]
}

export const createRecognition = <D extends Named, T extends Named>({
  driver,
  test,
  isAssembly,
  isBoot,
}: Designations & {
  driver: readonly D[]
  test: readonly T[]
}): Recognition<D, T> => {
  const drivers = driver.map((reader) => ({ reader, ...matcherOf(reader) }))
  const tests = test.map((reader) => ({ reader, ...matcherOf(reader) }))
  const matchers = new Map<Named, Matcher>()
  const matcherFor = (reader: Named): Matcher => {
    const known = matchers.get(reader)
    if (known) return known
    const made = matcherOf(reader)
    matchers.set(reader, made)
    return made
  }

  const claimsOn = (file: string): readonly { layer: Layer; by: string }[] => [
    ...drivers
      .filter(({ explicit }) => explicit(file))
      .map(({ reader }) => ({
        layer: "driver" as const,
        by: `driver reader "${reader.name}"`,
      })),
    ...tests
      .filter(({ explicit }) => explicit(file))
      .map(({ reader }) => ({
        layer: "test" as const,
        by: `test reader "${reader.name}"`,
      })),
    ...(isAssembly?.(file)
      ? [{ layer: "assembly" as const, by: `the "assembly" designation` }]
      : []),
    ...(isBoot?.(file)
      ? [{ layer: "boot" as const, by: `the "boot" designation` }]
      : []),
  ]

  const kindOf = (file: string, flavorLayer: Layer): Layer => {
    const claims = claimsOn(file)
    if (flavorLayer !== "blob") {
      const against = claims.find((claim) => claim.layer !== flavorLayer)
      if (against) {
        // a config mistake found where the file set is — extraction's own
        // failure, actionable, presented by the driver
        throw new ExtractionError(
          "designation-conflict",
          `${file} is named ${flavorLayer} by the flavor, but ${against.by} makes it ${against.layer} — the flavor names the kind, a binding only adds one to an unnamed file; narrow the globs`,
        )
      }
      return flavorLayer
    }
    const kinds = new Set(claims.map((claim) => claim.layer))
    if (kinds.size > 1) {
      throw new ExtractionError(
        "designation-conflict",
        `${file} is claimed by ${claims.map((claim) => `${claim.by} (${claim.layer})`).join(" and ")} — a file has one kind; narrow the globs`,
      )
    }
    return claims[0]?.layer ?? "blob"
  }

  return {
    kindOf,
    driverReadersOf: (file, flavorLayer) =>
      kindOf(file, flavorLayer) === "driver"
        ? drivers
            .filter(({ reads }) => reads(file, flavorLayer === "driver"))
            .map(({ reader }) => reader)
        : [],
    testReadersOf: (file, flavorLayer) =>
      kindOf(file, flavorLayer) === "test"
        ? tests
            .filter(({ reads }) => reads(file, flavorLayer === "test"))
            .map(({ reader }) => reader)
        : [],
    boundOf: (readers, file) =>
      readers.filter((reader) => matcherFor(reader).reads(file, true)),
  }
}
