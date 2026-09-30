// the sibling disclosed this subpath in its field's blob: unlabeled abroad,
// so an adapter importing it is concrete-on-concrete, not an
// adapter-assembly-only seal
import { createOldAdapter } from "@fixture/legacy/old.adapter"

export const createGatewayAdapter = () => createOldAdapter()
