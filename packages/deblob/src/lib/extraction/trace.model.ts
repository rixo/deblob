/**
 * An instance followed back to the factory that built it. A driver holds what
 * an assembly handed it: to the reading, an instance whose origin is the
 * assembly's function. The factory behind it — a service's, an adapter's — is
 * found by following the value out of the assembly, through every way a value
 * may leave one (an assembly only builds, and passes on or returns what it
 * built):
 *
 * - A returned record, entry by key — written in place or held in a local,
 *   nested, the last entry of a key winning as in the record;
 * - The instance itself, returned with no record around it;
 * - A parameter passed through, as the caller that hands it has it;
 * - Every return of the function and every caller's reading of it: they all lead
 *   to the same factory, or the value is followed nowhere.
 *
 * What an assembly may not do is not followed: it is red where it stands. A
 * call that builds nothing — nothing says what it returns; a record spread into
 * the returned one — nothing is known of a key past it. Pure over the modules'
 * readings.
 */

import type {
  ArgValue,
  FileReading,
  InstanceOrigin,
  ModuleNode,
  ReadStatement,
} from "./graph.model.ts"

/** Where a followed value ends: the factory, and the members read off it. */
export type Traced = { origin: InstanceOrigin; path: readonly string[] }

/** A step's outcome: where it leads, `null` when nothing can be said. */
type Step = Traced | null

/** Every return in a body, a branch's or a loop's arms included. */
const returnsIn = (statements: readonly ReadStatement[]): ArgValue[] =>
  statements.flatMap((statement) =>
    statement.kind === "return"
      ? statement.returned === null
        ? []
        : [statement.returned]
      : statement.kind === "control"
        ? statement.arms.flatMap(returnsIn)
        : [],
  )

const sameStep = (a: Step, b: Step): boolean =>
  a === null || b === null
    ? a === b
    : a.origin.path === b.origin.path &&
      a.origin.name === b.origin.name &&
      a.origin.layer === b.origin.layer &&
      a.path.join(".") === b.path.join(".")

export const createTrace = (modules: ReadonlyMap<string, ModuleNode>) => {
  /**
   * The readings an assembly function is followed through: the one its call
   * site in `from` opened, when that site is known and binds one; every
   * caller's otherwise; the file's own when nothing binds it.
   */
  const readingsOf = (
    node: ModuleNode,
    name: string,
    site: { file: string; start: number } | null,
  ): readonly FileReading[] => {
    const worlds = node.readings.filter(({ world }) => world.name === name)
    if (worlds.length === 0) return node.reading === null ? [] : [node.reading]
    const bound =
      site === null
        ? undefined
        : worlds.find(
            ({ world }) =>
              world.site.path === site.file &&
              world.site.span.start === site.start,
          )
    return (bound === undefined ? worlds : [bound]).map(
      ({ reading }) => reading,
    )
  }

  /** A value as written in `file`, followed down a member path. */
  const followValue = (
    value: ArgValue,
    path: readonly string[],
    file: string,
    seen: ReadonlySet<string>,
  ): Step => {
    if (value.entries !== null) {
      const [key, ...rest] = path
      // the record itself is no instance: something must be read off it
      if (key === undefined) return null
      // the last entry that gives the key wins, as in the record; a spread
      // met before it may hold the key too: nothing is known past one
      for (const entry of [...value.entries].reverse()) {
        if (entry.key === key) return followValue(entry.value, rest, file, seen)
        if (entry.key === "...") return null
      }
      return null
    }
    if (value.origin === null) return null
    return followOrigin(
      value.origin,
      [...value.path, ...path],
      value.from === null ? null : { file, start: value.from.start },
      seen,
    )
  }

  const followOrigin = (
    origin: InstanceOrigin,
    path: readonly string[],
    site: { file: string; start: number } | null,
    seen: ReadonlySet<string>,
  ): Step => {
    if (origin.layer !== "assembly") return { origin, path }
    const key = `${origin.path}#${origin.name}`
    const node = modules.get(origin.path)
    if (node === undefined || seen.has(key)) return null
    const within = new Set([...seen, key])
    const steps = readingsOf(node, origin.name, site).flatMap((reading) =>
      returnsIn(
        reading.functions.find(
          (candidate) => (candidate.name ?? "default") === origin.name,
        )?.body ?? [],
      ).map((returned) => followValue(returned, path, origin.path, within)),
    )
    const [first] = steps
    return first !== undefined && steps.every((step) => sameStep(step, first))
      ? first
      : null
  }

  /**
   * The factory an instance was built by and the members read off what it
   * built; `null` when the value cannot be followed there.
   */
  const trace = (
    origin: InstanceOrigin,
    path: readonly string[],
  ): Traced | null => followOrigin(origin, path, null, new Set())

  return { trace }
}
