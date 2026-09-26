/**
 * Text rendering — the fiction as code. Pure: violation values, status numbers,
 * and shipped content in; the exact strings the goldens pin out. The help
 * screens live here as literals so README-driven docs cannot drift from the
 * binary.
 */

import type {
  UnverifiedEntry,
  UnverifiedTarget,
} from "../check/surface.model.ts"
import type {
  BrokenSite,
  CalleeKind,
  EdgeTarget,
  UnknownCondition,
  UnresolvedImport,
} from "../extraction/graph.model.ts"
import type { RuleId } from "../check/rule.model.ts"
import { isRuleId, ruleOrder } from "../check/rule.model.ts"
import type {
  AssemblyViolation,
  DagViolation,
  DriverViolation,
  LayersViolation,
  ModulesViolation,
  PortsViolation,
  SurfaceViolation,
  Violation,
} from "../check/violation.model.ts"
import type { ViolationGroup } from "../check/grouping.model.ts"
import type { ExplainEntry } from "../explain/rule-content.model.ts"
import { KNOWN_CHECKS } from "./cli.model.ts"

/** Everything but dag renders as service → file → tagged message lines. */
type FileViolation = Exclude<Violation, DagViolation>

/** One fix, in a file: a lead and the violations it removes with it. */
type FileGroup = { lead: FileViolation; riders: readonly FileViolation[] }

/** Output width the fiction wraps at. */
const WIDTH = 72
/** Violation lines: 4-space indent + check tag padded to this field. */
const TAG_FIELD = 9
const CONTINUATION = " ".repeat(4 + TAG_FIELD)
/** A rider's continuation lines, under its text past the `+ `. */
const RIDER_CONTINUATION = `${CONTINUATION}  `

export type Colors = {
  strong: (text: string) => string
  dim: (text: string) => string
  accent: (text: string) => string
}

export const NO_COLORS: Colors = {
  strong: (text) => text,
  dim: (text) => text,
  accent: (text) => text,
}

export const ANSI_COLORS: Colors = {
  strong: (text) => `\u001b[1m${text}\u001b[22m`,
  dim: (text) => `\u001b[2m${text}\u001b[22m`,
  accent: (text) => `\u001b[36m${text}\u001b[39m`,
}

/** `1872` → `1,872` — fixed grouping, never locale-dependent. */
const formatCount = (count: number): string =>
  count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")

const plural = (count: number, noun: string, many = `${noun}s`): string =>
  `${formatCount(count)} ${count === 1 ? noun : many}`

/**
 * A multi-rule citation is one token — `(service-assembly-only,
 * runtime-import)` split at its comma orphans the second slug, and a grep for
 * the pair stops matching. Merges the split words back: an opening slug riding
 * a comma swallows the slugs that follow, through the closing paren. A lone
 * slug is one word already and needs nothing.
 */
const mergeCiteTokens = (words: readonly string[]): string[] => {
  const merged: string[] = []
  for (let index = 0; index < words.length; index += 1) {
    let word = words[index] as string
    if (/^\([a-z-]+,$/.test(word) && isRuleId(word.slice(1, -1))) {
      while (index + 1 < words.length) {
        const next = words[index + 1] as string
        if (!/^[a-z-]+[,)]$/.test(next) || !isRuleId(next.slice(0, -1))) break
        index += 1
        word += ` ${next}`
        if (next.endsWith(")")) break
      }
    }
    merged.push(word)
  }
  return merged
}

/** Greedy word wrap; continuation lines get the hanging indent. */
const wrap = (
  first: string,
  text: string,
  hang: string = CONTINUATION,
): string[] => {
  const lines: string[] = []
  let line = first
  for (const word of mergeCiteTokens(text.split(" "))) {
    const candidate =
      line === first || line === hang ? line + word : `${line} ${word}`
    if (candidate.length > WIDTH && line !== first && line !== hang) {
      lines.push(line)
      line = hang + word
    } else {
      line = candidate
    }
  }
  lines.push(line)
  return lines
}

const targetLabel = (target: EdgeTarget, prefix: string): string =>
  target.type === "module"
    ? prefix + target.path
    : // a declared external leaf reads as declared, not as a resolver accident
      target.declared
      ? `${target.specifier} (declared)`
      : target.specifier

/**
 * `(service-purity)` / `(service-purity, runtime-import)` — the slug is
 * self-describing, no word "rule".
 */
const ruleCite = (rules: readonly RuleId[]): string => rules.join(", ")

/** The sort wherever output orders rules — the summary's display order. */
const byRuleOrder = (a: RuleId, b: RuleId): number =>
  ruleOrder(a) - ruleOrder(b)

const layersMessage = (violation: LayersViolation, prefix: string): string => {
  const target = targetLabel(violation.target, prefix)
  if (violation.shape === "unclassified-lib") {
    return `imports ${target} — unclassified third-party in a pure layer; list it under config key "pure" if it qualifies`
  }
  const { rules, importerLayer } = violation
  // runtime-import in the citation = this cell's type variant is exempt
  // (06 ruling)
  const hint = rules.includes("runtime-import")
    ? "; only import type is allowed"
    : ""
  if (
    rules.includes("service-assembly-only") ||
    rules.includes("adapter-assembly-only")
  ) {
    const suffix = rules.includes("service-assembly-only")
      ? ".service.ts"
      : ".adapter.ts"
    return `imports ${target} — ${suffix} is assembly-only${hint}`
  }
  if (rules.includes("blob-quarantine")) {
    return `imports ${target} — only assembly may import blob; extract what you need`
  }
  if (rules.includes("service-purity")) {
    return importerLayer === "service"
      ? `imports ${target} — service layer cannot depend on concrete${hint}`
      : `imports ${target} — ${importerLayer} must stay pure${hint}`
  }
  if (importerLayer === "model") {
    return `imports ${target} — model may only import model${hint}`
  }
  if (importerLayer === "ports") {
    return `imports ${target} — ports may only import model and ports${hint}`
  }
  return `imports ${target} — ${importerLayer} may not import ${violation.targetClass}${hint}`
}

