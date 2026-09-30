export const createConfig = ({ cwd }: { cwd: string }) => ({
  load: async () => ({ root: cwd }),
})
