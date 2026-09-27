export type Output = {
  write(line: string): void
  // an expected failure: reported, and the run exits non-zero
  fail(line: string): void
}