const portsMessage = (violation: PortsViolation, prefix: string): string => {
  if (violation.shape === "runtime-export") {
    const { form, name, exported } = violation
    const label = name === null ? form : `${form} ${name}`
    const lead =
      form === "statement"
        ? "contains a runtime statement"
        : `${exported ? "exports" : "contains"} ${label}`
    return `${lead} — ports are types only; runtime belongs in an adapter or model`
  }
  const target = targetLabel(violation.target, prefix)
  return violation.shape === "runtime-import-in-port"
    ? `imports ${target} at runtime — a port needs no runtime imports; add the type keyword or move the code`
    : `imports ${target} at runtime — a types-only file supplies no runtime binding; add the type keyword`
}

const surfaceMessage = (
  violation: SurfaceViolation,
  prefix: string,
): string => {
  // reached through the build mirror: name the built target the source wears
  const as =
    violation.exported === violation.file
      ? ""
      : ` (as ${prefix}${violation.exported})`
  const lead = `is exported as "${violation.subpath}"${as}`
  return violation.shape === "claim-mismatch"
    ? `${lead} — the entry claims ${violation.claimed}, the file is ${violation.actual}; a declared surface must match the facts`
    : violation.fronts === violation.file
      ? `${lead} — an unlabeled entry over ${violation.frontLayer}; the layer must be visible in the surface`
      : `${lead} — an unlabeled entry fronting ${violation.frontLayer} (${prefix}${violation.fronts}); the layer must be visible in the surface`
}

const messageOf = (violation: FileViolation, prefix: string): string => {
  switch (violation.check) {
    case "layers":
      return layersMessage(violation, prefix)
    case "private":
      return `imports ${targetLabel(violation.target, prefix)} — private/ is sealed outside its service`
    case "barrels":
      return violation.shape === "barrel-file"
        ? `re-exports ${targetLabel(violation.target, prefix)} — no index.ts indirection; the layer must be visible in the import path`
        : `imports ${targetLabel(violation.target, prefix)} — import the layered file directly`
    case "ports":
      return portsMessage(violation, prefix)
    case "surface":
      return surfaceMessage(violation, prefix)
    case "modules": {
      // the trigger in full path:line, whatever file it sits in: the reader
      // jumps to it, and it is where the load-time path enters
      const via =
        violation.via.length === 0
          ? ""
          : `, reached from ${violation.via.map((site) => `${prefix}${site.file}:${site.line}`).join(", ")}`
      if (violation.shape === "root-binding") {
        if (violation.holds === "machine")
          return `line ${violation.line} stores a read of the machine at load time — no type proves what it held; read it inside a factory or a function`
        const js = isJavaScript(violation.file)
        if (violation.unknown !== null)
          return `line ${violation.line} may bind state at module root — unknown: ${unknownWords(violation.unknown)}; ${unknownWaysOut(violation.unknown, js)}`
        const by = violation.by as { form: string; name: string | null }
        return `line ${violation.line} binds mutable state at module root — ${mutableWords(by, js)}; ${js ? JS_WAYS_OUT : "use as const, a readonly type, or move it inside a factory"}`
      }
      if (violation.shape === "root-call") {
        if (violation.reaches === null)
          return `line ${violation.line} may run on import${via} — unknown: ${unknownWords({ kind: "callee" })}; move it inside a factory or a function`
        return `line ${violation.line} runs on import${via} — ${reachWords(violation.reaches, violation.name)}, presumed to act; move it inside a factory or a function`
      }
      if (violation.unknown !== null)
        return `line ${violation.line} may run on import${via} — unknown: ${unknownWords(violation.unknown)}; move it inside a function`
      return `line ${violation.line} runs on import${via} — a module's evaluation performs no side effect; move it inside a factory or a function`
    }
    case "assembly":
      return assemblyMessage(violation)
    case "driver":
      return driverMessage(violation)
  }
}

// --- the driver rules' words -------------------------------------------------
// Each red names its way out: the driver table of the rows-first step.

const CALLS_SERVICES =
  "a driver calls services, the assembly, sub-driver wiring and its own tech, nothing else"

/** A call a driver may not make, in words, with its way out. */
const driverCallWords = (callee: CalleeKind): string => {
  switch (callee.kind) {
    case "model":
      return `calls ${callee.name}, a model — ${CALLS_SERVICES}; parsing and rendering are use cases of a service`
    case "factory":
      return `calls ${callee.name}, a factory of ${callee.layer} — ${CALLS_SERVICES}; the assembly builds it, a service calls it`
    case "local":
      return `calls ${callee.name}, a function of the driver — ${CALLS_SERVICES}; a model function, called by a service`
    case "unclaimed":
      return `calls ${callee.package}, a package nothing claims — ${CALLS_SERVICES}; declare it in driverTech, or it is a service's concern`
    default:
      return `calls ${calleeName(callee)} — ${CALLS_SERVICES}; a use case of the service does it`
  }
}

