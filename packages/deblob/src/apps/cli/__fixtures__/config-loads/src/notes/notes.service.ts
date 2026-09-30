export const createNotes = (settings: { root: string }) => ({
  root: () => settings.root,
})
