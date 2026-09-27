/**
 * What the design's `Viewer.dc.html` is fed, from what the snapshot source
 * holds: their data contract (their reply of 2026-09-27), by value. Step 11
 * SPEC § API.
 */

import type {
  MapSequence,
  ProjectRef,
  ReadmeBlock,
  Snapshot,
} from "../snapshot/snapshot.model.ts"

/**
 * The design's one-object snapshot, from ours: the map's rows in place of the
 * outline's, the call stacks spread in. Their `gen-graph.js`, `call-stack.js`
 * and `sequence-data.js` read it.
 */
export type DesignSnapshot = Omit<Snapshot, "map" | "modules" | "edges"> & {
  readonly modules: Snapshot["map"]["modules"]
  readonly edges: Snapshot["map"]["edges"]
} & Partial<MapSequence>

/** A project in their picker. By value: no URL of theirs is ever given. */
export type DesignProject = {
  readonly id: string
  readonly label: string
  readonly graph: null
  readonly sequence: null
  readonly behavior: null
}

/** Their props, the data half; the host adds `on-project` and `view-store`. */
export type ViewerProps = {
  readonly projects: readonly DesignProject[]
  readonly project: string | null
  readonly graphData: object | null
  readonly sequence: DesignSnapshot | null
  readonly behavior: {
    readonly readmes: Readonly<Record<string, readonly ReadmeBlock[]>>
  } | null
  readonly loading: boolean
  readonly error: string | null
}

/** The props, and the snapshot they were built from: the next call's `previous`. */
export type BuiltProps = {
  readonly props: ViewerProps
  readonly snapshot: Snapshot | null
}

/** What the props are built from: the source's state, as far as it is read. */
export type ViewerInput = {
  readonly projects: readonly ProjectRef[]
  readonly loading: boolean
  readonly error: { readonly message: string } | null
  readonly snapshot: Snapshot | null
}

/** Their `GenGraph.buildGraph`: design code, handed in, never imported. */
export type BuildGraph = (
  snapshot: DesignSnapshot,
  options: { readonly hooks: true },
) => object

/**
 * Their props for one state of the source. The same snapshot as `previous`'s
 * gives back its graph object: a state that only flips `loading` or `error`
 * must not read, on their side, as a new graph to lay out.
 */
export function buildViewerProps(
  _state: ViewerInput,
  _previous: BuiltProps | null,
  _buildGraph: BuildGraph,
): BuiltProps {
  throw new Error("buildViewerProps: not built yet (step 11 cp1, red rows)")
}
