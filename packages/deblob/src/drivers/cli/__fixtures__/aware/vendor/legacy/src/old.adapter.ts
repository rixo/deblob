export const createOldAdapter = () => ({
  send: (payload: string) => `sent ${payload}`,
})
