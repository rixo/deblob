import { execFileSync, execSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { beforeAll, describe, expect, test } from "vitest"

import { main } from "./main.ts"

const here = (path: string): string =>
  fileURLToPath(new URL(path, import.meta.url))

const packageRoot = here("../../..")
const VERSION = (
  JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")) as {
    version: string
  }
).version
const violatingDir = here("__fixtures__/violating")
const cleanDir = here("__fixtures__/clean")
const brokenConfigDir = here("../../lib/config/__fixtures__/throws")
const aliasedDir = here("__fixtures__/aliased")
const unresolvableDir = here("__fixtures__/unresolvable")
const externalDir = here("__fixtures__/external")
const awareDir = here("__fixtures__/aware")
const legacyDir = here("__fixtures__/aware/vendor/legacy")
const billingDir = here("__fixtures__/aware/vendor/billing")
const declaringDir = here("__fixtures__/declaring")
const fieldNewerDir = here("__fixtures__/field-newer")
const builtDir = here("__fixtures__/built")
const patternedDir = here("__fixtures__/patterned")
const unverifiedDir = here("__fixtures__/unverified")

type RunResult = { code: number; out: string; err: string }

const run = async (
  argv: string[],
  options: Partial<{
    cwd: string
    env: Record<string, string>
    isTTY: boolean
  }> = {},
): Promise<RunResult> => {
  let out = ""
  let err = ""
  const code = await main({
    argv,
    cwd: options.cwd ?? violatingDir,
    stdout: {
      write: (chunk: string) => (out += chunk),
      ...(options.isTTY === undefined ? {} : { isTTY: options.isTTY }),
    },
    stderr: { write: (chunk: string) => (err += chunk) },
    env: options.env ?? {},
  })
  return { code, out, err }
}

beforeAll(() => {
  // the explain paths read the shipped content — build it like prepack does
  execSync("node scripts/build-content.ts", { cwd: packageRoot })
})

describe("help / version", () => {
  test("--help prints the help screen, exit 0", async () => {
    const { code, out, err } = await run(["--help"])
    expect(code).toBe(0)
    expect(err).toBe("")
    await expect(out).toMatchFileSnapshot("__fixtures__/goldens/help.txt")
  })

  test("check --help prints the check help screen, exit 0", async () => {
    const { code, out } = await run(["check", "--help"])
    expect(code).toBe(0)
    await expect(out).toMatchFileSnapshot("__fixtures__/goldens/check-help.txt")
  })

  test("--version prints the package version, exit 0", async () => {
    const { code, out } = await run(["--version"])
    expect(code).toBe(0)
    expect(out).toMatch(/^deblob \d+\.\d+\.\d+\n$/)
  })
})

describe("usage errors — exit 2, teaching message on stderr", () => {
  test("unknown command", async () => {
    const { code, out, err } = await run(["frobnicate"])
    expect(code).toBe(2)
    expect(out).toBe("")
    expect(err).toContain("frobnicate")
  })

  test("unknown check", async () => {
    const { code, err } = await run(["check", "SOME_MADE_UP_CHECK"])
    expect(code).toBe(2)
    expect(err).toContain('unknown check "SOME_MADE_UP_CHECK"')
  })

  test("unknown explain topic", async () => {
    const { code, err } = await run(["explain", "SOME_MADE_UP_TOPIC"])
    expect(code).toBe(2)
    expect(err).toContain("SOME_MADE_UP_TOPIC")
  })
})

