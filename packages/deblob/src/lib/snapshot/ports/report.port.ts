/**
 * Where the server's own failures go — a bug while serving one project. The
 * driver decides presentation (stderr, full stack); the server keeps serving.
 */

export type Report = (error: unknown) => void
