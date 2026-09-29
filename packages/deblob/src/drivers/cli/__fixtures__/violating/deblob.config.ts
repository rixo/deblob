import { hostDriver, node } from "../../../../readers.ts"

export default {
  include: ["src/**"],
  readers: { host: [node()], driver: [hostDriver()] },
}
