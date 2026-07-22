import { execFileSync, execSync } from "node:child_process"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { beforeAll, describe, expect, it } from "vitest"

import { main } from "./main.ts"

const here = (path: string): string =>
  fileURLToPath(new URL(path, import.meta.url))

const packageRoot = here("../../..")
const violatingDir = here("__fixtures__/violating")
const cleanDir = here("__fixtures__/clean")
const brokenConfigDir = here("../../lib/config/__fixtures__/throws")

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
  it("--help prints the help screen, exit 0", async () => {
    const { code, out, err } = await run(["--help"])
    expect(code).toBe(0)
    expect(err).toBe("")
    await expect(out).toMatchFileSnapshot("__fixtures__/goldens/help.txt")
  })

  it("check --help prints the check help screen, exit 0", async () => {
    const { code, out } = await run(["check", "--help"])
    expect(code).toBe(0)
    await expect(out).toMatchFileSnapshot("__fixtures__/goldens/check-help.txt")
  })

  it("--version prints the package version, exit 0", async () => {
    const { code, out } = await run(["--version"])
    expect(code).toBe(0)
    expect(out).toMatch(/^deblob \d+\.\d+\.\d+\n$/)
  })
})

describe("usage errors — exit 2, teaching message on stderr", () => {
  it("unknown command", async () => {
    const { code, out, err } = await run(["frobnicate"])
    expect(code).toBe(2)
    expect(out).toBe("")
    expect(err).toContain("frobnicate")
  })

  it("unknown check", async () => {
    const { code, err } = await run(["check", "dag"])
    expect(code).toBe(2)
    expect(err).toContain('unknown check "dag"')
  })

  it("unknown explain topic", async () => {
    const { code, err } = await run(["explain", "SOME_MADE_UP_TOPIC"])
    expect(code).toBe(2)
    expect(err).toContain("SOME_MADE_UP_TOPIC")
  })
})

describe("deblob check", () => {
  it("violating repo: grouped listing golden, exit 1", async () => {
    const { code, out } = await run(["check"])
    expect(code).toBe(1)
    await expect(out).toMatchFileSnapshot(
      "__fixtures__/goldens/check-violating.txt",
    )
  })

  it("named subset runs only those checks", async () => {
    const { code, out } = await run(["check", "ports"])
    expect(code).toBe(1)
    expect(out).toContain("ports")
    expect(out).not.toContain("private/ is sealed")
  })

  it("clean repo: one summary line, exit 0", async () => {
    const { code, out } = await run(["check"], { cwd: cleanDir })
    expect(code).toBe(0)
    expect(out).toMatch(/^0 violations · \d+ files · \d+ edges\n$/)
  })

  it("broken config: teaching error on stderr, exit 2", async () => {
    const { code, out, err } = await run(["check"], { cwd: brokenConfigDir })
    expect(code).toBe(2)
    expect(out).toBe("")
    expect(err).toContain("deblob.config.ts")
  })

  it("--explain appends the crash course for every fired rule", async () => {
    const { code, out } = await run(["check", "--explain"])
    expect(code).toBe(1)
    expect(out).toContain("pdf-render.service.ts")
    expect(out).toContain("rule 2 —")
    expect(out).toContain("rule 4 —")
    expect(out).toContain("rule 10 —")
    expect(out).toContain("rule 12 —")
    expect(out).toContain("card: dependency-matrix")
  })

  it("--explain-only prints the explanations without the listing", async () => {
    const { code, out } = await run(["check", "--explain-only"])
    expect(code).toBe(1)
    expect(out).not.toContain("pdf-render.service.ts")
    expect(out).toContain("rule 4 —")
  })

  it("--explain on a clean repo adds nothing", async () => {
    const { out } = await run(["check", "--explain"], { cwd: cleanDir })
    expect(out).toMatch(/^0 violations · \d+ files · \d+ edges\n$/)
    const only = await run(["check", "--explain-only"], { cwd: cleanDir })
    expect(only.out).toMatch(/^0 violations · \d+ files · \d+ edges\n$/)
  })

  it("-c runs an explicit config from anywhere", async () => {
    const { code, out } = await run(
      ["-c", join(violatingDir, "deblob.config.ts"), "check", "ports"],
      { cwd: cleanDir },
    )
    expect(code).toBe(1)
    expect(out).toContain("SOME_MADE_UP_DEFAULT")
  })
})

describe("deblob explain", () => {
  it("rule-4: summary excerpt, card, canonical URL, exit 0", async () => {
    const { code, out } = await run(["explain", "rule-4"])
    expect(code).toBe(0)
    expect(out).toContain("rule 4 — service cannot depend on concrete")
    expect(out).toContain("card: dependency-matrix")
    expect(out).toContain(
      "https://github.com/rixo/deblob/blob/main/docs/architecture.md#rule-4",
    )
  })

  it("bare number and rule-N resolve identically", async () => {
    expect((await run(["explain", "4"])).out).toBe(
      (await run(["explain", "rule-4"])).out,
    )
  })

  it("a check name explains each of its rules, shared card shown once", async () => {
    const { code, out } = await run(["explain", "private"])
    expect(code).toBe(0)
    expect(out).toContain("rule 12 —")
  })
})

describe("bare deblob — status, always exit 0", () => {
  it("prints the inventory golden", async () => {
    const { code, out, err } = await run([])
    expect(code).toBe(0)
    expect(err).toBe("")
    await expect(out).toMatchFileSnapshot("__fixtures__/goldens/bare.txt")
  })

  it("configless: defaults provenance, empty temp dir", async () => {
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

  it("broken config: stderr teaching error, stat lines skipped, still exit 0", async () => {
    const { code, out, err } = await run([], { cwd: brokenConfigDir })
    expect(code).toBe(0)
    expect(err).not.toBe("")
    expect(out).toContain("config error (details on stderr)")
    expect(out).not.toContain("% blob")
  })
})

describe("color plumbing", () => {
  it("FORCE_COLOR styles, --no-color and NO_COLOR strip", async () => {
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

  it("a TTY stdout styles, a piped one stays plain", async () => {
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
        }),
      }
    } catch (error) {
      const failed = error as { status: number; stdout: string }
      return { status: failed.status, stdout: failed.stdout }
    }
  }

  it("wires argv, cwd, streams, and the exit code", () => {
    const version = spawn(["--version"], violatingDir)
    expect(version.status).toBe(0)
    expect(version.stdout).toMatch(/^deblob \d+\.\d+\.\d+\n$/)

    const check = spawn(["check", "layers"], violatingDir)
    expect(check.status).toBe(1)
    expect(check.stdout).toContain("pdf-render.service.ts")
  })
})
