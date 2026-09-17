// tracked locals: non-exported top-level functions the reader sees whole,
// read at each site as the site's own code — and the ones it cannot
import { createThing } from "./thing.service.ts"

const register = (target, thing) => {
  target.on("ready", () => thing.run())
  return thing
}
const twice = (n) => (n > 0 ? twice(n - 1) : n)
const passed = () => 1
const dead = () => 1
function pick(a, b) {
  if (a) return a
  return b
}

export const main = () => {
  const thing = createThing()
  const bound = register(process, thing)
  register(thing, process)
  twice(2)
  ;[1].map(passed)
  const picked = pick(thing, 1, 2)
  const none = register()
  touch(thing)
  setup({ cli: process, services: thing })
  register(() => 1, ...[thing])
  setup(thing)
  setup({ ...process.env, "cli": process, [process.title]: 1, other: 2 })
  return { bound, picked, none }
}

const touch = (t) => {
  t.run()
}
const setup = ({ cli, services }) => {
  cli.command("s").action(() => services.run())
}
const one = () => 1,
  two = () => 2
