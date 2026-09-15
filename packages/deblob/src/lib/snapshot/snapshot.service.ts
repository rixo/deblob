/**
 * Snapshots of projects, and the protocol that serves them. `snapshotOf(dir)`
 * is the CLI's check sequence minus the detectors: what `deblob check` would
 * have seen there, folded into the viewer's contract. `serveSnapshots` is the
 * protocol in one place.
 */

import type { ProjectRef, Snapshot } from "@deblob/viewer/snapshot.model"

import { isConfigError } from "../config/config.model.ts"
import type { ResolvedConfig } from "../config/config.service.ts"
import type { ImportGraph } from "../extraction/graph.model.ts"
import type { Channel } from "./ports/channel.port.ts"
import type { ProjectSource } from "./ports/project-source.port.ts"
import type { Report } from "./ports/report.port.ts"
import { snapshotFrom } from "./snapshot.model.ts"

export type SnapshotService = ReturnType<typeof createSnapshotService>

export const createSnapshotService = ({
  source,
  extractionFor,
}: {
  source: ProjectSource
  /** The extraction composed for one config: the engine, the flavor, the claims. */
  extractionFor: (
    config: ResolvedConfig,
  ) => (files: readonly string[]) => Promise<ImportGraph>
}) => {
  const snapshotOf = async (dir: string): Promise<Snapshot> => {
    const config = await source.loadConfig(dir)
    // sorted: the scan's order is the filesystem's, the snapshot's is fixed
    const files = [...(await source.scanCoverage(config))].sort()
    const graph = await extractionFor(config)(files)
    const sizes = await source.sizesOf(config.root, files)
    const name = await source.manifestNameOf(config.root)
    return snapshotFrom({
      config,
      graph,
      sizes,
      name,
      generatedAt: source.now(),
    })
  }

  /**
   * The projects a viewer at `dir` shows: its config's `view.projects`, or the
   * project at `dir` alone — each root with its manifest name.
   */
  const projectsOf = async (dir: string): Promise<ProjectRef[]> => {
    const config = await source.loadConfig(dir)
    const roots =
      config.view.projects.length === 0 ? [config.root] : config.view.projects
    return Promise.all(
      roots.map(async (root) => ({
        root,
        name: await source.manifestNameOf(root),
      })),
    )
  }

  return { snapshotOf, projectsOf }
}

/**
 * On connect: `projects`, then the first project's `snapshot`. On `select`:
 * that project's `snapshot`. The project's own failure — its config — answers
 * `error` for that project. Anything else is a bug: reported in full to the
 * driver, and the client hears that the server failed on that project. Either
 * way the connection lives on.
 */
export const serveSnapshots = ({
  channel,
  projects,
  snapshotOf,
  report,
}: {
  channel: Channel
  projects: readonly ProjectRef[]
  snapshotOf: SnapshotService["snapshotOf"]
  report: Report
}): void => {
  const first = projects[0]
  if (first === undefined) {
    throw new Error("serveSnapshots: no project to serve")
  }
  channel.onClient(async (client) => {
    const serve = async (project: string): Promise<void> => {
      let snapshot: Snapshot
      try {
        snapshot = await snapshotOf(project)
      } catch (error) {
        if (isConfigError(error)) {
          client.send({ type: "error", project, message: error.message })
          return
        }
        report(error)
        client.send({
          type: "error",
          project,
          message: `the server failed on this project — see its log`,
        })
        return
      }
      client.send({ type: "snapshot", snapshot })
    }
    client.onMessage((message) => serve(message.project))
    client.send({ type: "projects", projects })
    await serve(first.root)
  })
}
