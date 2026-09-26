import { createBillingAssembly } from "./billing.assembly.ts"

export const main = () => {
  const { charge } = createBillingAssembly()
  process.on("charge", () => {
    console.log("charging")
    return charge()
  })
}
