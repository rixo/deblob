// ESM syntax under a "type": "commonjs" package — npm 11's `npm init -y`
// default: Node reads this file as CommonJS and chokes on `export`
export default {
  include: ["src/**"],
}
