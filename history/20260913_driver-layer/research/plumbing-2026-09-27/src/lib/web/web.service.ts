import { isNotesError } from "../notes/notes.model.ts"
import type { Notes } from "../notes/notes.service.ts"

// What express hands a hook, as far as this service reads it — structural,
// nothing imported from express.
type Request = {
  body?: unknown
  query: Record<string, unknown>
  get(header: string): string | undefined
}
type Response = {
  status(code: number): Response
  json(body: unknown): unknown
  end(): unknown
}
type Next = () => void

// The front service: authorizes, translates, renders, reports expected
// failures. Unexpected ones propagate to express, which answers 500.
export const createWeb = ({
  notes,
  token,
}: {
  notes: Notes
  token: string | undefined
}) => ({
  // no token configured: every request is refused
  authorize: (request: Request, response: Response, next: Next) => {
    if (
      token === undefined ||
      request.get("authorization") !== `Bearer ${token}`
    ) {
      return void response.status(401).end()
    }
    next()
  },
  add: async (request: Request, response: Response) => {
    const { text, pinned } = (request.body ?? {}) as {
      text?: unknown
      pinned?: unknown
    }
    try {
      const note = await notes.add({
        text: typeof text === "string" ? text : "",
        pinned: pinned === true,
      })
      response.status(201).json({ id: note.id })
    } catch (error) {
      if (!isNotesError(error)) throw error
      response.status(400).json({ error: error.code })
    }
  },
  list: async (request: Request, response: Response) => {
    response
      .status(200)
      .json(await notes.list({ pinnedOnly: request.query.pinned === "1" }))
  },
  purge: async (_request: Request, response: Response) => {
    await notes.purge()
    response.status(204).end()
  },
})

export type Web = ReturnType<typeof createWeb>
