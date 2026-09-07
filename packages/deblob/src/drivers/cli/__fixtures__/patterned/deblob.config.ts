export default {
  include: ["src/**"],
  // one pattern key exports every module: expanded over src/ through the
  // default mirror, each concrete subpath judged as if listed
  assembly: ["src/api.ts"],
}
