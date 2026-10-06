/**
 * Knowledge — what the language and host readers bound to a file tell the
 * reading about names the file does not bind. The readers are data here (model
 * imports no port; the service hands the bound ones in), their lists unioned:
 * readers of one group stack. The reading asks one question per concern and
 * never holds a table of its own.
 */

/** What a language reader knows, as data. */
export type LanguageKnowledge = {
  readonly globals?: readonly string[]
  readonly literals?: readonly string[]
  readonly locationMeta?: readonly string[]
  readonly mutableConstructors?: readonly string[]
  readonly readonlyTypeNames?: readonly string[]
  readonly mutableTypeNames?: readonly string[]
}

/** What a host reader knows about free names, as data. */
export type HostKnowledge = {
  readonly globals?: readonly string[]
  readonly locations?: readonly string[]
  /**
   * The host's calls that only compute from what they are handed: nothing done,
   * nothing read off the machine (canon: a call is presumed to act "until the
   * reading that claims it declares that call effect-free"). By call, never by
   * name: a free name's call as written (`"URL"` is `new URL(…)`, not
   * `URL.createObjectURL(…)`), a builtin module's export by the module's name.
   */
  readonly effectFree?: {
    readonly globals?: readonly string[]
    readonly exports?: Readonly<Record<string, readonly string[]>>
  }
}

/**
 * A free name, by who claims it: a literal or a computation of the language, a
 * location (the module's own), the host's tech — or nobody's.
 */
export type FreeName =
  "literal" | "language" | "location" | "host" | "unclaimed"

export type Knowledge = {
  freeName(name: string): FreeName
  /**
   * A call the host declares effect-free: a free name's, by the chain called
   * (`"URL"`), or a builtin's export, by its name and the module's.
   */
  isEffectFreeCall(chain: string, module?: string): boolean
  /** An `import.meta` member that is the module's own location. */
  isLocationMeta(member: string): boolean
  /** A constructor whose instances carry mutators. */
  isMutableConstructor(name: string): boolean
  /** A standard type name's word on its values; `null` = not known. */
  typeName(name: string): "readonly" | "mutable" | null
}

const union = (
  lists: readonly (readonly string[] | undefined)[],
): ReadonlySet<string> => new Set(lists.flatMap((list) => list ?? []))

export const knowledgeOf = (
  language: readonly LanguageKnowledge[],
  host: readonly HostKnowledge[],
): Knowledge => {
  const literals = union(language.map((reader) => reader.literals))
  const globals = union(language.map((reader) => reader.globals))
  const locations = union(host.map((reader) => reader.locations))
  const hostGlobals = union(host.map((reader) => reader.globals))
  const locationMeta = union(language.map((reader) => reader.locationMeta))
  const mutableConstructors = union(
    language.map((reader) => reader.mutableConstructors),
  )
  const readonlyTypes = union(
    language.map((reader) => reader.readonlyTypeNames),
  )
  const mutableTypes = union(language.map((reader) => reader.mutableTypeNames))
  const effectFreeGlobals = union(
    host.map((reader) => reader.effectFree?.globals),
  )
  const effectFreeExports = new Set(
    host.flatMap((reader) =>
      Object.entries(reader.effectFree?.exports ?? {}).flatMap(
        ([module, names]) => names.map((name) => `${module}#${name}`),
      ),
    ),
  )
  return {
    isEffectFreeCall: (chain, module) =>
      module === undefined
        ? effectFreeGlobals.has(chain)
        : effectFreeExports.has(`${module}#${chain}`),
    freeName: (name) =>
      literals.has(name)
        ? "literal"
        : globals.has(name)
          ? "language"
          : locations.has(name)
            ? "location"
            : hostGlobals.has(name)
              ? "host"
              : "unclaimed",
    isLocationMeta: (member) => locationMeta.has(member),
    isMutableConstructor: (name) => mutableConstructors.has(name),
    typeName: (name) =>
      mutableTypes.has(name)
        ? "mutable"
        : readonlyTypes.has(name)
          ? "readonly"
          : null,
  }
}
