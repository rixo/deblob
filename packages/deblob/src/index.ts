/**
 * The package's public surface — the config-authoring contract. Grows
 * deliberately: this is the boundary the 100%-coverage bar measures through.
 */

export { defineConfig } from "./lib/config/config.service.ts"
export type { DeblobConfig } from "./lib/config/config.service.ts"
export type {
  FlavorClassification,
  FlavorResolver,
} from "./lib/extraction/ports/flavor.port.ts"
export type { FlavorLayer } from "./lib/extraction/graph.model.ts"
