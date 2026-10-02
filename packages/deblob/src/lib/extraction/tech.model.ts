import { packageNameOf } from "./graph.model.ts"

/**
 * A reader's `tech` is a list of strings, read by form: `./path` is a project
 * file by its root-relative path, anything else a package by its name (its
 * subpaths included — `cac` covers `cac/deno`). A declaration, never a
 * function: what a config names as tech is read without running it.
 */

/** Whether the list names the package an external specifier points into. */
export const isTechPackage = (
  tech: readonly string[],
  specifier: string,
): boolean => {
  const name = packageNameOf(specifier)
  return name !== null && tech.includes(name)
}

/** Whether the list names the project file at a root-relative path. */
export const isTechFile = (tech: readonly string[], path: string): boolean =>
  tech.includes(`./${path}`)
