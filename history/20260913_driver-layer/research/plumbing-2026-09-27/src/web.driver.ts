import process from "node:process"

import express from "express"

import { createAppAssembly } from "./app.assembly.ts"
import { registerRoutes } from "./lib/web/routes.driver.ts"

// The root driver: wiring only.
export const main = () => {
  const notes = createAppAssembly({ token: process.env.NOTES_TOKEN })
  const app = express()
  registerRoutes(app, notes.web)
  app.listen(3000)
}
