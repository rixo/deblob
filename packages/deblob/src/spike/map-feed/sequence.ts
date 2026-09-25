/**
 * SPIKE (2026-09-25, map feed) — rewritten 100% before anything ships; delete
 * with src/spike. The 2026-09-23 sequence probe rev. 2
 * (tmp/sequence-snapshot.probe.ts), moved in near-verbatim: the script body is
 * now `sequenceSnapshot(root, fine)`. deblob's own tree only: the driver half
 * below is hand-read from our CLI and throws on any other project.
 *
 * Takes the fine snapshot (tmp/fine-snapshot.probe.ts output) and adds the
 * driving side the prototype wants, on purpose misrepresenting our CLI:
 *
 * - `src/drivers/cli/main.ts` is presented as a driver (config says assembly)
 * - Each command is a hook, each command-specific flag a sub-hook
 * - Each hook carries its call tree, read statically from the source: every call
 *   in the handler, in source order, followed into the callee's body across
 *   files, stopped at ports and external packages; every call keeps the
 *   branches / loops / callbacks it sits under (`guards`)
 *
 * The tracer is the graph-viz spike's (deblob-spike, scripts/graph-dump.ts,
 * step 03) re-written with three additions: services held in an object
 * (`deps.loader`), typed parameters (`loader: Deps["loader"]`,
 * `ReturnType<typeof createX>`, port types), and functions defined inside a
 * factory body.
 */

import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import { dirname, join, relative, resolve as resolvePath } from "node:path"

import { createProjectSource } from "../../drivers/wiring.ts"
import { createNodeFs } from "../../lib/fs/adapters/node-fs.adapter.ts"
import { createConfigLoader } from "../../lib/config/adapters/loader.adapter.ts"

const require_ = createRequire(import.meta.url)
const { parseSync } = require_("oxc-parser")
const { ResolverFactory } = require_("oxc-resolver")