/** A definition beside the hooks and the wiring function, with its way out. */
const driverDefinitionWords = (
  name: string,
  at: Extract<DriverViolation, { shape: "definition" }>["at"],
): string => {
  switch (at) {
    case "root":
      return `defines ${name} beside the hooks and the wiring function — a driver defines its hooks and one wiring function; the literal in place, or a model export`
    case "function":
      return `defines ${name}, a function beside the wiring function — a driver defines its hooks and one wiring function; a model function called by a service, or a sub-driver's wiring`
    case "local":
      return `holds functions in ${name} — a table of lambdas is a service without a contract; each hook handed to the tech in place`
  }
}

const driverMessage = (violation: DriverViolation): string => {
  const line = `line ${violation.line}`
  switch (violation.shape) {
    case "call": {
      const name = calleeName(violation.callee)
      if (violation.unknown !== null)
        return `${line} may call what a driver may not — unknown: ${unknownWords(violation.unknown)}; call a service, the assembly or the tech`
      if (violation.rules.includes("wiring-outside-hooks"))
        return `${line} runs the use case ${name} outside any hook — outside its hooks, a driver only wires; the call moves into a hook`
      if (violation.rules.includes("sub-driver-wiring"))
        return `${line} runs the sub-driver's wiring ${name} in a hook — one hook would chain two calls; call it in the wiring`
      if (violation.rules.includes("hook-one-call"))
        return `${line} calls ${name} beside the use case — a hook connects a trigger to one use case; the use case does it through its port`
      return `${line} ${driverCallWords(violation.callee)}`
    }
    case "argument": {
      const name = calleeName(violation.callee)
      const value =
        violation.value === "function"
          ? "a function"
          : violation.value === "unknown"
            ? "what the reader cannot tell"
            : "a computed value"
      if (violation.rules.includes("sub-driver-wiring"))
        return `${line} hands the sub-driver's wiring ${name} a use case's result — never data from the hexagon; pass the instance, its hook calls the use case`
      if (violation.where === "hook")
        return `${line} hands the use case ${name} ${value} — a hook translates nothing on the way in; pass the tech values unchanged, the service derives the rest`
      return `${line} hands ${name} ${value} — wiring hands on tech values, instances and literals; the assembly takes the raw value, its adapter derives it`
    }
    case "call-count":
      return violation.count === 0
        ? `${line} registers a hook that runs no use case — a hook with no use case is logic with no home; a use case of the service`
        : `${line} registers a hook that runs ${violation.count} use cases — the sequence between them is a use case nobody owns; a facade use case, the calls its subfunctions`
    case "branch":
      if (violation.where === "wiring")
        return `${line} branches in the wiring — outside its hooks, a driver only wires; the decision is a service's`
      return violation.conditional
        ? `${line} calls its use case conditionally — the call is unconditional; the service decides`
        : `${line} branches in a hook — a hook translates nothing around its call; the service decides`
    case "result":
      return `${line} uses a use case's result past handing it on — a hook returns it, or hands it whole to the tech; the use case returns what the tech needs`
    case "statement":
      return violation.where === "wiring"
        ? `${line} writes in the wiring — outside its hooks, a driver only wires; the write is a service's`
        : `${line} writes in a hook — a hook translates nothing around its call; the use case returns what the tech needs`
    case "definition":
      return `${line} ${driverDefinitionWords(violation.name ?? "a value", violation.at)}`
    case "parameter":
      return `${line} ${violation.name ?? "the wiring function"} takes a parameter — a root driver's wiring function takes nothing and reads its tech itself; read it inside`
  }
}

// --- assembly-builds-only's words -------------------------------------------
// Each red names its way out: the assembly table of the rows-first step.

/** What a callee is, named for a message. */
const calleeName = (callee: CalleeKind): string => {
  switch (callee.kind) {
    case "factory":
    case "wiring":
    case "model":
    case "local":
      return callee.name
    case "use-case":
      return callee.member
    case "tech":
      return callee.package ?? "the host"
    case "unclaimed":
      return callee.package
    case "forbidden-import":
      return callee.path
    case "language":
      return "the language"
    case "unknown":
      return "a call the reader cannot place"
  }
}

/** A call that builds nothing, in words, with its way out. */
const assemblyCallWords = (callee: CalleeKind): string => {
  switch (callee.kind) {
    case "tech":
      return `calls ${calleeName(callee)}, the tech — an assembly only builds; hand the tech value to the adapter that uses it`
    case "use-case":
      return `runs the use case ${callee.member} — an assembly only builds; run it in a hook, or declare it in configLoads if the graph depends on it`
    case "local":
      return `calls ${callee.name}, which builds nothing — every call in an assembly builds; a model function passed on, or inline`
    case "wiring":
      return `runs the wiring function ${callee.name} — a driver's, never an assembly's; the driver calls the assembly`
    case "unclaimed":
      return `calls ${callee.package}, a package nothing claims — an assembly only builds; an adapter wraps it, or list it under config key "pure"`
    default:
      return `calls ${calleeName(callee)}, which builds nothing — computing is not building; a model function passed on, or the adapter derives it`
  }
}

