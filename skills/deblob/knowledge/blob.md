---
source: docs/architecture.md (intro, Rules 5)
---

# The blob — and why the project is called deblob

The **blob** is pre-architectural code: files with no layer suffix, no layer
declaration, no guarantees. Not an insult — a _stage_: assembly before it has
been organised.

- The architecture is **methodically retrofitable**: start from a working
  prototype (all blob), separate concerns into services, surface use cases into
  `.service.ts`, extract types and pure functions into `.model.ts`. What remains
  suffixless IS the blob — it shrinks as extraction proceeds.
- **Deblobbing = fighting codebase entropy, methodically.** Growth pushes code
  toward tangle; every extraction pulls it back into layers with guarantees.
- Hard rule while blob exists: **only assembly may import it** (Rule 5).
  Anything else importing blob contaminates a layer that promised guarantees —
  the label becomes a lie. See [dependency-matrix](dependency-matrix.md).
- The architecture doesn't require greenfield; it **reveals itself in existing
  code under the pressure of testing**.

New code either respects the layers or feeds the blob — there is no neutral.
