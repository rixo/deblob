export const load = async () => {
  const m = await import("./dep.js")
  return m.val
}
export const loadAny = async (path: string) => import(path)
