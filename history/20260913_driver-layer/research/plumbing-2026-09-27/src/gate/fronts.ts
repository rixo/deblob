import type { AddressInfo } from "node:net"

import { cac } from "cac"
import express from "express"
import { flushSync, mount, unmount } from "svelte"

import { registerCommands } from "../lib/cli/commands.driver.ts"
import NotesApp from "../lib/ui/NotesApp.svelte"
import { isNotesError, type Note } from "../lib/notes/notes.model.ts"
import { registerRoutes } from "../lib/web/routes.driver.ts"
import { type Front, GATE_TOKEN } from "./gate.ts"
import type { Gate } from "./gate.assembly.ts"

// What a row gives, in the shared service's terms — no front's vocabulary.
export type Inputs = {
  add: { text: string; pinned: boolean }
  list: { pinnedOnly: boolean }
  purge: Record<string, never>
}

// Identity: the shared service, called straight. Runs every row. An expected
// failure comes back as `{ rejected: code }`, the rows' terms for it.
export const identityFront: Front<Inputs> = {
  name: "identity",
  run: {
    add: async (gate, input) => {
      try {
        await gate.app.notes.add(input)
      } catch (error) {
        if (!isNotesError(error)) throw error
        return { rejected: error.code }
      }
    },
    list: async (gate, input) =>
      (await gate.app.notes.list(input)).map((note) => note.text),
    purge: (gate) => gate.app.notes.purge(),
  },
}

// The CLI: a fresh cac, the driver's own commands, real parsing. The argv
// written here is the front's tested surface — what a user types.
const runCli = async (gate: Gate, argv: string[]) => {
  const parser = cac("notes")
  registerCommands(parser, gate.app.cli)
  const [lines, failures] = [
    gate.output.lines.length,
    gate.output.failures.length,
  ]
  parser.parse(["node", "notes", ...argv], { run: false })
  await parser.runMatchedCommand()
  return {
    lines: gate.output.lines.slice(lines),
    failures: gate.output.failures.slice(failures),
  }
}

export const cliFront: Front<Inputs> = {
  name: "cli",
  run: {
    add: async (gate, input) => {
      const { failures } = await runCli(gate, [
        "add",
        input.text,
        ...(input.pinned ? ["--pin"] : []),
      ])
      if (failures.length > 0)
        return { rejected: failures[0].replace(/^error: /, "") }
    },
    // the output inverse: rendered lines back to the row's terms
    list: async (gate, input) =>
      (
        await runCli(gate, ["list", ...(input.pinnedOnly ? ["--pinned"] : [])])
      ).lines.map((line) => line.replace(/^#\d+ (\* )?/, "")),
    // purge: not a command — the CLI declines
  },
}

// The web: a real express app on a free port, the driver's own middleware and
// routes, real HTTP through fetch. The requests written here are the front's
// surface. Exported for the web front's own rows.
export const runWeb = async (
  gate: Gate,
  request: {
    method: string
    path: string
    body?: unknown
    token?: string | null
  },
) => {
  const app = express()
  registerRoutes(app, gate.app.web)
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const listening = app.listen(0, () => resolve(listening))
  })
  try {
    const { port } = server.address() as AddressInfo
    const token = request.token === undefined ? GATE_TOKEN : request.token
    const response = await fetch(`http://localhost:${port}${request.path}`, {
      method: request.method,
      headers: {
        ...(token === null ? {} : { authorization: `Bearer ${token}` }),
        ...(request.body === undefined
          ? {}
          : { "content-type": "application/json" }),
      },
      ...(request.body === undefined
        ? {}
        : { body: JSON.stringify(request.body) }),
    })
    const text = await response.text()
    return {
      status: response.status,
      body: text === "" ? undefined : (JSON.parse(text) as unknown),
    }
  } finally {
    server.close()
  }
}

export const webFront: Front<Inputs> = {
  name: "web",
  run: {
    add: async (gate, input) => {
      const { status, body } = await runWeb(gate, {
        method: "POST",
        path: "/notes",
        body: input,
      })
      if (status === 400) return { rejected: (body as { error: string }).error }
    },
    list: async (gate, input) =>
      (
        (
          await runWeb(gate, {
            method: "GET",
            path: input.pinnedOnly ? "/notes?pinned=1" : "/notes",
          })
        ).body as Note[]
      ).map((note) => note.text),
    purge: async (gate) =>
      void (await runWeb(gate, { method: "DELETE", path: "/notes" })),
  },
}

// The UI: the component mounted in a DOM, used as a user would — type, tick,
// click — and read back from the screen. The interactions written here are
// the front's surface.
const settle = async () => {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
    flushSync()
  }
}

const runUi = async <T>(
  gate: Gate,
  act: (screen: HTMLElement) => Promise<T>,
) => {
  const screen = document.createElement("div")
  document.body.append(screen)
  const component = mount(NotesApp, {
    target: screen,
    props: { ui: gate.app.ui },
  })
  await settle()
  try {
    return await act(screen)
  } finally {
    await unmount(component)
    screen.remove()
  }
}

const shown = (screen: HTMLElement) =>
  [...screen.querySelectorAll("li")].map((item) =>
    item.textContent.replace(/^\* /, ""),
  )

export const uiFront: Front<Inputs> = {
  name: "ui",
  run: {
    add: (gate, input) =>
      runUi(gate, async (screen) => {
        screen.querySelector<HTMLInputElement>('input[name="text"]')!.value =
          input.text
        screen.querySelector<HTMLInputElement>(
          'input[name="pinned"]',
        )!.checked = input.pinned
        screen.querySelector("button")!.click()
        await settle()
        const alert = screen.querySelector('[role="alert"]')
        if (alert) return { rejected: alert.textContent }
      }),
    // the output inverse: shown items back to the row's terms
    list: (gate, input) =>
      runUi(gate, async (screen) => {
        if (input.pinnedOnly) {
          screen
            .querySelectorAll<HTMLInputElement>('input[type="checkbox"]')[1]
            .click()
          await settle()
        }
        return shown(screen)
      }),
    // purge: no control for it — the UI declines
  },
}

export const fronts = [identityFront, cliFront, webFront, uiFront] as const
