export default {
  include: ["src/**"],
  // no build key: the default dist → src mirror reaches every source module
  // without a build on disk — the check never looks at dist
  assembly: ["src/index.ts"],
}
