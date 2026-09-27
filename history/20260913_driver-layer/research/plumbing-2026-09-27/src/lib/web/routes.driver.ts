import express, { type Express } from "express"

import type { Web } from "./web.service.ts"

// The sub-driver: the tech's own middleware, then one hook per route — each
// hands express's event on, untouched, to one use case.
export const registerRoutes = (app: Express, web: Web) => {
  app.use(express.json())
  app.use((request, response, next) => web.authorize(request, response, next))
  app.post("/notes", (request, response) => web.add(request, response))
  app.get("/notes", (request, response) => web.list(request, response))
  app.delete("/notes", (request, response) => web.purge(request, response))
}
