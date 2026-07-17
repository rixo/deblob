import { join } from "node:path"
import { sep } from "path"
import { one } from "somepkg"
import { thing } from "somepkg/thing"
import { scoped } from "@scope/pkg"
export const use = join("a", sep, String(one), String(thing), String(scoped))