const assemblyMessage = (violation: AssemblyViolation): string => {
  const line = `line ${violation.line}`
  switch (violation.shape) {
    case "call":
      return violation.unknown !== null
        ? `${line} may not build — unknown: ${unknownWords(violation.unknown)}; a factory call, or type what it is called on`
        : `${line} ${assemblyCallWords(violation.callee)}`
    case "argument": {
      const what =
        violation.key === null ? "an argument" : `the entry ${violation.key}`
      const to = calleeName(violation.callee)
      if (violation.unknown !== null)
        return `${line} may hand ${to} what the reader cannot tell — unknown: ${unknownWords(violation.unknown)}; pass a literal, a tech value received, or an instance`
      if (violation.value === "tech")
        return `${line} hands ${to} the host as ${what}, read here — tech values arrive as parameters; the driver hands it in`
      return violation.value === "function"
        ? `${line} hands ${to} a function as ${what} — an assembly defines nothing; the driver registers it, or the adapter owns it`
        : `${line} hands ${to} a computed value as ${what} — arguments are literals, tech values received, or instances; a model function passed on, or the adapter derives it`
    }
    case "result-use": {
      const built = calleeName(violation.callee)
      const verb =
        violation.use === "member"
          ? "reads a field of"
          : violation.use === "computed"
            ? "computes with"
            : violation.use === "assigned"
              ? "writes into a member"
              : "reassigns"
      return violation.callee.kind === "factory" &&
        violation.callee.layer === "assembly"
        ? `${line} ${verb} what ${built} built — shared instances flow down, never sideways; the parent builds it and passes it down to both`
        : `${line} ${verb} what ${built} built — what the assembly builds is passed on or returned; pass it whole, its consumer reads the field`
    }
    case "branch":
      return violation.testOrigin === "instance"
        ? `${line} branches on an instance — a decision the map cannot show; it moves into the service or adapter that owns it`
        : `${line} branches on a computed value — a branch is wiring on a parameter or a loaded value; the decision moves into the service or adapter that owns it`
    case "definition": {
      const name = violation.name ?? "a value"
      return violation.at === "root"
        ? `${line} defines ${name} at the assembly's root — nothing sits there but imports; the literal in place, or a model export`
        : `${line} defines ${name}, which builds nothing — nothing but assembly functions is defined; a model function, or inline`
    }
    case "root-statement":
      return `${line} runs at the assembly's root — nothing sits there but imports; move it inside the assembly function`
    case "adapter-returned":
      return `${line} returns the adapter ${violation.key} to a caller that is not a test — an assembly returns services; return services only, a test factory returns the adapters`
  }
}

// --- stable-root's words ---------------------------------------------------
// The reader names forms by their ESTree type; the words are the message's.

/** A JavaScript file has no types to write: its ways out differ. */
const isJavaScript = (file: string): boolean =>
  /\.(?:js|jsx|mjs|cjs)$/.test(file)

/**
 * JavaScript's ways out of a mutable root binding. The setting is named: a
 * codebase without types can prove little else (rixo 2026-09-24).
 */
const JS_WAYS_OUT =
  "use Object.freeze, move it inside a factory, or set mutableModuleState: true"

/** What proves a root binding mutable, by the form the reader named. */
const mutableWords = (
  by: { form: string; name: string | null },
  js: boolean,
): string => {
  switch (by.form) {
    case "let":
    case "var":
      return `a ${by.form} can be reassigned`
    case "static": {
      const field = by.name === null ? "a static field" : `static ${by.name}`
      return js
        ? `${field} can be reassigned`
        : `${field} without readonly can be reassigned`
    }
    case "ObjectExpression":
      return js
        ? "a record literal, not frozen"
        : "a record literal without as const"
    case "ArrayExpression":
      return js
        ? "an array literal, not frozen"
        : "an array literal without as const"
    case "NewExpression":
      return `a new ${by.name}, which keeps its mutators`
    case "Identifier":
      return `the same object as ${by.name}, which is mutable`
    case "TSTypeReference":
      return by.name === "Record"
        ? "a Record without Readonly"
        : `a ${by.name}, which keeps its mutators`
    case "TSArrayType":
      return "an array type without readonly"
    case "TSTupleType":
      return "a tuple type without readonly"
    case "TSPropertySignature":
      return "a member without readonly"
    case "TSMethodSignature":
      return "a method, which can be reassigned"
    case "TSIndexSignature":
      return "an index signature without readonly, which takes new entries"
    default:
      return by.form
  }
}

/** The type forms the reader does not read, as a message names them. */
const TYPE_FORM_WORDS: Readonly<Record<string, string>> = {
  TSTypeQuery: "typeof",
  keyof: "keyof",
  unique: "unique symbol",
  TSMappedType: "a mapped type",
  TSConditionalType: "a conditional type",
  TSIndexedAccessType: "an indexed access type",
  TSImportType: "an import() type",
  TSMethodSignature: "a method signature",
  TSIndexSignature: "an index signature",
  TSUnknownKeyword: "unknown",
  TSObjectKeyword: "object",
}

/** The values the reader does not follow, as a message names them. */
const VALUE_WORDS: Readonly<Record<string, string>> = {
  MemberExpression: "a member read",
  AwaitExpression: "an awaited value",
  SpreadElement: "a spread",
  argument: "this argument",
  ObjectPattern: "a destructured part",
  ArrayPattern: "a destructured part",
}

