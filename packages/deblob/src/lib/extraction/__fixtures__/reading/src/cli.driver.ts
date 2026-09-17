import { readFileSync } from "node:fs"
import parser from "some-made-up-parser"
import { pureThing } from "pure-made-up-lib"
import { unclaimedThing } from "unclaimed-made-up-lib"

import { createCliAssembly } from "./cli.assembly.ts"
import { registerSub } from "./sub.driver.ts"

export const main = async () => {
  const cli = parser("made-up")
  const services = await createCliAssembly(process.cwd(), process.env)
  const manifest = readFileSync("package.json", "utf8")
  pureThing(manifest)
  unclaimedThing()
  cli.command("check").action(async (opts) => {
    const result = await services.app.check(opts)
    return result
  })
  cli.command("status").action((opts) => {
    const r = services.app.status(opts)
    if (r.ok) process.exit(0)
    console.log(JSON.stringify(r))
  })
  cli.command("nested").action((opts) => {
    process.on("exit", () => {
      services.app.check(opts)
    })
  })
  registerSub(cli, services)
  const files = process.argv.slice(2)
  files.map((file) => file)
  Promise.resolve().then(() => services.app.check({ cwd: "." }))
  registerDefault(cli)
  cli.command("write").action((opts) => {
    opts.body = 1
    process.exitCode = 1
  })
  registerPage(cli)
}

import registerDefault from "./default.driver.ts"
import registerPage from "./routes/+page.svelte"
