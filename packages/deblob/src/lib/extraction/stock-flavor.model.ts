/**
 * The stock flavor's name — owned by the flavor, not by config: the config
 * model defaulting to it and the adapter registering under it both import from
 * here, so neither service reaches into the other (rule 13 — the tool's own
 * first dogfood catch of the dag detector).
 */
export const STOCK_FLAVOR_NAME = "ts-suffixes-factories"
