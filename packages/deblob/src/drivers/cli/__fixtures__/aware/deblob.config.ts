export default {
  include: ["src/**"],
  assembly: ["src/main.ts"],
  // no alias, no install: the sibling resolves through the workspace-style
  // node_modules symlink, exactly as pnpm/npm/yarn materialize it — the
  // zero-config monorepo story, proven with the standard mechanism. No
  // pureLibs either: the sibling's model claim crosses, trust is the
  // dependency model.
}
