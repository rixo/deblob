---
source: docs/architecture.md § Patterns, Config
---

# Config — the ubiquitous port

Config is a port & adapter in disguise. It emerges _inside_ the service (it
feels like it belongs there) — until you need to hydrate it from outside
(environments, consumers, tests), and it turns out to have been a port all
along.

- Config **port** (types, the resolved shape the service needs) lives inside the
  service.
- Config **adapter** (actual values: env files, CLI args, a config service)
  lives outside.
- Injected like any other dependency. No service reads config files or
  environment.

Naming (flavor): `IconsConfig` = resolved shape services receive;
`InputIconsConfig` = pre-hydration user-facing shape — resolving input to
resolved is assembly/adapter work.

Config is singled out for **frequency**, not architectural specialness (the verb
"to be" is irregular because it's frequent). At application level it's often its
own hexagon — a config service with cross-cutting knowledge of what it
configures. That's its nature, not a violation.

Tests inject test config, never production config
([testing-isolation](testing-isolation.md)).
