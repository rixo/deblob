/**
 * The plugins of a run, put together and asked. A flavor and the readers are
 * plugins: plain objects a config hands deblob, under a contract. They are
 * known only once the config is read, so nothing is built around them — a run
 * binds them here, over its files, and every question to a plugin goes through
 * what comes back. No other module calls a plugin's function. Pure.
 *
 * Two things are bound: the flavor's word on every file (its kind, with what
 * the readers' bindings and the config's designations add — `recognition`), and
 * the readers of one file, stacked (`of`).
 */

import type { Node } from "@oxc-project/types"

import type { CutAnswer, CutContext } from "./cut.model.ts"
import { answerCallbacks } from "./cut.model.ts"
import type { Exemption, Layer, Role } from "./graph.model.ts"
import type { Knowledge } from "./knowledge.model.ts"
import { knowledgeOf } from "./knowledge.model.ts"
import type { DriverReader } from "./driver-reader.model.ts"
import type { FlavorClassification, FlavorResolver } from "./flavor.model.ts"
import type { ReaderGroups } from "./readers.model.ts"
import type { TestReader } from "./test-reader.model.ts"
import type { Designations } from "./recognition.model.ts"
import { createRecognition } from "./recognition.model.ts"
import { isTechFile, isTechPackage } from "./tech.model.ts"

/** What a run's plugins are bound from: the resolved config satisfies it. */
export type PluginsConfig = Designations & {
  flavor: FlavorResolver
  /**
   * The readers by group, defaults already filled: a driver or test file is
   * read by every reader of its group whose binding reads it, and by none is
   * unread (`driver-reader`); language and host readers give the knowledge.
   */
  readers: ReaderGroups
}

/**
 * The tech a file is read with: its readers' names joined, their exemptions,
 * the first role one of them gives, and every cut that answers on a node.
 */
export type BoundTech = {
  name: string
  exempts: readonly Exemption[]
  roleOf: (chain: readonly string[]) => Role | null
  cut: (node: Node, about: CutContext) => CutAnswer[]
}

/** The plugins bound to one file. */
export type FilePlugins = {
  /** A driver or a test file no reader of its group reads. */
  unread: boolean
  /** One of its readers counts the file as blob, on purpose. */
  asBlob: boolean
  /** Its readers stacked; the default cut alone for a file with none. */
  tech: BoundTech
  /** Whether one of the file's own readers lists the package as its tech. */
  claimsPackage: (specifier: string) => boolean
  /** The same for a project file, by root-relative path. */
  claimsFile: (path: string) => boolean
  /** Whether one of its readers lists any project file. */
  claimsSomeFile: boolean
  /** Whether a host reader bound to the file claims the specifier. */
  hostClaims: (specifier: string) => boolean
  /** What its language and host readers know of free names. */
  knowledge: Knowledge
}

/**
 * The tech an assembly or a boot is read with: the core's, no reader bound
 * (canon: read by the flavor's kind) — nothing claimed, nothing exempt.
 */
export const CORE_TECH = {
  name: "core",
  exempts: [],
  roleOf: () => null,
  cut: answerCallbacks,
} as const satisfies BoundTech

/** Readers stacked on one file: names joined, exemptions unioned, first role. */
const stackedTech = (
  readers: readonly (DriverReader | TestReader)[],
): BoundTech => ({
  name: readers.map((reader) => reader.name).join("+"),
  exempts: [...new Set(readers.flatMap((reader) => reader.exempts ?? []))],
  roleOf: (chain) => {
    for (const reader of readers) {
      const role = "roleOf" in reader ? reader.roleOf({ chain }) : null
      if (role !== null) return role
    }
    return null
  },
  // every reader's cut that answers, with what that reader claims; the
  // default cut last
  cut: (node, about) => [
    ...readers.flatMap((reader) => {
      const cut =
        "cut" in reader
          ? (reader.cut?.({ node, context: about }) ?? null)
          : null
      return cut === null
        ? []
        : [
            {
              cut,
              claims: (target: string) =>
                isTechPackage(reader.tech, target) ||
                isTechFile(reader.tech, target),
            },
          ]
    }),
    ...answerCallbacks(node, about),
  ],
})

export const bindPlugins = (
  { flavor, readers, isAssembly, isBoot }: PluginsConfig,
  /** Coverage set: paths relative to the config root, POSIX-style. */
  files: readonly string[],
) => {
  const classifications = flavor.classify({ files })
  const recognition = createRecognition({
    driver: readers.driver,
    test: readers.test,
    ...(isAssembly ? { isAssembly } : {}),
    ...(isBoot ? { isBoot } : {}),
  })

  /** The flavor's word on a covered file: `classify` is total by contract. */
  const classificationOf = (file: string): FlavorClassification => {
    const classification = classifications.get(file)
    if (!classification) {
      throw new Error(
        `flavor broke its contract: no classification for ${file} (classify must be total)`,
      )
    }
    return classification
  }

  const bound = new Map<string, FilePlugins>()
  const bind = (file: string): FilePlugins => {
    const flavorLayer = classificationOf(file).layer
    const own = [
      ...recognition.driverReadersOf(file, flavorLayer),
      ...recognition.testReadersOf(file, flavorLayer),
    ]
    const hosts = recognition.boundOf(readers.host, file)
    return {
      unread: own.length === 0,
      asBlob: own.some((reader) => reader.blob),
      tech: stackedTech(own),
      claimsPackage: (specifier) =>
        own.some((reader) => isTechPackage(reader.tech, specifier)),
      claimsFile: (path) => own.some((reader) => isTechFile(reader.tech, path)),
      claimsSomeFile: own.some((reader) =>
        reader.tech.some((entry) => entry.startsWith("./")),
      ),
      hostClaims: (specifier) =>
        hosts.some((host) => isTechPackage(host.tech, specifier)),
      knowledge: knowledgeOf(
        recognition.boundOf(readers.language, file),
        hosts,
      ),
    }
  }

  return {
    classificationOf,
    /** The file's kind: the flavor's name, else a binding or a designation. */
    kindOf: (file: string): Layer =>
      recognition.kindOf(file, classificationOf(file).layer),
    /**
     * The flavor's word on export names; a flavor without the rule names
     * nothing.
     */
    isFactory: (name: string): boolean => flavor.isFactory?.({ name }) ?? false,
    /** The plugins bound to a covered file. */
    of: (file: string): FilePlugins => {
      const known = bound.get(file)
      if (known) return known
      const made = bind(file)
      bound.set(file, made)
      return made
    },
  }
}

export type Plugins = ReturnType<typeof bindPlugins>