describe("deblob check", () => {
  test("violating repo: grouped listing golden, exit 1", async () => {
    const { code, out } = await run(["check"])
    expect(code).toBe(1)
    await expect(out).toMatchFileSnapshot(
      "__fixtures__/goldens/check-violating.txt",
    )
  })

  test("run below the config root: paths print cwd-relative, ctrl+clickable", async () => {
    const { code, out } = await run(["check"], {
      cwd: `${violatingDir}/src`,
    })
    expect(code).toBe(1)
    expect(out).toContain("  ../src/billing/stripe.adapter.ts")
    expect(out).toContain("imports ../src/invoice/private/totals.model.ts")
  })

  test("named subset runs only those checks", async () => {
    const { code, out } = await run(["check", "ports"])
    expect(code).toBe(1)
    expect(out).toContain("ports")
    expect(out).not.toContain("private/ is sealed")
  })

  test("check dag alone reports both cycle shapes", async () => {
    const { code, out } = await run(["check", "dag"])
    expect(code).toBe(1)
    expect(out).toContain("cross-service")
    expect(out).toContain("src/billing ⇄ src/invoice")
    expect(out).toContain("(type-only)")
    expect(out).toContain("runtime module cycle (no-runtime-cycle)")
    expect(out).not.toContain("private/ is sealed")
  })

  test("explain dag prints both cycle rules, shared card once", async () => {
    const { code, out } = await run(["explain", "dag"])
    expect(code).toBe(0)
    expect(out).toContain("no-service-cycle —")
    expect(out).toContain("no-runtime-cycle —")
    expect(out).toContain("card: acyclic")
    expect(out).toContain("card: acyclic — shown above")
  })

  test("explain swallows the footer's whole rule list in one run", async () => {
    const { code, out } = await run([
      "explain",
      "layer-in-path",
      "ports-types-only",
      "barrels",
    ])
    expect(code).toBe(0)
    expect(out).toContain("layer-in-path —")
    expect(out).toContain("ports-types-only —")
  })

  test("unknown topics among several: exit 2, every offender named", async () => {
    const { code, err } = await run([
      "explain",
      "service-purity",
      "SOME_MADE_UP_TOPIC",
      "some-made-up-rule",
    ])
    expect(code).toBe(2)
    expect(err).toContain('"SOME_MADE_UP_TOPIC"')
    expect(err).toContain('"some-made-up-rule"')
    expect(err).not.toContain('"service-purity"')
    // no number among them: no lecture about numbers
    expect(err).not.toContain("rule numbers")
  })

  test("a 0.0.4-era number is refused with the line that says rules are named now", async () => {
    for (const topic of ["4", "rule-4"]) {
      const { code, out, err } = await run(["explain", topic])
      expect(code).toBe(2)
      expect(out).toBe("")
      expect(err).toContain(`unknown topic "${topic}"`)
      expect(err).toContain("rule numbers are gone since 0.0.5")
      expect(err).toContain("deblob check prints the names")
      expect(err).toContain("deblob explain <check>")
    }
  })

  test("clean repo: the summary and coverage lines, no exports segment without a field, exit 0", async () => {
    const { code, out } = await run(["check"], { cwd: cleanDir })
    expect(code).toBe(0)
    expect(out).toMatch(
      /^0 violations · \d+ files · \d+kb · \d+% blob\n\d+ services? · \d+ imports\n$/,
    )
  })

  test("aliased repo: tsconfig paths + config alias both land edges — violations prove them", async () => {
    const { code, out } = await run(["check"], { cwd: aliasedDir })
    expect(code).toBe(1)
    // resolved module paths in the messages = the aliases became in-set edges
    expect(out).toContain("imports src/lib/some-made-up.service.ts")
    expect(out).toContain("imports src/lib/other-made-up.service.ts")
  })

  test("unresolvable literal import: exit 2, stderr teaches, listing still prints", async () => {
    const { code, out, err } = await run(["check"], { cwd: unresolvableDir })
    expect(code).toBe(2)
    expect(out).toContain("0 violations")
    expect(err).toContain("resolution failed")
    expect(err).toContain("some-made-up-missing-package")
    expect(err).toContain('config key "alias"')
    expect(err).toContain('config key "external"')
  })

  test("external repo: declared patterns land leaves (no unresolved), `pure` ratifies by pattern", async () => {
    const { code, out, err } = await run(["check"], { cwd: externalDir })
    expect(err).toBe("")
    expect(code).toBe(1)
    // the pure-declared namespace stays silent; the other fires as concrete
    expect(out).toContain("imports $made-up/config (declared)")
    expect(out).not.toContain("$made-up:tokens.scss")
  })

  test("aware sibling: the crossed service identity seals to assembly, the crossed model is pure — trust is the dependency model", async () => {
    const { code, out, err } = await run(["check"], { cwd: awareDir })
    expect(err).toBe("")
    expect(code).toBe(1)
    // the service entry fires from the consumer's service…
    expect(out).toContain("src/consumer.service.ts")
    expect(out).toContain("imports @fixture/billing/checkout.service")
    expect(out.replace(/\n +/g, " ")).toContain(
      "assembly-only; import type is fine (service-assembly-only, runtime-import)",
    )
    // …not from assembly; the model entry is green with no `pure` line, and
    // the disclosed adapter of the other sibling is unlabeled — no
    // adapter-assembly-only seal
    expect(out).not.toContain("totals.model")
    expect(out).not.toContain("gateway.adapter")
    // the sibling's declared-assembly entry is wiring: sealed to the
    // consumer's wiring — fires from the adapter, silent from main.ts
    expect(out).toContain("src/report.adapter.ts")
    expect(out.replace(/\n +/g, " ")).toContain(
      "imports @fixture/billing/run — adapters may not import assembly (inward-deps)",
    )
    expect(out).not.toContain("src/main.ts")
    expect(out).toContain("2 violations (2 layers)")
  })

  test("declared-assembly entry at home: the re-exporting root is a carve-out — nothing to verify, green", async () => {
    const { code, out, err } = await run(["check"], { cwd: billingDir })
    expect(err).toBe("")
    expect(code).toBe(0)
    expect(out).not.toContain("surface")
    // the claim is visible on the coverage line: two subpaths checked, the
    // designated root carved out
    expect(out).toContain("· exports 2 checked, 1 disclosed\n")
  })

  test("externalLayers: blob revokes a sibling's model claim — back to unlabeled, service-purity fires", async () => {
    const { code, out } = await run(
      ["check", "layers", "-c", "revoked.config.ts"],
      { cwd: awareDir },
    )
    expect(code).toBe(1)
    expect(out.replace(/\n +/g, " ")).toContain(
      "imports @fixture/billing/totals.model — unclassified third-party in a pure layer",
    )
    expect(out).toContain("3 violations (3 layers)")
  })

  test("disclosing package at home: the laundering root listed in blob goes green — confessed, not hidden", async () => {
    const { code, out, err } = await run(["check"], { cwd: legacyDir })
    expect(err).toBe("")
    expect(code).toBe(0)
    expect(out).not.toContain("surface")
    expect(out).toContain("· exports 0 checked, 2 disclosed\n")
  })

  test("externalLayers patch wins over the producer field — reviewer of record", async () => {
    const { code, out } = await run(
      ["check", "layers", "-c", "patched.config.ts"],
      { cwd: awareDir },
    )
    expect(code).toBe(1)
    // assembly-crossed, not service-crossed: the patch reclassified the entry
    expect(out.replace(/\n +/g, " ")).toContain(
      "imports @fixture/billing/checkout.service — service may not import assembly (inward-deps)",
    )
  })

  test("declaring package: surface verifies the exports claims at the producer's own gate", async () => {
    const { code, out, err } = await run(["check"], { cwd: declaringDir })
    expect(err).toBe("")
    expect(code).toBe(1)
    // the lying subpath: claims model, fronts the adapter file
    expect(out).toContain('is exported as "./totals.model"')
    expect(out).toContain("the entry claims model,")
    expect(out).toContain("the file is adapters")
    // the laundering shape: designated-assembly entry re-exporting the adapter
    expect(out).toContain(
      'is exported as "." — an unlabeled entry fronting adapters',
    )
    // the truthful subpath stays silent
    expect(out).toContain("2 violations (2 surface)")
    expect(out).toContain("· exports 3 checked\n")
  })

  test("a field key this version cannot honor: exit 2, loud at home, never silent", async () => {
    const { code, out, err } = await run(["check"], { cwd: fieldNewerDir })
    expect(code).toBe(2)
    expect(out).toBe("")
    expect(err).toContain('"flavor"')
    expect(err).toContain('honors "blob" and "assembly" only')
  })

  test("built package: the default mirror reaches source through dist — the laundering root fires citing the source, wearing its built name", async () => {
    const { code, out, err } = await run(["check"], { cwd: builtDir })
    expect(err).toBe("")
    expect(code).toBe(1)
    expect(out).toContain("src/index.ts")
    expect(out.replace(/\n +/g, " ")).toContain(
      'is exported as "." (as dist/index.js) — an unlabeled entry fronting service (src/checkout.service.ts)',
    )
    // the suffixed subpaths reach their sources and match; package.json is
    // not a module target
    expect(out).toContain("1 violation (1 surface)")
    expect(out).toContain("· exports 3 checked\n")
  })

  test("pattern export: the star expands over src/ through the mirror — the unlabeled concrete subpath fires, the suffixed ones match", async () => {
    const { code, out, err } = await run(["check"], { cwd: patternedDir })
    expect(err).toBe("")
    expect(code).toBe(1)
    expect(out).toContain("src/api.ts")
    expect(out.replace(/\n +/g, " ")).toContain(
      'is exported as "./api" (as dist/api.js) — an unlabeled entry fronting service (src/checkout.service.ts)',
    )
    expect(out).toContain("1 violation (1 surface)")
    // the star bound three stems — coverage counts concrete subpaths
    expect(out).toContain("· exports 3 checked\n")
  })

  test("unverified surface: an entry under no mirror root cannot be certified — stderr block, exit 2, until mapped", async () => {
    const { code, out, err } = await run(["check"], { cwd: unverifiedDir })
    expect(code).toBe(2)
    expect(out).not.toContain("surface")
    // the claim reached nothing — the line says so, the block says why
    expect(out).toContain("· exports 0 checked\n")
    expect(err).toContain(
      "surface unverified — 1 entry could not be reached; the claim cannot be certified",
    )
    expect(err).toContain("build/index.js")
    expect(err.replace(/\n */g, " ")).toContain(
      'exported as "." — under no build mirror root, not a covered module',
    )
    expect(err.replace(/\n */g, " ")).toContain('config key "build"')
    expect(err.replace(/\n */g, " ")).toContain('"deblob": { "blob": ["."] }')
    // the non-module targets never appear
    expect(err).not.toContain("theme.css")
    expect(err).not.toContain("package.json\n")

    const mapped = await run(["check", "-c", "mirrored.config.ts"], {
      cwd: unverifiedDir,
    })
    expect(mapped.err).toBe("")
    expect(mapped.code).toBe(0)
    expect(mapped.out).toContain("· exports 1 checked\n")
  })

  test("broken config: teaching error on stderr, exit 2", async () => {
    const { code, out, err } = await run(["check"], { cwd: brokenConfigDir })
    expect(code).toBe(2)
    expect(out).toBe("")
    expect(err).toContain("deblob.config.ts")
  })

  test("check surface named by hand on a package with no field: one stderr note, no exports segment, exit 0 — a pass it never ran does not read as a pass", async () => {
    const named = await run(["check", "surface"], { cwd: cleanDir })
    expect(named.code).toBe(0)
    expect(named.err).toBe(
      'surface: no "deblob" field in package.json — nothing to check; declaring is opting in ("deblob": {})\n',
    )
    expect(named.out).not.toContain("exports")
    // the default run says the same by omission — nothing demanded of a
    // package that did not opt in
    const all = await run(["check"], { cwd: cleanDir })
    expect(all.err).toBe("")
    // named on a declaring package: no note, the segment as usual
    const declared = await run(["check", "surface"], { cwd: billingDir })
    expect(declared.err).toBe("")
    expect(declared.out).toContain("· exports 2 checked, 1 disclosed\n")
    // surface left out of the selection: nothing checked, no segment
    const others = await run(["check", "layers"], { cwd: billingDir })
    expect(others.out).not.toContain("exports")
  })

  test("--explain appends the crash course for every fired rule", async () => {
    const { code, out } = await run(["check", "--explain"])
    expect(code).toBe(1)
    expect(out).toContain("pdf-render.service.ts")
    expect(out).toContain("layer-in-path —")
    expect(out).toContain("service-purity —")
    expect(out).toContain("ports-types-only —")
    expect(out).toContain("private-sealed —")
    expect(out).toContain("card: dependency-matrix")
    // entries follow the summary's order, not the checks' run order
    expect(out.indexOf("layer-in-path —")).toBeLessThan(
      out.indexOf("service-purity —"),
    )
    expect(out.indexOf("service-purity —")).toBeLessThan(
      out.indexOf("private-sealed —"),
    )
  })

  test("--explain-only prints the explanations without the listing", async () => {
    const { code, out } = await run(["check", "--explain-only"])
    expect(code).toBe(1)
    expect(out).not.toContain("pdf-render.service.ts")
    expect(out).toContain("service-purity —")
  })

  test("--explain on a clean repo adds nothing", async () => {
    const { out } = await run(["check", "--explain"], { cwd: cleanDir })
    expect(out).toMatch(
      /^0 violations · \d+ files · \d+kb · \d+% blob\n\d+ services? · \d+ imports\n$/,
    )
    const only = await run(["check", "--explain-only"], { cwd: cleanDir })
    expect(only.out).toMatch(
      /^0 violations · \d+ files · \d+kb · \d+% blob\n\d+ services? · \d+ imports\n$/,
    )
  })

  test("-c runs an explicit config from anywhere", async () => {
    const { code, out } = await run(
      ["-c", join(violatingDir, "deblob.config.ts"), "check", "ports"],
      { cwd: cleanDir },
    )
    expect(code).toBe(1)
    expect(out).toContain("SOME_MADE_UP_DEFAULT")
  })
})

