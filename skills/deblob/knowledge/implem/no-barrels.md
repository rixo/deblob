---
source: docs/implementation-guide.md §5
---

# No barrels — and what packaging does instead

Within the codebase: **no `index.ts`, no exceptions** — the layer must stay
visible in the import path ([composition-rules](../composition-rules.md)); a
feature barrel is tech debt to be deblob'd, not a convenience.

The flavor's packaging answer: at the **package boundary**, named subpaths keep
the layer visible at package scale:

```jsonc
// package.json
"exports": {
  "./model":   "...",
  "./service": "...",
  "./vite":    "..."
}
```

`import { createIconsService } from "@org/icons/service"` reads exactly like the
in-repo `../icons/icons.service.ts` import — and the composition rule (assembly
only) applies identically.

**Honestly unresolved: what a subpath points at.** Two shapes exist in practice:
the subpath resolving directly to the layer file, and dedicated entry files
(`index.assembly.ts`-style) curating what a subpath exposes — index files, i.e.
barrels at the boundary. Whether the no-barrel rule extends that far is not
settled — owned as an open point in the guide, not papered over. In-codebase
barrels are always debt; package-boundary entry files await a ruling.

Altitude note: the package-boundary question sits at flavor level only by
default — the architecture's packaging dimension is under-articulated (open
research, root PLAN), so the theory has no law here yet. When it rules, this
moves up; expect the card to change.
