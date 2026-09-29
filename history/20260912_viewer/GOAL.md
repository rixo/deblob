# Viewer — the review surface, built for real

The viewer is a browser app, package `@deblob/viewer`, launched by the CLI as
`deblob view`. It shows what a reviewer has to review over a codebase deblob has
extracted: the services and their use cases, the map of the skeleton, and later
the spec, its diff, the tests. The map is one part; the review list is the
product (rixo, spike PLAN § Direction — a stance, not a ruling).

Two spikes explored it (`spike/graph-viz`, `spike/render-bakeoff`) and settled
the engine (ELK, in a worker), the continuity (tween between layouts) and the
interaction requirements. Their code is not carried over: read-only references,
knowledge ported, files never copied.

**How this chapter works.** The design is far from complete and exploration is
ahead, so the chapter is deliberately light: decide a small thing, do it,
iterate or move to the next. Specs are minimal at write time and back-filled as
the step lands. Nothing is built "while we are at it" — every helpful extra is
something to remove by surgery later.

**Success test:** `deblob view` on a codebase opens the viewer, the viewer shows
the extracted codebase, and it follows the codebase as it changes. Everything
beyond that is back-specced as it is decided.

**What it does not buy, ruled now:** no server-side rendering (wanted, not
within reach; a load screen plus a full SPA is the accepted trade); no
change-diffing between extractions (whole snapshots, the tween absorbs the
churn).