/** What the reader could not see, in words. */
const unknownWords = (condition: UnknownCondition): string => {
  switch (condition.kind) {
    case "type-name":
      return `the reader does not follow the type name ${condition.name} yet`
    case "type-form":
      // `any` declares nothing: no reader could prove it, now or later
      if (condition.form === "TSAnyKeyword")
        return "any declares nothing a reader could prove"
      if (condition.form === "TSPropertySignature")
        return "a member without a type is any, which declares nothing a reader could prove"
      return `the reader does not read ${TYPE_FORM_WORDS[condition.form] ?? condition.form} yet`
    case "call-result":
      if (condition.callee === null) return "a call's result is not known"
      return condition.construct
        ? `what new ${condition.callee} builds is not known`
        : `what ${condition.callee}() returns is not known`
    case "value":
      return condition.name !== null
        ? `the reader does not follow ${condition.name} to its value`
        : `the reader does not follow ${VALUE_WORDS[condition.form] ?? condition.form}`
    case "statement":
      return `the reader does not recognise this statement (${condition.form})`
    case "callee":
      return "the reader cannot tell what this call reaches"
  }
}

/** What a root call reaches, in words: why it is presumed to act. */
const reachWords = (
  reaches: NonNullable<
    Extract<ModulesViolation, { shape: "root-call" }>["reaches"]
  >,
  name: string | null,
): string => {
  switch (reaches) {
    case "tech":
      return name === null
        ? "a call into the host"
        : `a call into ${name}, the tech`
    case "use-case":
      return `a call to the use case ${name}`
    case "function":
      return `a call into ${name}, a function of a file that may touch the tech`
    case "wiring":
      return `the wiring function ${name} runs, and sets up its tech`
    case "unclaimed":
      return `a call into ${name}, a package nothing claims`
  }
}

/**
 * Some ways out of an unknown, by what the reader could not see — `explain`
 * lists them all. A type the reader does not follow is written out in place; a
 * value it does not follow is annotated, where there are types to write.
 */
const unknownWaysOut = (condition: UnknownCondition, js: boolean): string => {
  if (condition.kind === "type-name" || condition.kind === "type-form")
    return "write the type out in place, or move it inside a factory"
  return js
    ? "move it inside a factory, or set mutableModuleState: true"
    : "annotate it with a readonly type, or move it inside a factory"
}

/** Dag blocks: 2-space indent + tag; continuation under the head. */
const DAG_CONTINUATION = " ".repeat(2 + TAG_FIELD)

const baseOf = (root: string): string => {
  const slash = root.lastIndexOf("/")
  return slash === -1 ? root : root.slice(slash + 1)
}

const cycleHead = (nodes: readonly string[]): string =>
  nodes.length === 2
    ? `${nodes[0]} ⇄ ${nodes[1]}`
    : [...nodes, nodes[0]].join(" → ")

/**
 * One cycle finding as a block: tag + witness head, hop lines quoting the
 * carrying edges (service cycles), the remedy line, and an entanglement note
 * when the SCC exceeds the witness.
 */
const dagBlock = (
  violation: DagViolation,
  colors: Colors,
  prefix: string,
): string[] => {
  const lines: string[] = []
  const push = (text: string) => {
    lines.push(...wrap(DAG_CONTINUATION, text, DAG_CONTINUATION))
  }
  const witness =
    violation.shape === "service-cycle" ? violation.services : violation.files
  const tag = "dag".padEnd(TAG_FIELD)
  const [head, ...headRest] = wrap(
    `  ${tag}`,
    cycleHead(witness.map((node) => prefix + node)),
    DAG_CONTINUATION,
  )
  lines.push((head as string).replace(tag, colors.accent(tag)), ...headRest)
  if (violation.shape === "service-cycle") {
    for (const hop of violation.hops) {
      const flags = `${hop.typeOnly ? " (type-only)" : ""}${hop.wiring ? " (wiring)" : ""}`
      push(
        `${baseOf(hop.from)} → ${baseOf(hop.to)} (${prefix}${hop.via.from} → ${prefix}${hop.via.to})${flags}`,
      )
    }
    const wiring = violation.hops.some((hop) => hop.wiring)
    push(
      `services must form a DAG (no-service-cycle); see the sharing progression${
        wiring
          ? " — (wiring): use a fixture adapter, or move the wiring outside the service tree"
          : ""
      }`,
    )
  } else {
    push(
      "runtime module cycle (no-runtime-cycle) — works in dev, silently fails minified",
    )
  }
  const entangled = violation.members.length - new Set(witness).size
  if (entangled > 0) {
    lines.push(
      DAG_CONTINUATION +
        colors.dim(
          `entangled with ${entangled} more — break this cycle and rerun`,
        ),
    )
  }
  return lines
}

/** The inventory both commands share: what the tree is, by size. */
export type InventoryStats = {
  files: number
  /** Total covered bytes — shown so blob % reads as size-computed. */
  totalBytes: number
  blobPercent: number
  /** Distinct service roots — what the layer rules govern. */
  services: number
}

export type GraphStats = InventoryStats & {
  /** Import edges, one per importing file → target pair. */
  imports: number
  /**
   * The exports claim the surface check reached; `null` = no `deblob` field, or
   * `surface` not among the checks run — the segment is absent, and its absence
   * is the diff a dropped field makes in a CI log.
   */
  surface: { checked: number; disclosed: number } | null
}

/**
 * `exports 7 checked, 2 disclosed` — the verb is the caller's: bare says
 * `claimed` (nothing verified there), check says `checked`. Zero disclosed is
 * the common case and prints nothing.
 */
const exportsSegment = (
  count: number,
  verb: string,
  disclosed: number,
): string =>
  `exports ${count} ${verb}${disclosed > 0 ? `, ${disclosed} disclosed` : ""}`

/**
 * The inventory line: verdict first, then the flagship metric by size — same
 * shape as the bare headline, so the two commands read as one instrument.
 */
