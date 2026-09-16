// a sub-driver exported as the default: bound under the "default" key
export default (cli: { command: Function }) => {
  cli.command("default").action(() => {})
}
