import { execFileSync } from "node:child_process"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "vitest"

import type { Snapshot } from "@deblob/viewer/snapshot.model"

import { main } from "./main.ts"

const here = (path: string): string =>
  fileURLToPath(new URL(path, import.meta.url))
const deblobRoot = here("../../../")
const brokenConfigDir = here("../../lib/config/__fixtures__/throws")

const run = async (cwd: string) => {
  let out = ""
  let err = ""
  const code = await main({
    cwd,
    stdout: { write: (chunk: string) => (out += chunk) },
    stderr: { write: (chunk: string) => (err += chunk) },
  })
  return { code, out, err }
}

test("writes the cwd's snapshot as one JSON line, exit 0", async () => {
  const { code, out, err } = await run(deblobRoot)
  expect(code).toBe(0)
  expect(err).toBe("")
  expect(out.endsWith("\n")).toBe(true)
  const snapshot = JSON.parse(out) as Snapshot
  expect(snapshot.project.name).toBe("deblob")
  expect(snapshot.modules.map((module) => module.path)).toContain(
    "src/drivers/snapshot/main.ts",
  )
})

test("a local overlay beside the config: provenance names both files", async () => {
  const temp = await mkdtemp(join(tmpdir(), "deblob-snapshot-local-"))
  try {
    await writeFile(join(temp, "deblob.config.ts"), "export default {}\n")
    await writeFile(join(temp, "deblob.local.json"), "{}\n")
    const { code, out } = await run(temp)
    expect(code).toBe(0)
    const snapshot = JSON.parse(out) as Snapshot
    expect(snapshot.project).toEqual({
      root: temp,
      name: null,
      provenance:
        "deblob.config.ts + deblob.local.json (flavor: ts-suffixes-factories)",
    })
    // the config file is the one covered file, "export default {}\n"
    expect(snapshot.stats).toEqual({
      files: 1,
      bytes: 18,
      blobPercent: 100,
      services: 0,
    })
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})

test("a lone local file: configless with an overlay, provenance names it", async () => {
  const temp = await mkdtemp(join(tmpdir(), "deblob-snapshot-lone-local-"))
  try {
    await writeFile(join(temp, "deblob.local.json"), "{}\n")
    const { code, out } = await run(temp)
    expect(code).toBe(0)
    expect((JSON.parse(out) as Snapshot).project.provenance).toBe(
      "deblob.local.json (flavor: ts-suffixes-factories)",
    )
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})

test("no config anywhere above: the defaults, the directory as root", async () => {
  const temp = await mkdtemp(join(tmpdir(), "deblob-snapshot-bare-"))
  try {
    await mkdir(join(temp, "src"))
    await writeFile(join(temp, "src", "FAKE.ts"), "export const x = 1\n")
    const { code, out } = await run(temp)
    expect(code).toBe(0)
    const snapshot = JSON.parse(out) as Snapshot
    expect(snapshot.project).toEqual({
      root: temp,
      name: null,
      provenance: "no config (defaults)",
    })
    expect(snapshot.modules.map((module) => module.path)).toEqual([
      "src/FAKE.ts",
    ])
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})

test("a config error: its message on stderr, nothing on stdout, exit 2", async () => {
  const { code, out, err } = await run(brokenConfigDir)
  expect(code).toBe(2)
  expect(out).toBe("")
  expect(err).not.toBe("")
})

test("bin shim (child process smoke): cwd in, JSON out", () => {
  const out = execFileSync(process.execPath, [here("bin.ts")], {
    cwd: deblobRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
  expect((JSON.parse(out) as Snapshot).project.name).toBe("deblob")
})
