// Test census: what test files' hooks actually hold, per project — the data
// behind T1 (what a test body may do) and T5 (stable-root on a test's root).
// Usage: node test-census.ts <project root>...
import {
  createProjectSource,
  extractionFor,
} from "/home/rixo/projects/deblob.endgame/packages/deblob/src/drivers/wiring.ts"
import {
  GRAPH_CHECKS,
  runGraphCheck,
} from "/home/rixo/projects/deblob.endgame/packages/deblob/src/lib/check/checks.model.ts"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import type {
  ReadHook,
  ReadStatement,
} from "/home/rixo/projects/deblob.endgame/packages/deblob/src/lib/extraction/graph.model.ts"

type Tally = Record<string, number>
const bump = (t: Tally, k: string, n = 1) => {
  t[k] = (t[k] ?? 0) + n
}

/** The control's form, as written: its first word at the span. */
const formOf = (source: string, start: number): string => {
  const word = /^[A-Za-z]+/.exec(source.slice(start))?.[0]
  return word === "for" || word === "while" || word === "do"
    ? "loop"
    : word === "if" || word === "switch"
      ? word
      : "expression"
}

const shapesIn = (
  statements: readonly ReadStatement[],
  t: Tally,
  source: string,
): void => {
  for (const s of statements) {
    bump(t, `stmt:${s.kind}`)
    if (s.kind === "control") {
      bump(t, `control:${formOf(source, s.span.start)}`)
      if (formOf(source, s.span.start) === "expression")
        bump(
          t,
          `expr-start:${source.slice(s.span.start, s.span.start + 24).replace(/\s+/g, " ")}`,
        )
      shapesIn(s.arms.flat(), t, source)
    }
  }
}

const hooksIn = (hooks: readonly ReadHook[], out: ReadHook[]): void => {
  for (const hook of hooks) {
    out.push(hook)
    hooksIn(hook.hooks, out)
  }
}

for (const root of process.argv.slice(2)) {
  const source = createProjectSource()
  const config = await source.loadConfigAt(root)
  const files = [...(await source.scanCoverage(config))].sort()
  const graph = await extractionFor(config)(files)
  const tests = [...graph.modules.values()].filter((m) => m.layer === "test")
  const t: Tally = {}
  bump(t, "test files", tests.length)
  for (const node of tests) {
    if (node.reading === null) {
      bump(t, "unread")
      continue
    }
    const hooks: ReadHook[] = []
    hooksIn(node.reading.hooks, hooks)
    for (const fn of node.reading.functions) hooksIn(fn.hooks, hooks)
    // leaves: the hooks that hold a test's body (a `describe` holds hooks)
    const leaves = hooks.filter((h) => h.hooks.length === 0)
    bump(t, "hooks (leaf)", leaves.length)
    const source = readFileSync(join(config.root, node.path), "utf8")
    for (const hook of leaves) {
      const inner: Tally = {}
      shapesIn(hook.body, inner, source)
      for (const [k, n] of Object.entries(inner))
        if (k.startsWith("expr-start:"))
          bump(t, k.replace(/[A-Za-z_$][A-Za-z0-9_$]*/g, "x").slice(0, 30), n)
      if (inner["control:loop"]) bump(t, "leaf hooks with a loop")
      if (inner["control:if"] || inner["control:switch"])
        bump(t, "leaf hooks with an if/switch")
      if (inner["control:expression"])
        bump(t, "leaf hooks with a ?:/&&/?? branch")
      if (inner["stmt:assignment"]) bump(t, "leaf hooks with a write")
      if (!inner["stmt:control"] && !inner["stmt:assignment"])
        bump(t, "leaf hooks unconditional, no write")
    }
    bump(t, "root statements", node.reading.root.length)
  }
  const violations = GRAPH_CHECKS.flatMap((c) =>
    runGraphCheck(c, graph, config),
  )
  const inTests = violations.filter(
    (v) => v.check !== "dag" && graph.modules.get(v.file)?.layer === "test",
  )
  for (const v of inTests)
    bump(
      t,
      `test-file red: ${v.rules.join("+")}${"unknown" in v && v.unknown ? " (unknown)" : ""}`,
    )
  console.log(`== ${root.split("/").slice(-2).join("/")}`)
  for (const [k, n] of Object.entries(t).sort())
    console.log(`${String(n).padStart(6)}  ${k}`)
}
