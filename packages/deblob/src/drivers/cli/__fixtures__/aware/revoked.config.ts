export default {
  include: ["src/**"],
  assembly: ["src/main.ts"],
  // the override lane: blob revokes the sibling's model claim — back to
  // unlabeled, the pureLibs trichotomy decides (and nothing ratifies it)
  externalLayers: { "@fixture/billing/totals.model": "blob" },
}
