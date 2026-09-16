// a model file: knowledge — a function, a factory, a frozen table at root
export const normalize = (cwd: string): string => cwd.replace(/\/$/, "")

export const createRegistry = () => new Map<string, string>()

export const TABLE = Object.freeze({ SOME_MADE_UP_KEY: 1 })
