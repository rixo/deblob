export const load = (name: string) => import(`./${name}.ts`)
export const loadDep = () => import(`./dep.js`)
