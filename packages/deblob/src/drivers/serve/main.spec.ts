import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { expect, test } from "vitest"
import WebSocket from "ws"

import type { ServerMessage, Snapshot } from "@deblob/viewer/snapshot.model"

import { main, WS_PATH } from "./main.ts"

const here = (path: string): string =>
  fileURLToPath(new URL(path, import.meta.url))
const viewerRoot = here("../../../../viewer")

/** A real client: the first `count` messages, then closed. */
const receive = (url: string, count: number): Promise<ServerMessage[]> =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    const received: ServerMessage[] = []
    ws.on("error", reject)
    ws.on("message", (data) => {
      received.push(JSON.parse(String(data)) as ServerMessage)
      if (received.length === count) {
        ws.close()
        resolve(received)
      }
    })
  })

test("serves the projects of the cwd's config, then the first snapshot, on /deblob/ws", async () => {
  let out = ""
  const { port, close } = await main({
    cwd: viewerRoot,
    port: 0,
    stdout: { write: (chunk: string) => (out += chunk) },
    stderr: { write: () => {} },
  })
  try {
    expect(out).toBe(
      `deblob serve: ws://127.0.0.1:${port}${WS_PATH} — 1 project(s)\n`,
    )
    const [projects, snapshot] = await receive(
      `ws://127.0.0.1:${port}${WS_PATH}`,
      2,
    )
    expect(projects).toEqual({
      type: "projects",
      projects: [{ root: viewerRoot, name: "@deblob/viewer" }],
    })
    expect(snapshot?.type).toBe("snapshot")
    const { project, stats } = (snapshot as { snapshot: Snapshot }).snapshot
    expect(project.name).toBe("@deblob/viewer")
    expect(stats.files).toBeGreaterThan(0)
  } finally {
    await close()
  }
})

test("the server's own failures go to stderr in full; it keeps serving", async () => {
  let err = ""
  const { port, close } = await main({
    cwd: viewerRoot,
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
  const child = spawn(process.execPath, [here("bin.ts")], {
    cwd: viewerRoot,
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
