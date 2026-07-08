---
source: docs/architecture.md § Lifecycle, § Decomposition
---

# Decomposition — drawing boundaries under complexity

The lifecycle is a cause-and-effect cycle: **decompose** to manage complexity →
decomposition creates distance → **reconnect** deliberately under rules that
preserve the isolation ([sharing](sharing.md)). Split, then share.

One motivation at every scale — isolation for manageability:

- **Domain separation** — "users and payments are different concerns": the
  initial cut.
- **Service splitting** — one service juggling too many use cases → nested or
  sibling services.
- **Layer extraction** — computation tangled in orchestration → model
  ([distillation](distillation.md)).

**Signals** (split on these, never on file count):

1. **Test pressure** — the most mechanical: 5 computations × 3 orchestration
   paths = 15 contract cases, vs 5 model tests + 3 service tests after
   extraction. Extract first — cheaper, often sufficient.
2. **Naming pressure** — functions/tests need long qualifiers to disambiguate:
   too many concerns in one place.
3. **Cognitive load** — reading the service means holding too many concerns at
   once.

Escalation: layer extraction first; split the service when extraction isn't
enough. The fractal supports splitting at any depth ([nesting](nesting.md)).
