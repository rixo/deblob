export default {
  include: ["src/**"],
  assembly: ["src/main.ts"],
  pure: ["@fixture/billing"],
  // the consumer patch wins over the producer field — reviewer of record
  externalLayers: { "@fixture/billing/checkout.service": "assembly" },
}