const summaryLine = (
  groups: readonly ViolationGroup[],
  stats: InventoryStats,
): string => {
  const trailer = `${plural(stats.files, "file")} · ${formatSize(stats.totalBytes)} · ${stats.blobPercent}% blob`
  if (groups.length === 0) return `0 violations · ${trailer}`
  // one fix, one count: a group counts as its lead
  const leads = groups.map((group) => group.lead)
  const counts = KNOWN_CHECKS.flatMap((check) => {
    const count = leads.filter((lead) => lead.check === check).length
    return count > 0 ? [`${count} ${check}`] : []
  })
  // a red the reader could not prove: still a violation, counted apart
  const unknowns = leads.filter(
    (lead) => "unknown" in lead && lead.unknown !== null,
  ).length
  const unknown = unknowns > 0 ? ` · ${unknowns} unknown` : ""
  return `${plural(groups.length, "violation")} (${counts.join(", ")})${unknown} · ${trailer}`
}

/**
 * The coverage line: what the rules govern, what the graph holds, what the
 * claim covers. Diffable as one unit in a CI log — a renamed service, a dropped
 * field, a retracted subpath each move it.
 */
const coverageLine = (stats: GraphStats): string =>
  [
    plural(stats.services, "service"),
    plural(stats.imports, "import"),
    ...(stats.surface === null
      ? []
      : [
          exportsSegment(
            stats.surface.checked,
            "checked",
            stats.surface.disclosed,
          ),
        ]),
  ].join(" · ")

/**
 * The check output: grouped service → file → tagged lines, one per fix — a
 * group's lead, its riders under it, marked `+` — cycle findings as blocks in
 * their bucket — `cross-service` after the named services, `blob` last
 * (findings on unlabeled files, the flagship term on first contact) — then the
 * summary line, the coverage line, and one footer hint to the teaching channel.
 * Fully deterministic — goldens and CI diffs stay stable. Every path prints
 * whole under `pathPrefix` (the runner's cwd → config-root hop, `""` when they
 * coincide) so terminal ctrl+click resolves from where the user ran the
 * command.
 */
export const renderCheckResults = (
  groups: readonly ViolationGroup[],
  stats: GraphStats,
  colors: Colors,
  pathPrefix: string = "",
): string => {
  const lines: string[] = []

  const services = new Map<string | null, Map<string, FileGroup[]>>()
  const dagByService = new Map<string, DagViolation[]>()
  const dagCross: DagViolation[] = []
  const dagBlob: DagViolation[] = []
  for (const group of groups) {
    const violation = group.lead
    if (violation.check === "dag") {
      const { group } = violation
      if (group.kind === "cross-service") {
        dagCross.push(violation)
      } else if (group.kind === "blob") {
        dagBlob.push(violation)
      } else {
        const list = dagByService.get(group.root) ?? []
        dagByService.set(group.root, list)
        list.push(violation)
      }
      continue
    }
    const files =
      services.get(violation.serviceRoot) ?? new Map<string, FileGroup[]>()
    services.set(violation.serviceRoot, files)
    const list = files.get(violation.file) ?? []
    files.set(violation.file, list)
    // a rider shares its lead's file: it comes out of the lead's call
    list.push({ lead: violation, riders: group.riders as FileViolation[] })
  }

  // rule first (no-service-cycle before no-runtime-cycle — the summary's
  // order), then membership — stable block order
  const dagOrder = (list: readonly DagViolation[]): DagViolation[] =>
    [...list].sort((a, b) => {
      const rule = byRuleOrder(a.rules[0] as RuleId, b.rules[0] as RuleId)
      if (rule !== 0) return rule
      return a.members.join(" ") < b.members.join(" ") ? -1 : 1
    })

  const pushFileGroups = (root: string | null) => {
    const files = services.get(root)
    if (files === undefined) return
    for (const file of [...files.keys()].sort()) {
      // whole path, not basename — the line is a ctrl+click target
      lines.push(`  ${pathPrefix}${file}`)
      const cited = (violation: FileViolation): string =>
        `${messageOf(violation, pathPrefix)} (${ruleCite(violation.rules)})`
      const sorted = (files.get(file) as FileGroup[])
        .map(({ lead, riders }) => ({
          lead,
          message: cited(lead),
          riders: riders.map(cited).sort(),
        }))
        // check name, then rendered message — full output determinism
        .map((entry) => ({
          ...entry,
          key: `${entry.lead.check}\u0000${entry.message}`,
        }))
        .sort((a, b) => (a.key < b.key ? -1 : 1))
      for (const { lead, message, riders } of sorted) {
        const tag = colors.accent(lead.check.padEnd(TAG_FIELD))
        const [head, ...rest] = wrap(
          `    ${lead.check.padEnd(TAG_FIELD)}`,
          message,
        )
        lines.push(
          (head as string).replace(lead.check.padEnd(TAG_FIELD), tag),
          ...rest,
        )
        for (const rider of riders)
          lines.push(...wrap(`${CONTINUATION}+ `, rider, RIDER_CONTINUATION))
      }
    }
  }

  const named = [
    ...new Set([
      ...[...services.keys()].filter((root): root is string => root !== null),
      ...dagByService.keys(),
    ]),
  ].sort()

  for (const root of named) {
    lines.push(colors.strong(pathPrefix + root))
    pushFileGroups(root)
    for (const violation of dagOrder(dagByService.get(root) ?? [])) {
      lines.push(...dagBlock(violation, colors, pathPrefix))
    }
    lines.push("")
  }

  if (dagCross.length > 0) {
    lines.push(colors.strong("cross-service"))
    for (const violation of dagOrder(dagCross)) {
      lines.push(...dagBlock(violation, colors, pathPrefix))
    }
    lines.push("")
  }

  if (services.has(null) || dagBlob.length > 0) {
    lines.push(colors.strong("blob"))
    pushFileGroups(null)
    for (const violation of dagOrder(dagBlob)) {
      lines.push(...dagBlock(violation, colors, pathPrefix))
    }
    lines.push("")
  }

  lines.push(summaryLine(groups, stats), coverageLine(stats))

  if (groups.length > 0) {
    const rules = [
      ...new Set(
        groups.flatMap(({ lead, riders }) =>
          [lead, ...riders].flatMap((v) => v.rules),
        ),
      ),
    ].sort(byRuleOrder)
    lines.push(
      colors.dim(
        // pasteable as-is — the observed reflex is copying the whole list
        `why: deblob explain ${rules.join(" ")} · or rerun with --explain`,
      ),
    )
  }

  return `${lines.join("\n")}\n`
}

