import type { ReaderBinding } from "./recognition.model.ts"
import type { DriverReader } from "./driver-reader.model.ts"

/**
 * A driver reader over a framework's packages, claims only — the stock cut, no
 * shape of the framework's own (GUESS: D1). What it buys: a callback handed to
 * the framework (`defineMiddleware(cb)`) is a hook. What it does not: a hook
 * object (`{ name, transform() {} }`, a Vite plugin) is no callback handed over
 * — its methods read as definitions, the framework's own cut owed.
 */
const claimsOf = (
  name: string,
  packages: readonly string[],
  binding: ReaderBinding,
): DriverReader => ({
  name,
  ...binding,
  tech: packages,
})

/** Vite's plugin API: `vite`, and the plugin helpers under it. */
export const createViteReader = (binding: ReaderBinding = {}): DriverReader =>
  claimsOf("vite", ["vite"], binding)

/** Astro: `astro` and its virtual modules (`astro:middleware`, `astro:content`). */
export const createAstroReader = (binding: ReaderBinding = {}): DriverReader =>
  claimsOf(
    "astro",
    ["astro", "astro:middleware", "astro:content", "astro:assets"],
    binding,
  )
