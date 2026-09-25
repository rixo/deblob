// The projects a viewer at `dir` shows, the way `deblob view` reads them:
// `view.projects` from the config found from `dir`, the local file merged in.
import { createProjectSource, extractionFor } from "../../drivers/wiring.ts"
import { createSnapshotService } from "../../lib/snapshot/snapshot.service.ts"
import { createSpikeMapFeed } from "./map-feed.adapter.ts"

export const mapProjects = (dir: string) =>
  createSnapshotService({
    source: createProjectSource(),
    extractionFor,
    feed: createSpikeMapFeed(),
  }).projectsOf(dir)
