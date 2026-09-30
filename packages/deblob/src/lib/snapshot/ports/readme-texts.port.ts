/**
 * The READMEs the map shows: each directory's `README.md` text, keyed by the
 * directory given (root-relative, `.` = the root); a directory without one is
 * left out.
 */

export interface ReadmeTexts {
  readmeTextsOf(
    root: string,
    dirs: readonly string[],
  ): Promise<Readonly<Record<string, string>>>
}
