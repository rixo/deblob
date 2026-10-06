import { builtinModules } from "node:module"

import type { ReaderBinding } from "./recognition.model.ts"
import type { HostReader } from "./host-reader.model.ts"

/**
 * Node's free names beyond the language: the process, the module system's
 * CommonJS names, the timers, and the web platform APIs Node carries as
 * globals. Tech where `node` is bound — `process.argv` in a driver is its tech,
 * `setTimeout` at a service's root a read of the machine.
 */
const GLOBALS: readonly string[] = [
  "process",
  "global",
  "Buffer",
  "console",
  "require",
  "module",
  "exports",
  "setTimeout",
  "setInterval",
  "setImmediate",
  "clearTimeout",
  "clearInterval",
  "clearImmediate",
  "queueMicrotask",
  "structuredClone",
  "performance",
  "crypto",
  "fetch",
  "navigator",
  "WebSocket",
  "WebAssembly",
  "URL",
  "URLSearchParams",
  "URLPattern",
  "AbortController",
  "AbortSignal",
  "Event",
  "EventTarget",
  "CustomEvent",
  "MessageEvent",
  "MessageChannel",
  "MessagePort",
  "BroadcastChannel",
  "TextEncoder",
  "TextDecoder",
  "Blob",
  "File",
  "FormData",
  "Headers",
  "Request",
  "Response",
  "ReadableStream",
  "WritableStream",
  "TransformStream",
  "DOMException",
  "atob",
  "btoa",
]

/**
 * The stock host reader: Node. Its builtin modules are its tech, `node:path`
 * and `node:querystring` the pure ones (string-only, deterministic — GUESS: R5,
 * the curated table moved here from the graph); its free names are tech, and
 * `__dirname`/`__filename` the module's own location (GUESS: R6 — a location
 * where `node` is bound, unclaimed elsewhere). Shipped, bound by the project.
 */
export const createNodeReader = (binding: ReaderBinding = {}): HostReader => {
  // every builtin, both spellings: `fs` and `node:fs`; `node:test` is
  // prefix-only
  const builtins = builtinModules.flatMap((name) =>
    name.startsWith("node:") ? [name] : [name, `node:${name}`],
  )
  return {
    name: "node",
    ...binding,
    globals: GLOBALS,
    locations: ["__dirname", "__filename"],
    tech: builtins,
    pure: ["node:path", "node:querystring", "path", "querystring"],
  }
}
