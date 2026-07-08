---
source: docs/architecture.md (intro, Rules 5)
---

# The blob — and why the project is called deblob

The **blob** is pre-architectural code: files with no layer suffix, no layer
declaration, no guarantees. Not an insult — a _stage_: code no layer has been
ruled for yet, owned as debt until distillation places it.

- The architecture is **methodically retrofitable**: start from a working
  prototype (all blob), separate concerns into services, surface use cases into
  `.service.ts`, extract types and pure functions into `.model.ts`. What remains
  suffixless IS the blob — it shrinks as extraction proceeds.
- **Deblobbing = fighting codebase entropy, methodically.** Growth pushes code
  toward tangle; every extraction pulls it back into layers with guarantees.
- Hard rule while blob exists: **only assembly may import it** (Rule 5).
  Anything else importing blob contaminates a layer that promised guarantees —
  the label becomes a lie. See [dependency-matrix](dependency-matrix.md).
- **Blob is not assembly** ([layer-assembly](layer-assembly.md)): blob is
  unqualified code owned as debt; assembly is code _ruled_ necessary for wiring.
  Logic stuffed into assembly is blob hiding under a label that seems to allow
  it — own it as blob instead (suffixless, assembly-only importable): the debt
  stays visible.
- The architecture doesn't require greenfield; it **reveals itself in existing
  code under the pressure of testing**.

New code either respects the layers or feeds the blob — there is no neutral.
