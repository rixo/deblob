export default {
  include: ["src/**"],
  // environment-provided namespaces: nothing on disk, declared so resolution is
  // bypassed — purity is a separate opt-in, by the same pattern
  external: ["$made-up/**", "$made-up:*"],
  pure: ["$made-up:*"],
}