describe("deblob explain", () => {
  test("a slug: summary excerpt, card, the URL pinned to this package's version, exit 0", async () => {
    const { code, out } = await run(["explain", "service-purity"])
    expect(code).toBe(0)
    expect(out).toContain("service-purity — service cannot depend on concrete")
    expect(out).toContain("card: dependency-matrix")
    expect(out).toContain(
      `https://github.com/rixo/deblob/blob/v${VERSION}/docs/architecture.md#service-purity`,
    )
  })

  test("a check name explains each of its rules, shared card shown once", async () => {
    const { code, out } = await run(["explain", "private"])
    expect(code).toBe(0)
    expect(out).toContain("private-sealed —")
  })
})

describe("bare deblob — status, always exit 0", () => {
  test("prints the inventory golden", async () => {
    const { code, out, err } = await run([])
    expect(code).toBe(0)
    expect(err).toBe("")
    await expect(out).toMatchFileSnapshot("__fixtures__/goldens/bare.txt")
  })

  test("configless: defaults provenance, empty temp dir", async () => {
    const temp = await mkdtemp(join(tmpdir(), "deblob-bare-"))
    try {
      const { code, out } = await run([], { cwd: temp })
      expect(code).toBe(0)
      expect(out).toContain("no config (defaults)")
      expect(out).toContain("0 files · 0kb · 0% blob")
      expect(out).toContain("0 services")
    } finally {
      await rm(temp, { recursive: true, force: true })
    }
  })

  test("a declaring package: the claim tallied at scan speed — claimed, not checked", async () => {
    const { code, out, err } = await run([], { cwd: billingDir })
    expect(code).toBe(0)
    expect(err).toBe("")
    expect(out).toContain("  1 service · exports 2 claimed, 1 disclosed\n")
    // a claim the check cannot certify is still the claim as written
    const unverified = await run([], { cwd: unverifiedDir })
    expect(unverified.out).toContain("· exports 1 claimed\n")
  })

  test("a field this version cannot read: the teaching line on stderr, the segment skipped, still exit 0", async () => {
    const { code, out, err } = await run([], { cwd: fieldNewerDir })
    expect(code).toBe(0)
    expect(err).toContain('honors "blob" and "assembly" only')
    expect(out).toContain("% blob")
    expect(out).not.toContain("exports")
  })

  test("broken config: stderr teaching error, stat lines skipped, still exit 0", async () => {
    const { code, out, err } = await run([], { cwd: brokenConfigDir })
    expect(code).toBe(0)
    expect(err).not.toBe("")
    expect(out).toContain("config error (details on stderr)")
    expect(out).not.toContain("% blob")
  })
})

