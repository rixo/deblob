/**
 * Build stage: copies the shipped teaching content from the repo sources into
 * dist/content — the knowledge cards named by the rule mapping plus their link
 * closure (verbatim, paths mirrored so relative cross-links keep resolving),
 * and the architecture.md § Summary excerpt. Nothing is committed: dist/ is a
 * build artifact, rebuilt on prepack.
 *
 * Run via `pnpm build` (or `pnpm build:content`).
 */

import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, posix } from "node:path"
import { fileURLToPath } from "node:url"

import {
  RULE_CARDS,
  collectMdLinks,
  extractRulesSummary,
} from "../src/lib/explain/rule-content.model.ts"

const packageRoot = fileURLToPath(new URL("..", import.meta.url))
const repoRoot = join(packageRoot, "..", "..")
const contentRoot = join(packageRoot, "dist", "content")

/** BFS over relative md links, repo-relative POSIX paths as nodes. */
const closureOf = (seeds: Iterable<string>): string[] => {
  const seen = new Set<string>()
  const queue = [...seeds]
  while (queue.length > 0) {
    const path = queue.shift() as string
    if (seen.has(path)) continue
    seen.add(path)
    const source = readFileSync(join(repoRoot, path), "utf8")
    for (const target of collectMdLinks(source)) {
      queue.push(posix.normalize(posix.join(posix.dirname(path), target)))
    }
  }
  return [...seen].sort()
}

rmSync(contentRoot, { recursive: true, force: true })

const shipped = closureOf(new Set(Object.values(RULE_CARDS).flat()))
for (const path of shipped) {
  const destination = join(contentRoot, path)
  mkdirSync(dirname(destination), { recursive: true })
  cpSync(join(repoRoot, path), destination)
}

const summary = extractRulesSummary(
  readFileSync(join(repoRoot, "docs/architecture.md"), "utf8"),
)
mkdirSync(join(contentRoot, "docs"), { recursive: true })
writeFileSync(join(contentRoot, "docs/rules-summary.md"), `${summary}\n`)

console.log(`built ${shipped.length} cards + rules summary into dist/content`)
