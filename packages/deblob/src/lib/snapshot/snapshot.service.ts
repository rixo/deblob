/**
 * Snapshots of projects, and the protocol that serves them. `snapshotOf(root)`
 * is the CLI's check sequence minus the detectors, on the project at `root`
 * exactly, folded into the viewer's contract. `serveSnapshots` is the protocol
 * in one place.
 */

import type {
  MapData,
  ProjectRef,
  ServerMessage,
  Snapshot,
} from "@deblob/viewer/snapshot.model"

import { isConfigError } from "../config/config.model.ts"
import type { ResolvedConfig } from "../config/config.service.ts"
import type { ImportGraph } from "../extraction/graph.model.ts"
import type { Channel } from "./ports/channel.port.ts"
import type { MapFeed } from "./ports/map-feed.port.ts"
import type { ProjectSource } from "./ports/project-source.port.ts"
import type { Report } from "./ports/report.port.ts"
import type { Watch, Watcher } from "./ports/watch.port.ts"
import type { SnapshotRows } from "./snapshot.model.ts"
import { readmeBlocksOf } from "./readme.model.ts"
import { readmeDirsOf, snapshotFrom, watchSetOf } from "./snapshot.model.ts"

export type SnapshotService = ReturnType<typeof createSnapshotService>

/** One run over a project: its snapshot, and what to watch for the next. */
export type ProjectRun = {
  snapshot: Snapshot
  watchSet: readonly string[]
}

export const createSnapshotService = ({
  source,
  extractionFor,
  feed,
}: {
  source: ProjectSource
  /** The extraction composed for one config: the engine, the flavor, the claims. */
  extractionFor: (
    config: ResolvedConfig,
  ) => (files: readonly string[]) => Promise<ImportGraph>
  feed: MapFeed
}) => {
  /**
   * The map's data over a run's fold: its rows, the READMEs of the root and
   * every directory holding a covered file as blocks, the call stacks fed. A
   * tree the call tracer cannot read — any but deblob's, today — still gets its
   * map: no call stacks, and the tracer's word for why. A README that cannot be
   * read has no such excuse: its failure is the run's.
   */
  const mapOf = async (root: string, rows: SnapshotRows): Promise<MapData> => {
    const texts = await source.readmeTextsOf(
      root,
      readmeDirsOf(rows.modules.map(({ path }) => path)),
    )
    const readmes = Object.fromEntries(
      Object.entries(texts).map(([dir, text]) => [dir, readmeBlocksOf(text)]),
    )
    try {
      const sequence = await feed.sequenceOf(root, rows.map)
      return { ...rows.map, sequence, sequenceMissing: null, readmes }
    } catch (error) {
      return {
        ...rows.map,
        sequence: null,
        // the port's contract: an Error whose message says why
        sequenceMissing: (error as Error).message,
        readmes,
      }
    }
  }

  /** The project at `root` exactly — its config, or defaults — run once. */
  const runOf = async (root: string): Promise<ProjectRun> => {
    const config = await source.loadConfigAt(root)
    // sorted: the scan's order is the filesystem's, the snapshot's is fixed
    const files = [...(await source.scanCoverage(config))].sort()
    const graph = await extractionFor(config)(files)
    const sizes = await source.sizesOf(config.root, files)
    const name = await source.manifestNameOf(config.root)
    const dirs = await source.scanCoverageDirs(config)
    const rows = snapshotFrom({
      config,
      graph,
      sizes,
      name,
      generatedAt: source.now(),
    })
    return {
      snapshot: { ...rows, map: await mapOf(config.root, rows) },
      watchSet: watchSetOf(config.root, dirs),
    }
  }

  const snapshotOf = async (root: string): Promise<Snapshot> =>
    (await runOf(root)).snapshot

  /**
   * The set to watch for the project at `root` before a run of it: the same
   * config and directories a run ends with, without the extraction. A run's own
   * set is only known when it ends, and a change under a covered directory
   * during that run would be no event at all — the watcher watches each
   * directory for its own entries.
   */
  const watchSetFor = async (root: string): Promise<readonly string[]> => {
    const config = await source.loadConfigAt(root)
    return watchSetOf(config.root, await source.scanCoverageDirs(config))
  }

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

  return { runOf, snapshotOf, projectsOf, watchSetFor }
}

/**
 * On connect: `projects`, then the first project's `snapshot`, and its watch.
 * On `select`: that project's `snapshot`, the watch moved to it. On change: the
 * current project's `snapshot` again, the watch set refreshed. On close: the
 * watch closed. The watch is up before the answer goes out — the set read ahead
 * of a project's first run, the run's own set before its snapshot — so a change
 * right after a push is a change seen, and so is one during a first run. A set
 * that cannot be read ahead of the run falls back to the root alone: the run
 * fails on the same config and answers for it. Runs for one client never
 * overlap: a change or a select arriving mid-run marks one more run, which
 * follows when this one ends; an answer for a project no longer current is
 * dropped, never sent. The project's own failure — its config — answers `error`
 * for that project, the watch set as it was (the root is in it: fixing the
 * config is a change). Anything else is a bug: reported in full to the driver,
 * and the client hears that the server failed on that project. Either way the
 * connection lives on.
 */
export const serveSnapshots = ({
  channel,
  projects,
  runOf,
  watchSetFor,
  watcher,
  report,
}: {
  channel: Channel
  projects: readonly ProjectRef[]
  runOf: SnapshotService["runOf"]
  watchSetFor: SnapshotService["watchSetFor"]
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
      if (watch !== null) {
        await watch.update(dirs)
        return
      }
      const opened = await watcher.watch(dirs, rerun)
      // the client left while it opened: its close found nothing to close
      if (closed) {
        await opened.close()
        return
      }
      watch = opened
    }

    /**
     * The set to watch before a project's first run — best effort: the root
     * alone when the config cannot be read, or anything else fails. The run
     * makes the same calls and is the one place that says what a failure means:
     * its config error reaches the client, anything else is reported as a bug.
     */
    const firstWatchSet = async (
      project: string,
    ): Promise<readonly string[]> => {
      try {
        return await watchSetFor(project)
      } catch {
        return [project]
      }
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
            if (watch === null) await keepWatching(await firstWatchSet(project))
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
