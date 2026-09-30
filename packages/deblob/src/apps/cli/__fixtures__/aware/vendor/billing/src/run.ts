// the published composition root: re-exports the service under an unsuffixed
// subpath — legal only because the field designates "./run" assembly, which
// seals it to every consumer's wiring
export { createCheckoutService } from "./checkout.service.ts"