export async function sequenceSnapshot(
  rootArg: string,
  fine: any,
): Promise<any> {
  const source = createProjectSource()
  const config: any = await source.loadConfigAt(resolvePath(rootArg))
  const root: string = config.root
  const tsconfigPath = await createConfigLoader({
    fs: createNodeFs(),
  }).tsconfigPathOf(config)
  // the resolver adapter's settings (oxc-resolver.adapter.ts), sync for the probe
  const oxcResolver = new ResolverFactory({
    conditionNames: ["import", "require", "node", "default"],
    extensions: [
      ".ts",
      ".tsx",
      ".mts",
      ".cts",
      ".js",
      ".jsx",
      ".mjs",
      ".cjs",
      ".json",
    ],
    extensionAlias: {
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    },
    builtinModules: true,
    ...(tsconfigPath
      ? { tsconfig: { configFile: tsconfigPath, references: "auto" } }
      : {}),
    ...(config.alias
      ? {
          alias: Object.fromEntries(
            Object.entries(config.alias).map(([k, t]) => [
              k,
              [...(t as string[])],
            ]),
          ),
        }
      : {}),
  })
  const engine = {
    resolve: (fromAbs: string, specifier: string) => {
      const r = oxcResolver.sync(dirname(fromAbs), specifier)
      return r.path ? { kind: "file", path: r.path } : { kind: "unresolved" }
    },
  }

  // ---- return types: the TypeScript 7 checker over the project's tsconfig -------
  // (deblob's own extraction is oxc-only; the checker is the probe's addition)

  const { API } = await import(require_.resolve("typescript/unstable/sync"))
  const tsIs = await import(require_.resolve("typescript/unstable/ast/is"))
  const tsApi = new API({ cwd: root })
  const tsProject = tsApi
    .updateSnapshot({ openProjects: [join(root, "tsconfig.json")] })
    .getProjects()[0]
  /**
   * Per file: a call's end offset → the type of its value, as TypeScript prints
   * it
   */
  const returnTypes = new Map<string, Map<number, string>>()
  const returnsAt = (path: string, end: number): string | null => {
    let byEnd = returnTypes.get(path)
    if (!byEnd) {
      byEnd = new Map()
      returnTypes.set(path, byEnd)
      const sf = tsProject?.program.getSourceFile(join(root, path))
      if (sf) {
        const calls: any[] = []
        const visit = (n: any) => {
          if (tsIs.isCallExpression(n) || tsIs.isNewExpression(n)) calls.push(n)
          n.forEachChild(visit)
        }
        sf.forEachChild(visit)
        const types =
          calls.length > 0 ? tsProject.checker.getTypeAtLocation(calls) : []
        calls.forEach((c, i) => {
          const t = types[i]
          if (t)
            byEnd!.set(c.end, oneLine(tsProject.checker.typeToString(t), 160))
        })
      }
    }
    return byEnd.get(end) ?? null
  }

  // ---- the misrepresentation: our CLI as a driver ------------------------------

  const DRIVER_MODULE = "src/drivers/cli/main.ts"
  /** Hand-read from src/lib/cli/cli.model.ts (CliAction, parseCli, strayFlags). */
  const HOOKS: {
    name: string
    usage: string
    case: string
    subs: { name: string; usage: string; case?: string; field?: string }[]
  }[] = [
    { name: "status", usage: "deblob", case: "status", subs: [] },
    {
      name: "check",
      usage: "deblob check [checks…]",
      case: "check",
      subs: [
        {
          name: "--explain",
          usage: "deblob check --explain",
          field: "explain",
        },
        {
          name: "--explain-only",
          usage: "deblob check --explain-only",
          field: "explainOnly",
        },
        { name: "--help", usage: "deblob check --help", case: "check-help" },
      ],
    },
    {
      name: "explain",
      usage: "deblob explain <topics…>",
      case: "explain",
      subs: [],
    },
    {
      name: "view",
      usage: "deblob view",
      case: "view",
      subs: [
        { name: "--port", usage: "deblob view --port <n>", field: "port" },
      ],
    },
    { name: "help", usage: "deblob --help", case: "help", subs: [] },
    { name: "version", usage: "deblob --version", case: "version", subs: [] },
  ]

  // ---- the map's modules -------------------------------------------------------

  type ModuleInfo = { layer: string; serviceRoot: string | null }
  const modules = new Map<string, ModuleInfo>(
    fine.modules.map((m: any) => [
      m.path,
      { layer: m.layer, serviceRoot: m.serviceRoot ?? null },
    ]),
  )
  const layerOf = (path: string): string =>
    path === DRIVER_MODULE ? "driver" : (modules.get(path)?.layer ?? "?")

  // ---- AST helpers (oxc ESTree) ------------------------------------------------

  type N = any

  const walk = (
    node: N,
    fn: (n: N, ancestors: N[]) => boolean | void,
    ancestors: N[] = [],
  ): void => {
    if (!node || typeof node !== "object") return
    if (Array.isArray(node)) {
      for (const c of node) walk(c, fn, ancestors)
      return
    }
    const isNode = typeof node.type === "string"
    if (isNode && fn(node, ancestors) === false) return
    const next = isNode ? [...ancestors, node] : ancestors
    for (const [k, v] of Object.entries(node)) {
      if (k === "type" || k === "start" || k === "end" || k === "span") continue
      if (v && typeof v === "object") walk(v, fn, next)
    }
  }
  const unwrap = (n: N): N => {
    while (
      n &&
      (n.type === "AwaitExpression" ||
        n.type === "TSAsExpression" ||
        n.type === "TSNonNullExpression" ||
        n.type === "TSSatisfiesExpression" ||
        n.type === "ParenthesizedExpression" ||
        n.type === "ChainExpression")
    )
      n = n.argument ?? n.expression
    return n
  }
  const isFn = (n: N): boolean =>
    !!n &&
    (n.type === "ArrowFunctionExpression" ||
      n.type === "FunctionExpression" ||
      n.type === "FunctionDeclaration")
  const keyName = (k: N): string | null =>
    k?.type === "Identifier"
      ? k.name
      : typeof k?.value === "string"
        ? k.value
        : null
  const strOf = (n: N): string | null =>
    n?.type === "Literal" && typeof n.value === "string"
      ? n.value
      : n?.type === "TemplateLiteral" && n.expressions.length === 0
        ? (n.quasis[0].value.cooked ?? null)
        : null
  /**
   * `a.b.c` → ["a", "b", "c"]; null when any hop is computed or the root is not
   * a name.
   */
  /**
   * Why a call stayed unbound — a measurement (which unbound calls are misses
   * of ours, which are right to leave out), not a verdict. `computed`: the
   * callee is no name chain; `held-refused`: a held value called in a shape
   * `onHeld` declines; `global` / `builtin-method`: the language's own, by name
   * only (a user method named `get` counts as builtin); `unresolved`: the rest,
   * the candidates.
   */
  const GLOBALS = new Set(
    "Array Object JSON Math Number String Boolean Symbol Promise Map Set WeakMap WeakSet Error TypeError RangeError SyntaxError Date RegExp Reflect console process Buffer URL URLSearchParams structuredClone parseInt parseFloat isNaN setTimeout clearTimeout queueMicrotask BigInt Intl TextEncoder TextDecoder AbortController fetch".split(
      " ",
    ),
  )
  const BUILTIN_METHODS = new Set(
    "push pop shift unshift slice splice map flatMap filter reduce find findIndex findLast some every includes indexOf lastIndexOf join concat sort reverse keys values entries forEach at fill flat get set has delete add clear split replace replaceAll startsWith endsWith trim trimStart trimEnd padStart padEnd toLowerCase toUpperCase charAt charCodeAt codePointAt match matchAll test exec repeat localeCompare normalize substring toString toFixed then catch finally call apply bind stringify parse assign freeze fromEntries isArray from of all allSettled race resolve reject max min floor ceil round abs log warn error".split(
      " ",
    ),
  )
  const unboundWhy = (
    chain: string[] | null,
    refused: string | null,
    params: () => Set<string>,
  ) =>
    refused ??
    (chain === null
      ? "computed"
      : GLOBALS.has(chain[0]!)
        ? "global"
        : chain.length > 1 && BUILTIN_METHODS.has(chain.at(-1)!)
          ? "builtin-method"
          : params().has(chain[0]!)
            ? "param"
            : "unresolved")
  /** Names the parameters of `fns` bind (destructuring included). */
  const paramNames = (fns: N[]): Set<string> => {
    const out = new Set<string>()
    const add = (p: N): void => {
      if (!p) return
      if (p.type === "Identifier") out.add(p.name)
      else if (p.type === "AssignmentPattern") add(p.left)
      else if (p.type === "RestElement") add(p.argument)
      else if (p.type === "TSParameterProperty") add(p.parameter)
      else if (p.type === "ArrayPattern") p.elements.forEach(add)
      else if (p.type === "ObjectPattern")
        for (const q of p.properties) add(q.type === "Property" ? q.value : q)
    }
    for (const fn of fns) for (const p of fn?.params ?? []) add(p)
    return out
  }

  const chainOf = (c: N): string[] | null => {
    const out: string[] = []
    let n = unwrap(c)
    while (n?.type === "MemberExpression") {
      if (n.computed) return null
      out.unshift(n.property?.name ?? "?")
      n = unwrap(n.object)
    }
    if (n?.type === "ThisExpression") out.unshift("this")
    else if (n?.type === "Identifier") out.unshift(n.name)
    else return null
    return out
  }
  const typeArgs = (t: N): N[] =>
    (t?.typeArguments ?? t?.typeParameters)?.params ?? []
  const oneLine = (text: string, max = 100): string => {
    const flat = text.replace(/\s+/g, " ").trim()
    return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
  }

  // ---- files -------------------------------------------------------------------

  type File = {
    path: string
    abs: string
    text: string
    program: N
    lineAt: (offset: number) => number
    /** Local name → where it comes from (null module = external package). */
    imports: Map<
      string,
      { module: string | null; name: string; specifier: string }
    >
    /** Top-level functions (and object literals of functions), by name. */
    locals: Map<string, N>
    /** Top-level type aliases and interfaces, by name. */
    types: Map<string, N>
    /**
     * Top-level object literals holding functions: dispatch tables
     * (`DETECTORS[check](…)`).
     */
    tables: Map<string, N>
  }

  const fileCache = new Map<string, File | null>()

  const declares = (body: N[], name: string): boolean =>
    body.some(
      (s: N) =>
        s.type === "ExportNamedDeclaration" &&
        !s.source &&
        (s.declaration
          ? s.declaration.id?.name === name ||
            s.declaration.declarations?.some((d: N) => d.id?.name === name) ||
            false
          : s.specifiers?.some((sp: N) => keyName(sp.exported) === name)),
    )

  /** A name imported through a barrel, followed to the file that declares it. */
  const originOf = (
    module: string,
    name: string,
    depth = 0,
  ): { module: string; name: string } => {
    if (depth > 4 || name === "*" || name === "default") return { module, name }
    const file = fileOf(module)
    if (!file) return { module, name }
    const body = file.program.body
    if (declares(body, name)) return { module, name }
    for (const s of body) {
      if (s.type === "ExportNamedDeclaration" && s.source) {
        const sp = s.specifiers?.find((sp: N) => keyName(sp.exported) === name)
        if (sp) {
          const target = resolveSpecifier(file.abs, s.source.value)
          if (target)
            return originOf(target, keyName(sp.local) ?? name, depth + 1)
        }
      }
    }
    for (const s of body) {
      if (s.type === "ExportAllDeclaration" && !s.exported) {
        const target = resolveSpecifier(file.abs, s.source.value)
        if (!target) continue
        const r = originOf(target, name, depth + 1)
        const rf = fileOf(r.module)
        if (rf && declares(rf.program.body, r.name)) return r
      }
    }
    return { module, name }
  }

  const resolveSpecifier = (
    fromAbs: string,
    specifier: string,
  ): string | null => {
    const res = engine.resolve(fromAbs, specifier)
    if (res.kind !== "file") return null
    const rel = relative(root, res.path).split("\\").join("/")
    return rel.startsWith("..") ? null : rel
  }

  function fileOf(path: string): File | null {
    if (fileCache.has(path)) return fileCache.get(path) ?? null
    fileCache.set(path, null)
    const abs = join(root, path)
    let text: string
    let program: N
    try {
      text = readFileSync(abs, "utf8")
      program = parseSync(abs, text).program
    } catch {
      return null
    }
    const starts = [0]
    for (let i = 0; i < text.length; i++)
      if (text[i] === "\n") starts.push(i + 1)
    const lineAt = (offset: number): number => {
      let lo = 0
      let hi = starts.length - 1
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1
        if (starts[mid]! <= offset) lo = mid
        else hi = mid - 1
      }
      return lo + 1
    }
    const file: File = {
      path,
      abs,
      text,
      program,
      lineAt,
      imports: new Map(),
      locals: new Map(),
      types: new Map(),
      tables: new Map(),
    }
    fileCache.set(path, file)
    const addImport = (local: string, specifier: string, name: string) => {
      const resolved = resolveSpecifier(abs, specifier)
      const origin = resolved === null ? null : originOf(resolved, name)
      file.imports.set(local, {
        module: origin?.module ?? resolved,
        name: origin?.name ?? name,
        specifier,
      })
    }
    for (const stmt of program.body) {
      if (stmt.type !== "ImportDeclaration") continue
      for (const sp of stmt.specifiers ?? [])
        addImport(
          sp.local.name,
          stmt.source.value,
          sp.type === "ImportSpecifier"
            ? (keyName(sp.imported) ?? "?")
            : sp.type === "ImportDefaultSpecifier"
              ? "default"
              : "*",
        )
    }
    // `const { x } = await import("…")` anywhere in the file
    walk(program, (n) => {
      if (n.type !== "VariableDeclarator" || n.id?.type !== "ObjectPattern")
        return
      const init = unwrap(n.init)
      if (init?.type !== "ImportExpression") return
      const specifier = strOf(init.source)
      if (specifier === null) return
      for (const p of n.id.properties)
        if (p.type === "Property" && p.value?.type === "Identifier")
          addImport(p.value.name, specifier, keyName(p.key) ?? "?")
    })
    for (const stmt of program.body) {
      const d = stmt.type === "ExportNamedDeclaration" ? stmt.declaration : stmt
      if (!d) continue
      if (d.type === "FunctionDeclaration" && d.id)
        file.locals.set(d.id.name, d)
      if (d.type === "VariableDeclaration")
        for (const decl of d.declarations) {
          const init = unwrap(decl.init)
          if (decl.id?.type === "Identifier" && isFn(init))
            file.locals.set(decl.id.name, init)
          if (
            decl.id?.type === "Identifier" &&
            init?.type === "ObjectExpression" &&
            init.properties.some(
              (p: N) => p.type === "Property" && isFn(unwrap(p.value)),
            )
          )
            file.tables.set(decl.id.name, init)
        }
      if (
        d.type === "TSTypeAliasDeclaration" ||
        d.type === "TSInterfaceDeclaration"
      )
        file.types.set(d.id.name, d)
    }
    return file
  }

  // ---- what a name holds -------------------------------------------------------

  /**
   * What a name in scope stands for, when the tracer can tell:
   *
   * - Instance: the object a `createX` factory returned (calls on it are its
   *   keys)
   * - Member: one key of such an object, pulled out (`const { run } = createX()`)
   * - Port: a value typed by a port type (calls on it stop at the port)
   * - External: an instance of an external package's factory
   */
  type Held =
    | { kind: "instance"; module: string; factory: string }
    | { kind: "member"; module: string; factory: string; member: string }
    | { kind: "port"; module: string | null; type: string }
    | { kind: "external"; specifier: string; name: string }
  /** Name (or dotted path: `deps.loader`) → what it holds. */
  type Env = Map<string, Held>

  const isPortModule = (module: string | null): boolean =>
    module !== null &&
    (layerOf(module) === "port" || /\.port\.ts$/.test(module))

  /** A factory named in `file`, by its local name → where it is declared. */
  const factoryRef = (file: File, name: string): Held | null => {
    if (!/^create[A-Z]/.test(name)) return null
    const imp = file.imports.get(name)
    if (imp) {
      if (imp.module === null)
        return { kind: "external", specifier: imp.specifier, name: imp.name }
      return { kind: "instance", module: imp.module, factory: imp.name }
    }
    if (file.locals.has(name))
      return { kind: "instance", module: file.path, factory: name }
    return null
  }

  /**
   * A type, read as what a value of it holds: one thing, or an object of
   * things.
   */
  type TypeRead = { held: Held } | { shape: Map<string, TypeRead> } | null

  const typeRead = (file: File, t: N, depth = 0): TypeRead => {
    if (!t || depth > 6) return null
    if (t.type === "TSTypeAnnotation")
      return typeRead(file, t.typeAnnotation, depth)
    if (t.type === "TSTypeLiteral" || t.type === "TSInterfaceBody") {
      const shape = new Map<string, TypeRead>()
      for (const m of t.members ?? t.body ?? []) {
        const k = keyName(m.key)
        if (k === null || m.type !== "TSPropertySignature") continue
        const r = typeRead(file, m.typeAnnotation, depth + 1)
        if (r) shape.set(k, r)
      }
      return shape.size > 0 ? { shape } : null
    }
    if (t.type === "TSIndexedAccessType") {
      const obj = typeRead(file, t.objectType, depth + 1)
      const idx =
        t.indexType?.type === "TSLiteralType"
          ? strOf(t.indexType.literal)
          : null
      if (obj && "shape" in obj && idx !== null)
        return obj.shape.get(idx) ?? null
      return null
    }
    if (t.type !== "TSTypeReference") return null
    const name = t.typeName?.type === "Identifier" ? t.typeName.name : null
    if (name === null) return null
    const args = typeArgs(t)
    if (name === "ReturnType" && args[0]?.type === "TSTypeQuery") {
      const q = args[0].exprName
      const held = q?.type === "Identifier" ? factoryRef(file, q.name) : null
      return held ? { held } : null
    }
    if (
      [
        "Pick",
        "Omit",
        "Readonly",
        "Partial",
        "Required",
        "NonNullable",
      ].includes(name)
    )
      return typeRead(file, args[0], depth + 1)
    const local = file.types.get(name)
    if (local) {
      return local.type === "TSInterfaceDeclaration"
        ? typeRead(file, local.body, depth + 1)
        : typeRead(file, local.typeAnnotation, depth + 1)
    }
    const imp = file.imports.get(name)
    if (!imp) return null
    if (imp.module === null) return null
    if (isPortModule(imp.module))
      return { held: { kind: "port", module: imp.module, type: imp.name } }
    const there = fileOf(imp.module)
    if (!there) return null
    const decl = there.types.get(imp.name)
    if (decl) {
      return decl.type === "TSInterfaceDeclaration"
        ? typeRead(there, decl.body, depth + 1)
        : typeRead(there, decl.typeAnnotation, depth + 1)
    }
    return null
  }

  const bindType = (env: Env, name: string, r: TypeRead): void => {
    if (!r) return
    if ("held" in r) env.set(name, r.held)
    else for (const [k, v] of r.shape) bindType(env, `${name}.${k}`, v)
  }

  /**
   * What an expression evaluates to, when it is a factory result or a known
   * name.
   */
  const heldOfExpr = (
    file: File,
    env: Env,
    e: N,
  ): Held | { shape: Map<string, Held> } | null => {
    e = unwrap(e)
    if (!e) return null
    if (e.type === "CallExpression") {
      const c = unwrap(e.callee)
      if (c?.type === "Identifier") return factoryRef(file, c.name)
      return null
    }
    const chain = chainOf(e)
    if (chain) {
      const held = env.get(chain.join("."))
      if (held) return held
      // a whole object of held things (`deps` itself)
      const prefix = `${chain.join(".")}.`
      const shape = new Map<string, Held>()
      for (const [k, v] of env)
        if (k.startsWith(prefix)) shape.set(k.slice(prefix.length), v)
      if (shape.size > 0) return { shape }
      return null
    }
    if (e.type === "ObjectExpression") {
      const shape = new Map<string, Held>()
      for (const p of e.properties) {
        if (p.type !== "Property") continue
        const k = keyName(p.key)
        const v = heldOfExpr(file, env, p.value)
        if (k === null || !v) continue
        if ("shape" in v)
          for (const [kk, vv] of v.shape) shape.set(`${k}.${kk}`, vv)
        else shape.set(k, v)
      }
      return shape.size > 0 ? { shape } : null
    }
    return null
  }

  const bindHeld = (
    env: Env,
    name: string,
    v: Held | { shape: Map<string, Held> },
  ): void => {
    if ("shape" in v) for (const [k, vv] of v.shape) env.set(`${name}.${k}`, vv)
    else env.set(name, v)
  }

  /** A pattern (`x`, `{ a, b: c }`) bound to what `v` holds. */
  const bindPattern = (
    file: File,
    env: Env,
    pat: N,
    v: Held | { shape: Map<string, Held> } | null,
  ): void => {
    if (!pat) return
    if (pat.type === "AssignmentPattern")
      return bindPattern(file, env, pat.left, v)
    if (pat.typeAnnotation && pat.type === "Identifier")
      bindType(env, pat.name, typeRead(file, pat.typeAnnotation))
    if (!v) {
      if (pat.type === "ObjectPattern" && pat.typeAnnotation) {
        const r = typeRead(file, pat.typeAnnotation)
        if (r && "shape" in r)
          for (const p of pat.properties) {
            if (p.type !== "Property") continue
            const k = keyName(p.key)
            const local =
              p.value?.type === "AssignmentPattern" ? p.value.left : p.value
            if (k !== null && local?.type === "Identifier")
              bindType(env, local.name, r.shape.get(k) ?? null)
          }
      }
      return
    }
    if (pat.type === "Identifier") return bindHeld(env, pat.name, v)
    if (pat.type === "ObjectPattern")
      for (const p of pat.properties) {
        if (p.type !== "Property") continue
        const k = keyName(p.key)
        const local =
          p.value?.type === "AssignmentPattern" ? p.value.left : p.value
        if (k === null || local?.type !== "Identifier") continue
        if ("shape" in v) {
          const direct = v.shape.get(k)
          if (direct) env.set(local.name, direct)
          const prefix = `${k}.`
          for (const [kk, vv] of v.shape)
            if (kk.startsWith(prefix))
              env.set(`${local.name}.${kk.slice(prefix.length)}`, vv)
        } else if (v.kind === "instance") {
          env.set(local.name, {
            kind: "member",
            module: v.module,
            factory: v.factory,
            member: k,
          })
        }
      }
  }

  /** Parameters, typed or destructured, as the names they bind. */
  const bindParams = (file: File, env: Env, fn: N): void => {
    for (const p of fn.params ?? []) {
      const pat = p.type === "TSParameterProperty" ? p.parameter : p
      bindPattern(file, env, pat, null)
    }
  }

  /** Declarations directly in `body` (not inside nested functions). */
  const bindBody = (file: File, env: Env, body: N): void => {
    walk(body, (n) => {
      if (n !== body && isFn(n)) return false
      if (n.type === "VariableDeclarator") {
        bindPattern(
          file,
          env,
          n.id,
          n.init ? heldOfExpr(file, env, n.init) : null,
        )
      }
    })
  }

  /** Functions declared directly in `body`: the helpers a factory closes over. */
  const localsIn = (body: N): Map<string, N> => {
    const out = new Map<string, N>()
    if (body?.type !== "BlockStatement") return out
    for (const st of body.body) {
      if (st.type === "FunctionDeclaration" && st.id) out.set(st.id.name, st)
      if (st.type === "VariableDeclaration")
        for (const d of st.declarations) {
          const init = unwrap(d.init)
          if (d.id?.type === "Identifier" && isFn(init))
            out.set(d.id.name, init)
        }
    }
    return out
  }

  // ---- function bodies ---------------------------------------------------------

  /** A function to trace into, with what its code sees. */
  type Body = {
    file: File
    fn: N
    env: Env
    closure: Map<string, N>
    visible?: Map<string, N>
    skip?: Set<N>
  }

  const moduleEnv = (file: File): Env => {
    const env: Env = new Map()
    for (const stmt of file.program.body) {
      const d = stmt.type === "ExportNamedDeclaration" ? stmt.declaration : stmt
      if (d?.type === "VariableDeclaration")
        for (const decl of d.declarations)
          bindPattern(
            file,
            env,
            decl.id,
            decl.init ? heldOfExpr(file, env, decl.init) : null,
          )
    }
    return env
  }
  const moduleEnvCache = new Map<string, Env>()
  const moduleEnvOf = (file: File): Env => {
    let env = moduleEnvCache.get(file.path)
    if (!env) {
      env = moduleEnv(file)
      moduleEnvCache.set(file.path, env)
    }
    return env
  }

  const returnedObject = (fn: N): N => {
    const body = unwrap(fn.body)
    if (body?.type === "ObjectExpression") return body
    if (body?.type !== "BlockStatement") return null
    const rets = body.body.filter((st: N) => st.type === "ReturnStatement")
    const last = unwrap(rets[rets.length - 1]?.argument)
    return last?.type === "ObjectExpression" ? last : null
  }

  const bodyOf = (
    module: string,
    symbol: string,
    member: string | null,
  ): Body | null => {
    const file = fileOf(module)
    if (!file) return null
    const top = file.locals.get(symbol)
    if (!top) return null
    if (member === null) {
      const env = new Map(moduleEnvOf(file))
      bindParams(file, env, top)
      bindBody(file, env, top.body)
      // a factory's body runs at instantiation; the functions it returns run later, each its own callable
      const skip = new Set(
        (returnedObject(top)?.properties ?? [])
          .map((p: N) => unwrap(p.value))
          .filter(isFn),
      )
      return { file, fn: top, env, closure: new Map(), skip }
    }
    const ret = returnedObject(top)
    if (!ret) return null
    const prop = ret.properties.find(
      (p: N) => p.type === "Property" && keyName(p.key) === member,
    )
    if (!prop) return null
    const closure = localsIn(top.body)
    let fn = unwrap(prop.value)
    if (fn?.type === "Identifier")
      fn = closure.get(fn.name) ?? file.locals.get(fn.name) ?? null
    if (!isFn(fn)) return null
    // the factory's own scope first (its injected ports, its bindings), then the function's
    const env = new Map(moduleEnvOf(file))
    bindParams(file, env, top)
    bindBody(file, env, top.body)
    bindParams(file, env, fn)
    bindBody(file, env, fn.body)
    return { file, fn, env, closure }
  }

  // ---- guards: what a call sits under ------------------------------------------

  type Guard = {
    kind:
      | "if"
      | "switch"
      | "?:"
      | "&&"
      | "||"
      | "??"
      | "catch"
      | "loop"
      | "callback"
      | "dispatch"
    /**
     * The fragment: one id per if/else-if chain, switch, ternary, loop… — every
     * arm of it shares this id
     */
    id: string
    /** Where the construct starts, `path:line` */
    at: string
    /**
     * The arm this call is in: the condition, `else`, `case "x"`, the loop
     * header, the callee handed the callback
     */
    arm: string
    /**
     * The arm's position in its fragment, in source order (if chain: 0 = first
     * condition … last = else)
     */
    armIndex: number
    /**
     * Callback only: the id of the frame that registers it (the call it is
     * handed to)
     */
    registeredBy?: string
  }

  const LOOPS = new Set([
    "ForStatement",
    "ForOfStatement",
    "ForInStatement",
    "WhileStatement",
    "DoWhileStatement",
  ])
  const ITER = new Set([
    "map",
    "forEach",
    "filter",
    "flatMap",
    "reduce",
    "some",
    "every",
    "find",
    "findIndex",
    "sort",
    "findLast",
  ])

  const src = (file: File, n: N): string =>
    oneLine(file.text.slice(n.start, n.end))
  const nodeId = (file: File, n: N): string => `${file.path}@${n.start}`

  /** The guards between `root` (exclusive) and the call, outermost first. */
  const guardsOf = (file: File, path: N[]): Guard[] => {
    const out: Guard[] = []
    const at = (n: N) => `${file.path}:${file.lineAt(n.start)}`
    const add = (
      kind: Guard["kind"],
      head: N,
      arm: string,
      armIndex: number,
      extra: Partial<Guard> = {},
    ) =>
      out.push({
        kind,
        id: nodeId(file, head),
        at: at(head),
        arm,
        armIndex,
        ...extra,
      })
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i]
      const child = path[i + 1]
      switch (a.type) {
        case "IfStatement": {
          if (child === a.test) break
          if (child === a.alternate && child.type === "IfStatement") break // the inner `if` reports
          // an `else if` chain is one fragment: anchor on its first `if`, count the hops
          let head = a
          let k = i
          let hops = 0
          while (
            k > 0 &&
            path[k - 1].type === "IfStatement" &&
            path[k - 1].alternate === path[k]
          ) {
            k--
            hops++
            head = path[k]
          }
          if (child === a.consequent) add("if", head, src(file, a.test), hops)
          else add("if", head, "else", hops + 1)
          break
        }
        case "ConditionalExpression":
          if (child === a.test) break
          if (child === a.consequent) add("?:", a, src(file, a.test), 0)
          else add("?:", a, "else", 1)
          break
        case "LogicalExpression":
          if (child !== a.right) break
          add(a.operator as Guard["kind"], a, src(file, a.left), 0)
          break
        case "SwitchCase": {
          if (child === a.test) break
          const sw = path[i - 1]
          add(
            "switch",
            sw,
            a.test ? `case ${src(file, a.test)}` : "default",
            sw.cases.indexOf(a),
          )
          break
        }
        case "CatchClause":
          add("catch", a, "catch", 0)
          break
        default:
          if (LOOPS.has(a.type) && child === a.body) {
            const header =
              a.type === "ForOfStatement" || a.type === "ForInStatement"
                ? `${src(file, a.left)} ${a.type === "ForOfStatement" ? "of" : "in"} ${src(file, a.right)}`
                : a.test
                  ? src(file, a.test)
                  : "for"
            add("loop", a, header, 0)
          } else if (
            isFn(child) &&
            (a.type === "CallExpression" || a.type === "NewExpression") &&
            a.arguments?.includes(child)
          ) {
            const callee = unwrap(a.callee)
            const method =
              callee?.type === "MemberExpression" && !callee.computed
                ? callee.property?.name
                : null
            const text = src(file, callee)
            if (method && ITER.has(method)) add("loop", a, text, 0)
            else add("callback", a, text, 0, { registeredBy: nodeId(file, a) })
          }
      }
    }
    return out
  }

  // ---- the tracer --------------------------------------------------------------

  type Participant = {
    id: string
    label: string
    kind: string
    module: string | null
    box: string | null
  }
  const participants = new Map<string, Participant>()
  const labelOf = (module: string) =>
    (module.split("/").pop() ?? module)
      .replace(/\.(port|service|adapter|model|assembly)\.ts$/, "")
      .replace(/\.ts$/, "")
  const moduleP = (module: string): string => {
    const id = `m:${module}`
    if (!participants.has(id))
      participants.set(id, {
        id,
        label: labelOf(module),
        kind: layerOf(module),
        module,
        box: modules.get(module)?.serviceRoot ?? null,
      })
    return id
  }
  const portP = (module: string | null, type: string): string => {
    const id = `port:${module ?? "?"}#${type}`
    if (!participants.has(id))
      participants.set(id, {
        id,
        label: type,
        kind: "port",
        module,
        box: module ? (modules.get(module)?.serviceRoot ?? null) : null,
      })
    return id
  }
  const extP = (specifier: string): string => {
    const id = `x:${specifier}`
    if (!participants.has(id))
      participants.set(id, {
        id,
        label: specifier,
        kind: "external",
        module: null,
        box: null,
      })
    return id
  }

  type Frame = {
    /**
     * Local = a helper of the same file (a self-message); recursion = the
     * function calling itself
     */
    kind:
      | "call"
      | "local"
      | "instantiate"
      | "port"
      | "external"
      | "unbound"
      | "recursion"
    from: string
    to: string
    /** The snapshot row this call lands on */
    target:
      | { module: string; symbol: string; member: string | null }
      | { specifier: string; name: string }
      | null
    /** What the call site says */
    callee: string
    at: string
    guards: Guard[]
    /**
     * This call site, `path@offset` — what a callback guard's `registeredBy`
     * points to
     */
    id: string
    /** The arguments as written at the call site */
    args: string[]
    /**
     * The type of the call's value (TypeScript's view; a Promise when async),
     * null when not typed
     */
    returns: string | null
    /** The call is awaited where it is made */
    awaited: boolean
    /** The call is the argument of a `throw` (`throw new ConfigError(…)`) */
    throws: boolean
    /**
     * The callee's entry in `callables` (its own calls), when its body was
     * found
     */
    ref: string | null
    /** Unbound only: why the tracer gave up (UNBOUND_WHY, a measurement) */
    why?: string
  }

  /**
   * Every function reached, traced once: its direct calls. Keyed
   * `module#symbol` or `module#factory.member`.
   */
  type Callable = {
    module: string
    symbol: string
    member: string | null
    at: string
    frames: Frame[]
  }
  const callables = new Map<string, Callable>()

  const traceBody = (
    body: Body,
    from: string,
    outer: Guard[],
    into: Frame[],
  ): void => {
    const { file } = body
    const topName = new Map([...file.locals].map(([k, v]) => [v, k]))

    const walkFn = (
      fn: N,
      env: Env,
      guards: Guard[],
      visible: Map<string, N>,
    ): void => {
      const start = fn.body
      // helpers declared in this body run where they are called, not where they are defined
      const inner = localsIn(start)
      const innerFns = new Set(inner.values())
      const scope = new Map([...visible, ...inner])
      // oxc reaches a call inside a template literal's expressions by more than one path: one visit per call site
      const visited = new Set<number>()
      walk(start, (n, ancestors) => {
        if (innerFns.has(n) || body.skip?.has(n)) return false
        if (n.type !== "CallExpression" && n.type !== "NewExpression") return
        if (visited.has(n.start * 2 + (n.type === "NewExpression" ? 1 : 0)))
          return
        visited.add(n.start * 2 + (n.type === "NewExpression" ? 1 : 0))
        const path = [
          ...ancestors.slice(
            ancestors.indexOf(start) === -1 ? 0 : ancestors.indexOf(start),
          ),
          n,
        ]
        const g = [...guards, ...guardsOf(file, path)]
        const at = `${file.path}:${file.lineAt(n.start)}`
        const calleeText = src(file, n.callee)
        const parent = ancestors[ancestors.length - 1]
        const throws =
          parent?.type === "ThrowStatement" && unwrap(parent.argument) === n
        const args = (n.arguments ?? []).map((a: N) =>
          src(file, a).slice(0, 80),
        )
        const returns = returnsAt(file.path, n.end)
        const awaited = parent?.type === "AwaitExpression"
        const push = (
          f: Omit<
            Frame,
            | "from"
            | "at"
            | "guards"
            | "ref"
            | "callee"
            | "throws"
            | "id"
            | "args"
            | "returns"
            | "awaited"
          >,
          extra: Guard[] = [],
          idSuffix = "",
        ) => {
          const frame: Frame = {
            from,
            at,
            id: `${nodeId(file, n)}${idSuffix}`,
            args,
            returns,
            awaited,
            guards: [...g, ...extra],
            throws,
            ref: null,
            callee: calleeText,
            ...f,
          }
          into.push(frame)
          return frame
        }
        const follow = (
          frame: Frame,
          module: string,
          symbol: string,
          member: string | null,
        ) => {
          const key = `${module}#${symbol}${member ? `.${member}` : ""}`
          if (callables.has(key)) return void (frame.ref = key)
          const b = bodyOf(module, symbol, member)
          if (!b) return
          frame.ref = key
          const entry: Callable = {
            module,
            symbol,
            member,
            at: `${b.file.path}:${b.file.lineAt(b.fn.start)}`,
            frames: [],
          }
          callables.set(key, entry)
          traceBody(b, frame.to, [], entry.frames)
        }
        const onHeld = (held: Held, member: string | null): boolean => {
          switch (held.kind) {
            case "port":
              push({
                kind: "port",
                to: portP(held.module, held.type),
                target: held.module
                  ? { module: held.module, symbol: held.type, member }
                  : null,
              })
              return true
            case "external":
              push({
                kind: "external",
                to: extP(held.specifier),
                target: {
                  specifier: held.specifier,
                  name: `${held.name}().${member}`,
                },
              })
              return true
            case "instance": {
              if (member === null) return false
              const frame = push({
                kind: "call",
                to: moduleP(held.module),
                target: { module: held.module, symbol: held.factory, member },
              })
              follow(frame, held.module, held.factory, member)
              return true
            }
            case "member": {
              if (member !== null) return false
              const frame = push({
                kind: "call",
                to: moduleP(held.module),
                target: {
                  module: held.module,
                  symbol: held.factory,
                  member: held.member,
                },
              })
              follow(frame, held.module, held.factory, held.member)
              return true
            }
          }
        }
        const callLocal = (name: string, local: N) => {
          const top = topName.get(local) === name
          const key = top
            ? `${file.path}#${name}`
            : `${file.path}#${name}@${file.lineAt(local.start)}`
          const frame = push({
            kind: "local",
            to: from,
            target: top
              ? { module: file.path, symbol: name, member: null }
              : null,
          })
          frame.ref = key
          if (callables.has(key)) return
          const env2 = new Map(env)
          bindParams(file, env2, local)
          bindBody(file, env2, local.body)
          const entry: Callable = {
            module: file.path,
            symbol: name,
            member: null,
            at: `${file.path}:${file.lineAt(local.start)}`,
            frames: [],
          }
          callables.set(key, entry)
          traceBody(
            {
              file,
              fn: local,
              env: env2,
              closure: body.closure,
              visible: scope,
            },
            from,
            [],
            entry.frames,
          )
        }

        // a dispatch table: `DETECTORS[check](…)` may run any of its entries — one frame per entry,
        // each an arm of one `dispatch` fragment; `DETECTORS.dag(…)` runs that one
        const callee = unwrap(n.callee)
        if (
          callee?.type === "MemberExpression" &&
          unwrap(callee.object)?.type === "Identifier"
        ) {
          const tableName = unwrap(callee.object).name
          const table =
            !env.has(tableName) && !scope.has(tableName)
              ? file.tables.get(tableName)
              : undefined
          if (table) {
            const only = callee.computed ? null : callee.property?.name
            for (const [armIndex, p] of table.properties.entries()) {
              const k = p.type === "Property" ? keyName(p.key) : null
              const fn = p.type === "Property" ? unwrap(p.value) : null
              if (k === null || !isFn(fn) || (only != null && k !== only))
                continue
              const key = `${file.path}#${tableName}.${k}`
              const frame = push(
                {
                  kind: "local",
                  to: from,
                  target: { module: file.path, symbol: tableName, member: k },
                },
                only == null
                  ? [
                      {
                        kind: "dispatch",
                        id: nodeId(file, n),
                        at,
                        arm: k,
                        armIndex,
                      },
                    ]
                  : [],
                only == null ? `#${k}` : "",
              )
              frame.callee = `${tableName}.${k}`
              frame.ref = key
              if (callables.has(key)) continue
              const env2 = new Map(moduleEnvOf(file))
              bindParams(file, env2, fn)
              bindBody(file, env2, fn.body)
              const entry: Callable = {
                module: file.path,
                symbol: tableName,
                member: k,
                at: `${file.path}:${file.lineAt(fn.start)}`,
                frames: [],
              }
              callables.set(key, entry)
              traceBody(
                { file, fn, env: env2, closure: new Map() },
                from,
                [],
                entry.frames,
              )
            }
            return
          }
        }

        const chain = chainOf(n.callee)
        let refused: string | null = null
        if (chain) {
          // longest held prefix: `deps.loader.discoverConfig` → deps.loader holds an instance
          for (let k = chain.length; k >= 1; k--) {
            const held = env.get(chain.slice(0, k).join("."))
            if (!held) continue
            const rest = chain.slice(k)
            if (rest.length === 0 && onHeld(held, null)) return
            if (rest.length === 1 && onHeld(held, rest[0]!)) return
            refused = `held-refused:${held.kind}:${rest.length}`
            break
          }
          const [head, second] = chain
          if (chain.length === 1) {
            const local =
              scope.get(head!) ??
              body.closure.get(head!) ??
              file.locals.get(head!)
            if (local && local !== body.fn) return callLocal(head!, local)
            if (local === body.fn) {
              push({ kind: "recursion", to: from, target: null })
              return
            }
            const imp = file.imports.get(head!)
            if (imp) {
              if (imp.module === null) {
                push({
                  kind: "external",
                  to: extP(imp.specifier),
                  target: { specifier: imp.specifier, name: imp.name },
                })
                return
              }
              const isFactory =
                /^create[A-Z]/.test(imp.name) || n.type === "NewExpression"
              const frame = push({
                kind: isFactory ? "instantiate" : "call",
                to: moduleP(imp.module),
                target: { module: imp.module, symbol: imp.name, member: null },
              })
              follow(frame, imp.module, imp.name, null)
              return
            }
          }
          if (chain.length === 2) {
            const imp = file.imports.get(head!)
            if (imp && imp.name === "*") {
              if (imp.module === null) {
                push({
                  kind: "external",
                  to: extP(imp.specifier),
                  target: { specifier: imp.specifier, name: second! },
                })
                return
              }
              const frame = push({
                kind: "call",
                to: moduleP(imp.module),
                target: { module: imp.module, symbol: second!, member: null },
              })
              follow(frame, imp.module, second!, null)
              return
            }
          }
        }
        push({
          kind: "unbound",
          to: from,
          target: null,
          why: unboundWhy(chain, refused, () =>
            paramNames([body.fn, ...path.filter(isFn)]),
          ),
        })
      })
    }

    walkFn(body.fn, body.env, outer, body.visible ?? new Map())
  }

  // ---- the driver --------------------------------------------------------------

  const driverFile = fileOf(DRIVER_MODULE)
  if (!driverFile) throw new Error(`cannot read ${DRIVER_MODULE}`)
  const mainFn = driverFile.locals.get("main")
  if (!mainFn) throw new Error("no `main` in the driver")
  let dispatch: N = null
  walk(mainFn.body, (n) => {
    if (
      n.type === "SwitchStatement" &&
      src(driverFile, n.discriminant) === "action.command"
    )
      dispatch = n
  })
  if (!dispatch) throw new Error("no `switch (action.command)` in main")

  const mainEnv = new Map(moduleEnvOf(driverFile))
  bindParams(driverFile, mainEnv, mainFn)
  bindBody(driverFile, mainEnv, mainFn.body)
  const driverP = moduleP(DRIVER_MODULE)

  /** Main's own code, the dispatch cut out: argv parsing, instantiation. */
  const entry: Frame[] = (() => {
    const cases = dispatch.cases
    dispatch.cases = []
    const frames: Frame[] = []
    traceBody(
      { file: driverFile, fn: mainFn, env: mainEnv, closure: new Map() },
      driverP,
      [],
      frames,
    )
    dispatch.cases = cases
    return frames
  })()

  const traceCase = (label: string): Frame[] | null => {
    const c = dispatch.cases.find((c: N) => c.test && strOf(c.test) === label)
    if (!c) return null
    const frames: Frame[] = []
    const fn = {
      type: "ArrowFunctionExpression",
      params: [],
      body: {
        type: "BlockStatement",
        body: c.consequent,
        start: c.start,
        end: c.end,
      },
    }
    traceBody(
      { file: driverFile, fn, env: mainEnv, closure: new Map() },
      driverP,
      [],
      frames,
    )
    return frames
  }

  /**
   * Every frame reachable from `frames` through refs, each callable visited
   * once; `levels` = hops down.
   */
  const reach = (frames: Frame[]) => {
    const seen = new Set<string>()
    const all: Frame[] = []
    let levels = 0
    let layer = frames
    while (layer.length > 0) {
      levels += 1
      all.push(...layer)
      const next: Frame[] = []
      for (const f of layer)
        if (f.ref && !seen.has(f.ref)) {
          seen.add(f.ref)
          next.push(...(callables.get(f.ref)?.frames ?? []))
        }
      layer = next
    }
    return { all, callables: seen.size, levels }
  }

  const hooks = HOOKS.map((h) => {
    const trace = traceCase(h.case) ?? []
    const guards = reach(trace).all.flatMap((f) => f.guards)
    return {
      name: h.name,
      usage: h.usage,
      trace,
      subs: h.subs.map((s) => {
        if (s.case)
          return {
            name: s.name,
            usage: s.usage,
            trace: traceCase(s.case) ?? [],
            branches: [],
          }
        // no handler of its own: the branches reachable from the parent that test its field
        const re = new RegExp(`\\b${s.field}\\b`)
        const branches = [
          ...new Set(guards.filter((g) => re.test(g.arm)).map((g) => g.at)),
        ]
        return { name: s.name, usage: s.usage, trace: null, branches }
      }),
    }
  })

  // ---- every function, not only what the CLI reaches ---------------------------
  // each exported function of a non-test module is an entry, and so is each function a factory returns

  const fromCli = callables.size
  const traceEntry = (
    module: string,
    symbol: string,
    member: string | null,
  ): void => {
    const key = `${module}#${symbol}${member ? `.${member}` : ""}`
    if (callables.has(key)) return
    const b = bodyOf(module, symbol, member)
    if (!b) return
    const entry: Callable = {
      module,
      symbol,
      member,
      at: `${b.file.path}:${b.file.lineAt(b.fn.start)}`,
      frames: [],
    }
    callables.set(key, entry)
    traceBody(b, moduleP(module), [], entry.frames)
  }
  for (const m of fine.modules) {
    if (m.layer === "test") continue
    const file = fileOf(m.path)
    if (!file) continue
    for (const y of m.symbols ?? []) {
      if (y.typeOnly) continue
      const top = file.locals.get(y.name)
      if (!top) continue
      traceEntry(m.path, y.name, null)
      for (const p of returnedObject(top)?.properties ?? []) {
        const k = p.type === "Property" ? keyName(p.key) : null
        if (k !== null) traceEntry(m.path, y.name, k)
      }
    }
  }

  // ---- counts ------------------------------------------------------------------

  const statOf = (frames: Frame[]) => {
    const r = reach(frames)
    const byKind: Record<string, number> = {}
    for (const f of r.all) byKind[f.kind] = (byKind[f.kind] ?? 0) + 1
    return { ...byKind, functions: r.callables, levels: r.levels }
  }

  const stats = Object.fromEntries([
    ["(entry)", statOf(entry)],
    ...hooks.flatMap((h) => [
      [h.name, statOf(h.trace)],
      ...h.subs.map((s) => [
        `${h.name} ${s.name}`,
        s.trace ? statOf(s.trace) : { branches: s.branches },
      ]),
    ]),
  ])

  const outDoc = {
    ...fine,
    sequenceLevel: {
      note: "probe, 2026-09-23 (rev. 2: every exported function of a non-test module and every function a factory returns is an entry of `callables`, reached from the CLI or not; a factory's own body is traced, so `instantiate` frames have a `ref`) — the CLI presented as a driver on purpose (config says assembly); calls read statically from the source; each function traced once in `callables`, a frame's `ref` points to its callee's entry; `guards` = the branches / loops / callbacks a call sits under (one `id` per fragment, `armIndex` in source order, `registeredBy` = the frame id that registers a callback); `args` as written; `returns` from the TypeScript 7 checker",
      stats,
    },
    modules: fine.modules.map((m: any) =>
      m.path === DRIVER_MODULE ? { ...m, layer: "driver" } : m,
    ),
    participants: [...participants.values()],
    drivers: [{ name: "cli", module: DRIVER_MODULE, entry, hooks }],
    callables: Object.fromEntries(callables),
  }

  tsApi.close()
  return outDoc
}