describe("color plumbing", () => {
  test("FORCE_COLOR styles, --no-color and NO_COLOR strip", async () => {
    const forced = await run(["check"], { env: { FORCE_COLOR: "1" } })
    expect(forced.out).toContain("[")
    const flagged = await run(["--no-color", "check"], {
      env: { FORCE_COLOR: "1" },
    })
    expect(flagged.out).not.toContain("[")
    const envKilled = await run(["check"], {
      env: { FORCE_COLOR: "1", NO_COLOR: "1" },
    })
    expect(envKilled.out).not.toContain("[")
  })

  test("a TTY stdout styles, a piped one stays plain", async () => {
    expect((await run(["check"], { isTTY: true })).out).toContain("[")
    expect((await run(["check"], { isTTY: false })).out).not.toContain("[")
  })
})

describe("bin shim (child process smoke)", () => {
  const bin = here("bin.ts")

  const spawn = (args: string[], cwd: string) => {
    try {
      return {
        status: 0,
        stdout: execFileSync(process.execPath, [bin, ...args], {
          cwd,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        }),
        stderr: "",
      }
    } catch (error) {
      const failed = error as { status: number; stdout: string; stderr: string }
      return {
        status: failed.status,
        stdout: failed.stdout,
        stderr: failed.stderr,
      }
    }
  }

  test("wires argv, cwd, streams, and the exit code", () => {
    const version = spawn(["--version"], violatingDir)
    expect(version.status).toBe(0)
    expect(version.stdout).toMatch(/^deblob \d+\.\d+\.\d+\n$/)

    const check = spawn(["check", "layers"], violatingDir)
    expect(check.status).toBe(1)
    expect(check.stdout).toContain("pdf-render.service.ts")
  })

  test("an ESM .ts config under a CommonJS-typed package teaches the .mts rename — only Node's own loader shows it", () => {
    // npm 11's `npm init -y` writes "type": "commonjs"; the in-process suite
    // loads configs through vitest and never sees this — the shim does
    const check = spawn(["check"], here("__fixtures__/cjs-typed"))
    expect(check.status).toBe(2)
    expect(check.stderr.replace(/\n +/g, " ")).toMatch(
      /deblob\.config\.ts is written as ESM but loaded as CommonJS.*rename it deblob\.config\.mts.*"type": "module"/s,
    )
  })
})
