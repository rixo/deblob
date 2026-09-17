/**
 * Recognition — which kind a covered file is, and which reader reads it. One
 * operation for the extraction service and the bare status alike, so the two
 * commands count the same files the same way. Pure over the readers' bindings
 * and the config's designation matchers; the flavor's word arrives as data.
 */

import picomatch from "picomatch"

import type { Layer } from "./graph.model.ts"
import { ExtractionError } from "./graph.model.ts"

/**
 * What recognition reads off a reader: its binding and its kinds — plain data,
 * never the port (model imports no port; the service hands its readers in).
 */
export type Binding = {
  readonly files: readonly string[]
  readonly kinds: readonly Layer[]
}

export type Designations = {
  /**
   * The config's globs for the kinds a framework names itself — a kind claim
   * over a file whose name does not say it. Absent = nothing designated.
   */
  isAssembly?: (path: string) => boolean
  isDriver?: (path: string) => boolean
  isBoot?: (path: string) => boolean
}

export type Recognition<R extends Binding> = {
  /**
   * The file's kind, most specific claim first: a single-kind reader whose
   * binding matches designates its kind wherever the file sits; then one
   * designation wins over the flavor's word; two designations on one file is a
   * config error, thrown with the file and both keys named.
   */
  kindOf(file: string, flavorLayer: Layer): Layer
  /**
   * The reader for a file of a known kind: the first, in the order given, whose
   * binding matches the path and whose kinds hold the kind — `null` when none
   * does (recognized and open).
   */
  readerOf(file: string, layer: Layer): R | null
}

export const createRecognition = <R extends Binding>({
  readers,
  isAssembly,
  isDriver,
  isBoot,
}: Designations & {
  /** In precedence order: config's bindings first, then the stock readers. */
  readers: readonly R[]
}): Recognition<R> => {
  const bound = readers.map((reader) => ({
    reader,
    matches: picomatch([...reader.files]),
  }))

  const designations: readonly (readonly [
    key: string,
    layer: Layer,
    matches: ((path: string) => boolean) | undefined,
  ])[] = [
    ["assembly", "assembly", isAssembly],
    ["drivers", "driver", isDriver],
    ["boot", "boot", isBoot],
  ]

  return {
    kindOf: (file, flavorLayer) => {
      const designating = bound.find(
        ({ reader, matches }) => reader.kinds.length === 1 && matches(file),
      )
      if (designating) return designating.reader.kinds[0] as Layer
      const designated = designations.filter(([, , matches]) => matches?.(file))
      if (designated.length > 1) {
        // a config mistake found where the file set is — extraction's own
        // failure, actionable, presented by the driver
        throw new ExtractionError(
          "designation-conflict",
          `${file} is designated ${designated.map(([key]) => `"${key}"`).join(" and ")} in deblob config — a file has one kind; narrow the globs`,
        )
      }
      return designated[0]?.[1] ?? flavorLayer
    },
    readerOf: (file, layer) =>
      bound.find(
        ({ reader, matches }) => reader.kinds.includes(layer) && matches(file),
      )?.reader ?? null,
  }
}
