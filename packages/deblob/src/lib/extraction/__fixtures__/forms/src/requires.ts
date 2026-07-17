const dep = require("./dep.js")
const name = "./dep.js"
const viaVariable = require(name)
const broken = require()
export const use = [dep.val, viaVariable, broken]
