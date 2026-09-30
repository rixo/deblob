/**
 * Deblob's help screens, as literals — so the docs cannot drift from the
 * binary.
 */

export const HELP = `deblob — machine-checkable hexagonal architecture for TypeScript/ESM

Usage
  deblob                       project status + discovery
  deblob check [what...]       run architecture checks (default: all)
  deblob explain <topic...>    explain rules or checks (service-purity,
                               layers, ...)
  deblob view                  serve the viewer on this project

Checks
  dag        service dependencies form a DAG; no module-level runtime
             cycles (no-service-cycle, no-runtime-cycle)
  layers     dependency matrix by layer suffix; type-only imports exempt
             by default (inward-deps, service-purity, blob-quarantine,
             service-assembly-only, adapter-assembly-only,
             runtime-import, public-unit)
  private    private/ is sealed outside its service (private-sealed)
  barrels    the layer is visible in the import path — no index.ts
             indirection (layer-in-path)
  ports      port files are types only, no runtime exports
             (ports-types-only)
  surface    the exports map matches the layers it fronts — only for
             packages declaring "deblob": {} in package.json
             (layer-in-path, chain-purity)

Options
  -c, --config <path>    config file (default: nearest deblob.config.ts)
  --port <n>             view only: the port to serve on (default 3615)
  --no-color             plain output (NO_COLOR is honored too)
  -h, --help             show this help
  -v, --version          print version

Exit codes
  0  clean    1  violations found    2  usage or config error

deblob detects; it never moves code. Why each rule exists:
https://github.com/rixo/deblob/blob/main/docs/architecture.md
`

export const CHECK_HELP = `Usage
  deblob check              run all checks
  deblob check dag layers   run only the named checks

Options
  --explain        append explanations of every rule that fired
  --explain-only   print only those explanations, skip the violations

All checks run over one shared import graph — naming several costs one
extraction. A violation prints the file, the offending import, and the
broken rule:

  layers  src/invoice/pdf-render.service.ts
    imports node:fs — the service layer cannot depend on concrete
    implementations (service-purity)

Type-only imports (import type / { type X }) are exempt from composition
rules by default (runtime-import) — a flavor axis: strict flavors opt
out in deblob.config.ts. Unsuffixed files are blob: legal, unchecked
except for cycles — labeling is adoption, not a prerequisite
(blob-quarantine guards the boundary: only assembly may import blob).
`
