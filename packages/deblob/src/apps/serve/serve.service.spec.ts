import { describe, expect, it } from "vitest"

import { createRecordingTerminal } from "../../lib/terminal/adapters/recording-terminal.adapter.ts"
import type { Viewer } from "../../lib/view/ports/viewer.port.ts"
import { createServeApp } from "./serve.service.ts"

describe("createServeApp", () => {
  it("serves the data half alone on PORT, else the dev cycle's port, until stopped", async () => {
    for (const [env, port] of [
      [{ PORT: "4000" }, 4000],
      [{}, 5175],
    ] as const) {
      const recording = createRecordingTerminal({ cwd: "/made-up", env })
      const served: Parameters<Viewer["serve"]>[0][] = []
      let closed = false
      const app = createServeApp({
        terminal: recording.terminal,
        viewer: {
          serve: async (options) => {
            served.push(options)
            return {
              port: options.port,
              close: async () => {
                closed = true
              },
            }
          },
        },
      })
      const done = app.run()
      recording.stop()
      await done
      expect(served).toMatchObject([{ cwd: "/made-up", port, bundle: null }])
      expect([closed, recording.code()]).toEqual([true, 0])
    }
  })
})
