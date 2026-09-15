import { spawn } from "node:child_process"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, expect, test } from "vitest"
import WebSocket from "ws"

import type { ServerMessage, Snapshot } from "@deblob/viewer/snapshot.model"

import { main, WS_PATH } from "./main.ts"

const here = (path: string): string =>
  fileURLToPath(new URL(path, import.meta.url))

/**
 * A viewer project of its own, never the real one (a `deblob.local.json`
 * dropped in the viewer package would change its list): a root listing two
 * subprojects, each a bare directory with one covered file — no config of its
 * own: a listed directory is the project, the root's config is not its.
 */
const temps: string[] = []
afterEach(async () => {
  for (const temp of temps.splice(0)) {
    await rm(temp, { recursive: true, force: true })
  }
})
const viewerProject = async () => {
  const root = await mkdtemp(join(tmpdir(), "deblob-serve-"))
  temps.push(root)
  for (const name of ["FAKE_A", "FAKE_B"]) {
    await mkdir(join(root, name, "src"), { recursive: true })
    await writeFile(
      join(root, name, "src", `${name}.ts`),
      "export const x = 1\n",
    )
    await writeFile(
      join(root, name, "package.json"),
      JSON.stringify({ name: `@fake/${name}` }),
    )
  }
  await writeFile(
    join(root, "deblob.config.ts"),
    'export default { view: { projects: ["FAKE_A", "FAKE_B"] } }\n',
  )
  return { root, a: join(root, "FAKE_A"), b: join(root, "FAKE_B") }
}

/** A real client: the first `count` messages, then closed; `after` sees each. */
const receive = (
  url: string,
  count: number,
  after: (ws: WebSocket, received: ServerMessage[]) => void = () => {},
): Promise<ServerMessage[]> =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    const received: ServerMessage[] = []
    ws.on("error", reject)
    ws.on("message", (data) => {
      received.push(JSON.parse(String(data)) as ServerMessage)
      if (received.length === count) {
        ws.close()
        resolve(received)
      } else {
        after(ws, received)
      }
    })
  })

test("serves the projects of the cwd's config, then the first snapshot; select answers the other", async () => {
  const { root, a, b } = await viewerProject()
  let out = ""
  const { port, close } = await main({
    cwd: root,
    port: 0,
    stdout: { write: (chunk: string) => (out += chunk) },
    stderr: { write: () => {} },
  })
  try {
    expect(out).toBe(
      `deblob serve: ws://127.0.0.1:${port}${WS_PATH} — 2 project(s)\n`,
    )
    const [projects, first, second] = await receive(
      `ws://127.0.0.1:${port}${WS_PATH}`,
      3,
      (ws, received) => {
        if (received.length === 2) {
          ws.send(JSON.stringify({ type: "select", project: b }))
        }
      },
    )
    expect(projects).toEqual({
      type: "projects",
      projects: [
        { root: a, name: "@fake/FAKE_A" },
        { root: b, name: "@fake/FAKE_B" },
      ],
    })
    const snapshotOf = (message: ServerMessage | undefined) =>
      (message as { snapshot: Snapshot }).snapshot
    expect(first?.type).toBe("snapshot")
    expect(snapshotOf(first).project).toEqual({
      root: a,
      name: "@fake/FAKE_A",
      provenance: "no config (defaults)",
    })
    expect(snapshotOf(first).modules.map((m) => m.path)).toEqual([
      "src/FAKE_A.ts",
    ])
    expect(second?.type).toBe("snapshot")
    expect(snapshotOf(second).project.root).toBe(b)
    expect(snapshotOf(second).modules.map((m) => m.path)).toEqual([
      "src/FAKE_B.ts",
    ])
  } finally {
    await close()
  }
})

test("a file written under the shown project pushes its snapshot again", async () => {
  const { root, a } = await viewerProject()
  const { port, close } = await main({
    cwd: root,
    port: 0,
    stdout: { write: () => {} },
    stderr: { write: () => {} },
  })
  try {
    const [, first, second] = await receive(
      `ws://127.0.0.1:${port}${WS_PATH}`,
      3,
      (_ws, received) => {
        if (received.length === 2) {
          void writeFile(join(a, "src", "FAKE_NEW.ts"), "export const y = 2\n")
        }
      },
    )
    const pathsOf = (message: ServerMessage | undefined) =>
      (message as { snapshot: Snapshot }).snapshot.modules.map((m) => m.path)
    expect(pathsOf(first)).toEqual(["src/FAKE_A.ts"])
    expect(pathsOf(second)).toEqual(["src/FAKE_A.ts", "src/FAKE_NEW.ts"])
  } finally {
    await close()
  }
})

test("the server's own failures go to stderr in full; it keeps serving", async () => {
  const { root } = await viewerProject()
  let err = ""
  const { port, close } = await main({
    cwd: root,
    port: 0,
    stdout: { write: () => {} },
    stderr: { write: (chunk: string) => (err += chunk) },
  })
  try {
    const ws = new WebSocket(`ws://127.0.0.1:${port}${WS_PATH}`)
    await new Promise<void>((resolve) => ws.on("open", resolve))
    ws.send("{ not json")
    while (!err.includes("malformed client frame")) {
      await new Promise((r) => setTimeout(r, 5))
    }
    expect(err).toContain("ws channel: malformed client frame: { not json")
    // the stack rides along: inspect() prints it
    expect(err).toContain("    at ")
    ws.close()
  } finally {
    await close()
  }
})

test("bin shim (child process smoke): PORT in, the address line out, a client served", async () => {
  const { root } = await viewerProject()
  const child = spawn(process.execPath, [here("bin.ts")], {
    cwd: root,
    env: { ...process.env, PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  })
  try {
    const line = await new Promise<string>((resolve) => {
      child.stdout.once("data", (chunk: Buffer) => resolve(String(chunk)))
    })
    const port = /ws:\/\/127\.0\.0\.1:(\d+)\//.exec(line)?.[1]
    expect(port).toBeDefined()
    const [projects] = await receive(`ws://127.0.0.1:${port}${WS_PATH}`, 1)
    expect(projects?.type).toBe("projects")
  } finally {
    child.kill()
  }
})
