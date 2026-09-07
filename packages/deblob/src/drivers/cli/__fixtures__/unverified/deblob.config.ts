export default {
  include: ["src/**"],
  // no build key: the default mirror is dist, the exports map points at
  // build/ — the root entry cannot be reached, the claim cannot be certified
}