/**
 * The places deblob cannot read — a file that does not parse, a line the reader
 * cannot interpret. Stderr channel, exit 2, as an unresolved import: deblob
 * declines to certify, whatever the verdicts printed above.
 */
export const renderBroken = (
  broken: readonly BrokenSite[],
  colors: Colors,
  pathPrefix: string,
): string => {
  const lines: string[] = [
    colors.strong(
      `deblob cannot read ${plural(broken.length, "place")} — results cannot be certified`,
    ),
  ]
  for (const entry of broken) {
    const line = entry.line === null ? "" : `:${entry.line}`
    lines.push(`  ${pathPrefix}${entry.file}${line}`)
    lines.push(...wrap("    ", entry.reason, "    "))
  }
  return `${lines.join("\n")}\n`
}

/**
 * Resolver-failed literal imports — each one a provably missing edge, so the
 * graph is incomplete and the run must not certify. Stderr channel, exit 2
 * (config-error class: the fault may be the run's world — unwired tsconfig,
 * missing install, bundler-only alias — never provably the code).
 */
export const renderUnresolved = (
  unresolved: readonly UnresolvedImport[],
  colors: Colors,
  pathPrefix: string,
): string => {
  const lines: string[] = [
    colors.strong(
      `resolution failed — ${plural(unresolved.length, "import")} did not resolve; the graph is incomplete, results cannot be certified`,
    ),
  ]
  for (const entry of unresolved) {
    lines.push(`  ${pathPrefix}${entry.from}`)
    lines.push(...wrap("    ", `${entry.specifier} — ${entry.reason}`, "    "))
  }
  lines.push(
    "",
    ...wrapPlain(
      `remedies: point config key "tsconfig" at the tsconfig carrying your paths aliases (default: tsconfig.json at the config root), install the missing package, declare bundler-only aliases via config key "alias", or declare environment-provided modules (bundler virtual modules, runtime-provided modules — nothing on disk) via config key "external".`,
    ),
  )
  return `${lines.join("\n")}\n`
}

/**
 * `check surface` named by hand on a package with no `deblob` field: the check
 * had nothing to check, and a pass it never ran must not read as a pass.
 * Stderr, exit stays 0 — nothing is demanded from a package that did not opt
 * in; the default run says the same thing by printing no exports segment.
 */
export const SURFACE_NOT_CLAIMED = `surface: no "deblob" field in package.json — nothing to check; declaring is opting in ("deblob": {})\n`

/**
 * Exports subpaths the surface check could not reach through any of their
 * module targets — claims the run cannot certify. Not violations (no rule was
 * broken): the twin of the resolution block, stderr, exit 2, until each entry
 * is mapped through the build mirror or disclosed in the manifest's `blob`. One
 * block per subpath: its targets on one line, one reason when they all missed
 * the same way, else each target's own.
 */
export const renderUnverified = (
  unverified: readonly UnverifiedEntry[],
  colors: Colors,
  pathPrefix: string,
): string => {
  const lines: string[] = [
    colors.strong(
      `surface unverified — ${plural(unverified.length, "entry", "entries")} could not be reached; the claim cannot be certified`,
    ),
  ]
  const reasonOf = (target: UnverifiedTarget): string => {
    const where =
      target.mirror === null
        ? "under no build mirror root"
        : `mirrors ${target.mirror.root} → ${target.mirror.source}`
    const found =
      target.candidates.length === 0
        ? target.mirror === null
          ? "not a covered module"
          : `no covered module at ${pathPrefix}${target.mapped}`
        : `${plural(target.candidates.length, "covered module")} at ${pathPrefix}${target.mapped} (${target.candidates.map((candidate) => pathPrefix + candidate).join(", ")}), the mirror cannot pick one`
    return `${where}, ${found}`
  }
  for (const entry of unverified) {
    const reasons = entry.targets.map(reasonOf)
    const shared = reasons.every((reason) => reason === reasons[0])
    const reason = shared
      ? (reasons[0] as string)
      : entry.targets
          .map((target, i) => `${pathPrefix}${target.target}: ${reasons[i]}`)
          .join("; ")
    lines.push(
      `  ${entry.targets.map((target) => pathPrefix + target.target).join(", ")}`,
    )
    lines.push(
      ...wrap("    ", `exported as "${entry.subpath}" — ${reason}`, "    "),
    )
  }
  // called with at least one entry — assembly's contract; the first one is
  // the remedy's worked example
  const example = (unverified[0] as UnverifiedEntry).subpath
  lines.push(
    "",
    ...wrapPlain(
      `remedies: name the output root your exports map points at via config key "build" (default "dist", mirroring src/ one-to-one; a record maps several roots), widen config key "include" if the source is there but uncovered (or "exclude" a twin when two covered modules share a path — src/x.ts beside src/x.js), or disclose the entry in package.json — "deblob": { "blob": ["${example}"] } — which retracts the claim for that subpath: consumers see it unlabeled.`,
    ),
  )
  return `${lines.join("\n")}\n`
}

