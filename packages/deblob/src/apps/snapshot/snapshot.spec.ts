import { execFileSync } from "node:child_process"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vitest"

import type { Snapshot } from "@deblob/viewer/snapshot.model"

import { createRecordingTerminal } from "../../lib/terminal/adapters/recording-terminal.adapter.ts"
import {
  createSnapshotAssembly,
  createSnapshotOver,
} from "./snapshot.assembly.ts"

/** The part of a node process the terminal reads, held in memory. */
const processAt = (cwd: string) => {
  const host = {
    stdout: { write: (chunk: string) => (host.out += chunk) },
    stderr: { write: (chunk: string) => (host.err += chunk) },
    cwd: () => cwd,
    env: {},
    exitCode: undefined as number | string | null | undefined,
    once: () => host,
    out: "",
    err: "",
  }
  return host
}

describe("createSnapshotOver", () => {
  const here = (path: string): string =>
    fileURLToPath(new URL(path, import.meta.url))
  const deblobRoot = here("../../../")
  const brokenConfigDir = here("../../lib/config/__fixtures__/throws")

  const run = async (cwd: string) => {
    const recording = createRecordingTerminal({ cwd })
    await createSnapshotOver(recording.terminal).run()
    return {
      code: recording.code(),
      out: recording.out(),
      err: recording.err(),
    }
  }

  test("writes the cwd's snapshot as one JSON line, exit 0", async () => {
    const { code, out, err } = await run(deblobRoot)
    expect(code).toBe(0)
    expect(err).toBe("")
    expect(out.endsWith("\n")).toBe(true)
    const snapshot = JSON.parse(out) as Snapshot
    expect(snapshot.project.name).toBe("deblob")
    expect(snapshot.modules.map((module) => module.path)).toContain(
      "src/apps/snapshot/snapshot.service.ts",
    )
  })

  test("a local overlay beside the config: provenance names both files", async () => {
    const temp = await mkdtemp(join(tmpdir(), "deblob-snapshot-local-"))
    try {
      await writeFile(join(temp, "deblob.config.ts"), "export default {}\n")
      await writeFile(join(temp, "deblob.local.ts"), "export default {}\n")
      const { code, out } = await run(temp)
      expect(code).toBe(0)
      const snapshot = JSON.parse(out) as Snapshot
      expect(snapshot.project).toEqual({
        root: temp,
        name: null,
        provenance:
          "deblob.config.ts + deblob.local.ts (flavor: ts-suffixes-factories)",
      })
      // the config file is the one covered file, "export default {}\n": the
      // local file, a script beside it, is machine state, never project code
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
      await writeFile(join(temp, "deblob.local.ts"), "export default {}\n")
      const { code, out } = await run(temp)
      expect(code).toBe(0)
      expect((JSON.parse(out) as Snapshot).project.provenance).toBe(
        "deblob.local.ts (flavor: ts-suffixes-factories)",
      )
    } finally {
      await rm(temp, { recursive: true, force: true })
    }
  })

  test("the cwd is the project, exactly: a config above it is not consulted", async () => {
    const cwd = here(".")
    const { code, out } = await run(cwd)
    expect(code).toBe(0)
    const snapshot = JSON.parse(out) as Snapshot
    expect(snapshot.project).toEqual({
      root: cwd.replace(/\/$/, ""),
      name: null,
      provenance: "no config (defaults)",
    })
    expect(snapshot.modules.map((module) => module.path)).toEqual([
      "snapshot.assembly.ts",
      "snapshot.boot.ts",
      "snapshot.driver.ts",
      "snapshot.service.ts",
      "snapshot.spec.ts",
    ])
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

  test("createSnapshotAssembly runs over the process it is given", async () => {
    const host = processAt(brokenConfigDir)
    await createSnapshotAssembly(host).run()
    expect(host.exitCode).toBe(2)
    expect(host.err).not.toBe("")
  })

  test("boot (child process smoke): cwd in, JSON out", () => {
    const out = execFileSync(process.execPath, [here("snapshot.boot.ts")], {
      cwd: deblobRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      // the map's call stacks make deblob's own snapshot a few MB
      maxBuffer: 64 * 1024 * 1024,
    })
    expect((JSON.parse(out) as Snapshot).project.name).toBe("deblob")
  })
})
