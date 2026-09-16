// a sub-driver: takes tech and instances from its parent; no call site binds
// them until the graph pass (step 01, checkpoint 3)
export const registerSub = (cli: { command: Function }, services: { app: { check: Function } }) => {
  cli.command("sub").action((opts: unknown) => services.app.check(opts))
}