/** `deblob.config.ts (flavor: ts-suffixes-factories)` / `no config (defaults)` */
export const provenanceOf = (
  configPath: string | null,
  flavorName: string,
): string =>
  configPath === null
    ? "no config (defaults)"
    : `${configPath} (flavor: ${flavorName})`

/** `125952` → `123kb`, `5242880` → `5mb` — the headline's size unit. */
export const formatSize = (bytes: number): string => {
  const kb = bytes / 1024
  return kb >= 1000
    ? `${(kb / 1024).toFixed(1).replace(/\.0$/, "")}mb`
    : `${Math.round(kb)}kb`
}

/** Size-weighted blob share — blob is uncharacterized mass, all of it counts. */
const blobPercentOf = (
  entries: readonly { size: number; blob: boolean }[],
): number => {
  const total = entries.reduce((sum, entry) => sum + entry.size, 0)
  if (total === 0) return 0
  const blob = entries.reduce(
    (sum, entry) => sum + (entry.blob ? entry.size : 0),
    0,
  )
  return Math.round((blob / total) * 100)
}

/**
 * Both size headlines in one fold — total covered bytes + blob % — so every
 * command computes them the same way.
 */
export const sizeStatsOf = (
  entries: readonly { size: number; blob: boolean }[],
): { totalBytes: number; blobPercent: number } => ({
  totalBytes: entries.reduce((sum, entry) => sum + entry.size, 0),
  blobPercent: blobPercentOf(entries),
})

export type BareStatus = {
  version: string
  provenance: string
  /** `null` = the config broke: the lines needing it are skipped, exit stays 0. */
  stats:
    | (InventoryStats & {
        /**
         * The `deblob` field's claim as written, tallied at scan speed; `null`
         * = no field (or a field this version cannot read — its teaching error
         * went to stderr, the segment is skipped, exit stays 0).
         */
        surface: { claimed: number; disclosed: number } | null
      })
    | null
}

/** Bare `deblob` — status + discovery, never diagnosis. Exit 0 territory. */
export const renderBareStatus = (status: BareStatus, colors: Colors): string =>
  [
    `deblob ${status.version} · ${status.provenance}`,
    "",
    ...(status.stats === null
      ? []
      : [
          colors.strong(
            `  ${plural(status.stats.files, "file")} · ${formatSize(status.stats.totalBytes)} · ${status.stats.blobPercent}% blob`,
          ),
          `  ${[
            plural(status.stats.services, "service"),
            ...(status.stats.surface === null
              ? []
              : [
                  exportsSegment(
                    status.stats.surface.claimed,
                    "claimed",
                    status.stats.surface.disclosed,
                  ),
                ]),
          ].join(" · ")}`,
          "",
        ]),
    "Commands",
    "  deblob check [what...]      run architecture checks",
    `                              (${KNOWN_CHECKS.join(" · ")})`,
    "  deblob explain <topic...>   explain rules or checks",
    "  deblob --help               full help",
    "",
  ].join("\n")

/** Plain wrap at the output width, no indent. */
const wrapPlain = (text: string): string[] => {
  const lines: string[] = []
  let line = ""
  for (const word of mergeCiteTokens(text.split(" "))) {
    const candidate = line === "" ? word : `${line} ${word}`
    if (candidate.length > WIDTH && line !== "") {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  lines.push(line)
  return lines
}

const lowerFirst = (text: string): string =>
  text.charAt(0).toLowerCase() + text.slice(1)

/**
 * The teaching channel: per rule, the summary excerpt, the mapped knowledge
 * card(s) verbatim, the canonical URL. A card cited by several explained rules
 * prints once — later citations point up.
 */
export const renderExplain = (
  entries: readonly ExplainEntry[],
  colors: Colors,
): string => {
  const lines: string[] = []
  const shown = new Set<string>()
  for (const entry of entries) {
    if (lines.length > 0) lines.push("", "···", "")
    lines.push(
      colors.strong(`${entry.rule} — ${lowerFirst(entry.title)}`),
      "",
      ...wrapPlain(entry.body),
    )
    if (entry.verdicts !== null) {
      lines.push("", colors.accent("reading a verdict"))
      for (const paragraph of entry.verdicts)
        lines.push("", ...wrapPlain(paragraph))
    }
    for (const card of entry.cards) {
      lines.push("")
      if (shown.has(card.slug)) {
        lines.push(colors.dim(`card: ${card.slug} — shown above`))
        continue
      }
      shown.add(card.slug)
      lines.push(colors.accent(`card: ${card.slug}`), "", card.text.trimEnd())
    }
    lines.push("", "full text:", colors.dim(entry.url))
  }
  return `${lines.join("\n")}\n`
}

export const HELP = `deblob — machine-checkable hexagonal architecture for TypeScript/ESM

Usage
  deblob                       project status + discovery
  deblob check [what...]       run architecture checks (default: all)
  deblob explain <topic...>    explain rules or checks (service-purity,
                               layers, ...)

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
