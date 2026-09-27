export type Note = {
  readonly id: number
  readonly text: string
  readonly pinned: boolean
}

export type NotesErrorCode = "empty-text"

export class NotesError extends Error {
  readonly code: NotesErrorCode
  constructor(code: NotesErrorCode) {
    super(code)
    this.code = code
  }
}

export const isNotesError = (error: unknown): error is NotesError =>
  error instanceof Error &&
  typeof (error as { code?: unknown }).code === "string"
