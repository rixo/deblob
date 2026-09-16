/**
 * Snapshots of projects, and the protocol that serves them. `snapshotOf(root)`
 * is the CLI's check sequence minus the detectors, on the project at `root`
 * exactly, folded into the viewer's contract. `serveSnapshots` is the protocol
 * in one place.
 */

import type {
  ProjectRef,
  ServerMessage,
  Snapshot,
} from "@deblob/viewer/snapshot.model"

import { isConfigError } from "../config/config.model.ts"
import type { ResolvedConfig } from "../config/config.service.ts"
import type { ImportGraph } from "../extraction/graph.model.ts"
import type { Channel } from "./ports/channel.port.ts"
import type { ProjectSource } from "./ports/project-source.port.ts"
import type { Report } from "./ports/report.port.ts"
import type { Watch, Watcher } from "./ports/watch.port.ts"
import { snapshotFrom, watchSetOf } from "./snapshot.model.ts"

export type SnapshotService = ReturnType<typeof createSnapshotService>

/** One run over a project: its snapshot, and what to watch for the next. */
export type ProjectRun = {
  snapshot: Snapshot
  watchSet: readonly string[]
}

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
  /** The project at `root` exactly — its config, or defaults — run once. */
  const runOf = async (root: string): Promise<ProjectRun> => {
    const config = await source.loadConfigAt(root)
    // sorted: the scan's order is the filesystem's, the snapshot's is fixed
    const files = [...(await source.scanCoverage(config))].sort()
    const graph = await extractionFor(config)(files)
    const sizes = await source.sizesOf(config.root, files)
    const name = await source.manifestNameOf(config.root)
    const dirs = await source.scanCoverageDirs(config)
    return {
      snapshot: snapshotFrom({
        config,
        graph,
        sizes,
        name,
        generatedAt: source.now(),
      }),
      watchSet: watchSetOf(config.root, dirs),
    }
  }

  const snapshotOf = async (root: string): Promise<Snapshot> =>
    (await runOf(root)).snapshot

  /**
   * The projects a viewer at `dir` shows: the config of the project containing
   * `dir` (discovery, as the CLI) names them in `view.projects`, or that
   * project alone — each root with its manifest name. Every root is a project
   * by declaration: `snapshotOf` reads it exactly, never an ancestor.
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

  return { runOf, snapshotOf, projectsOf }
}

/**
 * On connect: `projects`, then the first project's `snapshot`, and its watch.
 * On `select`: that project's `snapshot`, the watch moved to it. On change: the
 * current project's `snapshot` again, the watch set refreshed. On close: the
 * watch closed. The watch is up before the answer goes out — the root alone
 * before a project's first run, the run's set before its snapshot — so a change
 * right after a push is a change seen. Runs for one client never overlap: a
 * change or a select arriving mid-run marks one more run, which follows when
 * this one ends; an answer for a project no longer current is dropped, never
 * sent. The project's own failure — its config — answers `error` for that
 * project, the watch set as it was (the root is in it: fixing the config is a
 * change). Anything else is a bug: reported in full to the driver, and the
 * client hears that the server failed on that project. Either way the
 * connection lives on.
 */
export const serveSnapshots = ({
  channel,
  projects,
  runOf,
  watcher,
  report,
}: {
  channel: Channel
  projects: readonly ProjectRef[]
  runOf: SnapshotService["runOf"]
  watcher: Watcher
  report: Report
}): void => {
  const first = projects[0]
  if (first === undefined) {
    throw new Error("serveSnapshots: no project to serve")
  }
  channel.onClient(async (client) => {
    let current = first.root
    let watch: Watch | null = null
    let closed = false
    let running: Promise<void> | null = null
    let again = false

    const keepWatching = async (dirs: readonly string[]): Promise<void> => {
      if (watch === null) watch = await watcher.watch(dirs, rerun)
      else await watch.update(dirs)
    }

    /** One run of `project`: the answer, and the set to watch before it goes. */
    const serve = async (
      project: string,
    ): Promise<{
      answer: ServerMessage
      watchSet: readonly string[] | null
    }> => {
      try {
        const { snapshot, watchSet } = await runOf(project)
        return { answer: { type: "snapshot", snapshot }, watchSet }
      } catch (error) {
        if (isConfigError(error)) {
          return {
            answer: { type: "error", project, message: error.message },
            watchSet: null,
          }
        }
        report(error)
        return {
          answer: {
            type: "error",
            project,
            message: `the server failed on this project — see its log`,
          },
          watchSet: null,
        }
      }
    }

    /** Runs never overlap: one more after the current, at most. */
    const rerun = (): void => {
      if (running !== null) {
        again = true
        return
      }
      running = (async () => {
        try {
          do {
            if (closed) break
            again = false
            const project = current
            if (watch === null) await keepWatching([project])
            const { answer, watchSet } = await serve(project)
            if (closed || project !== current) continue
            if (watchSet !== null) await keepWatching(watchSet)
            client.send(answer)
          } while (again)
        } finally {
          running = null
        }
      })()
      running.catch(report)
    }

    client.onMessage(async (message) => {
      // the list the client was sent is the whole menu: anything else is
      // answered and never run — a client asking for a directory it was not
      // offered is a bug, or a page that is not ours
      if (!projects.some(({ root }) => root === message.project)) {
        client.send({
          type: "error",
          project: message.project,
          message: "not a project this server shows",
        })
        return
      }
      current = message.project
      const previous = watch
      watch = null
      if (previous !== null) await previous.close()
      // superseded while the old watch closed: the later select runs
      if (current !== message.project) return
      rerun()
      await running
    })
    client.onClose(async () => {
      closed = true
      if (watch !== null) await watch.close()
    })
    client.send({ type: "projects", projects })
    rerun()
    await running
  })
}
