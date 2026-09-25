// call-stack.js — a function's full stack from the sequence snapshot, pure.
// Spec: data/CALL-STACKS.md (behaviour 2, "calls" arrows); DECISIONS Session 36.
//
//   CallStack.load(url)   → Promise<D>  D = { callables, hooks: { name → { trace, module } } }
//   CallStack.of(D, id)   → stack | null
//     id: `hook:<name>`, or a member row `module#Symbol` (its own body and,
//     for a factory, every `module#Symbol.member` it returns)
//     stack.calls[]: { id, num, label, from, to, fromMod, toMod, sym, callee, kind, depth, loop, cond }
//       from / to: subject ids (`hook:x`, `module#Symbol`, or a module)
//       num: communication-diagram number, 1, 1.1, 1.2, 2 (nesting = depth)
//     stack.modules: every module a call leaves from or lands in
//     stack.rows: module → Set of symbols the stack touches
//     stack.used: Map `fromMod>toMod` → Set of target symbols
//     stack.frames: Map frame id → { parent, call|null } (every frame walked)
//     stack.kids: Map frame id → child frame ids
//
// Rules (CALL-STACKS.md): depth-first over `frames` in order, following `ref`;
// stop on `recursion` and on a function already open. `unbound` and
// `external` frames are left out. A call inside the same file is folded into
// its caller: not numbered, not drawn, and what it reaches counts as its
// caller's next hops (the sequence diagram keeps it as a self-message).
// Stacks stop at a port (no binding in the data yet).
(function (root) {
  const HIDE = new Set(['unbound', 'external']);
  const COND = new Set(['if', 'switch', '?:', '&&', '||', '??', 'dispatch', 'catch']);
  const cut = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;

  function load(url) { return fetch(url).then(r => r.json()).then(index); }
  // Index a snapshot already in hand (the sequence panel shares its copy).
  function index(S) {
    {
      const hooks = {};
      for (const d of S.drivers || []) for (const h of d.hooks || []) hooks[h.name] = { ...h, module: d.module };
      const by = {};
      for (const k in S.callables) { const c = S.callables[k], id = c.module + '#' + c.symbol; (by[id] = by[id] || []).push(k); }
      for (const id in by) by[id].sort((a, b) => (S.callables[a].member ? 1 : 0) - (S.callables[b].member ? 1 : 0));
      return { callables: S.callables, hooks, by };
    }
  }

  // UML guard notation: `*` for an iteration, `[arm]` for the innermost condition.
  function guardOf(gs) {
    let loop = false, cond = null;
    for (const g of gs) { if (g.kind === 'loop') loop = true; else if (COND.has(g.kind)) cond = g.arm; }
    return { loop, cond: cond ? cut(String(cond).replace(/\s+/g, ' '), 24) : null };
  }

  function of(D, id) {
    if (!D || !id) return null;
    let roots;
    if (id.indexOf('hook:') === 0) {
      const h = D.hooks[id.slice(5)];
      if (!h || !h.trace || !h.trace.length) return null;
      roots = [{ frames: h.trace, mod: h.module, key: null }];
    } else {
      const keys = D.by[id];
      if (!keys) return null;
      roots = keys.map(k => ({ frames: D.callables[k].frames, mod: D.callables[k].module, key: k }));
    }
    const calls = [], modules = new Set(), rows = new Map(), used = new Map(), open = new Set(roots.map(r => r.key).filter(Boolean));
    // Panel steps as frames (selection-model § 1): every frame walked, drawn or
    // not (same-file, external, recursion), with its parent frame id.
    const frames = new Map(), kids = new Map();
    const note = (fid, pf, call) => { if (!fid || frames.has(fid)) return; frames.set(fid, { parent: pf, call }); if (pf) { if (!kids.has(pf)) kids.set(pf, []); kids.get(pf).push(fid); } };
    const touch = (m, sym) => { modules.add(m); if (!rows.has(m)) rows.set(m, new Set()); if (sym) rows.get(m).add(sym); };
    const walk = (frames_, from, fromMod, prefix, ctr, inherited, pf) => {
      for (const f of frames_ || []) {
        if (f.kind === 'unbound') continue;
        if (HIDE.has(f.kind)) { note(f.id, pf, null); continue; }
        const t = f.target || {}, tm = t.module, c = f.ref && f.kind !== 'recursion' ? D.callables[f.ref] : null;
        const gs = [...inherited, ...(f.guards || [])];
        if (!tm || tm === fromMod) {   // same file: folded into the caller
          note(f.id, pf, null);
          if (c && !open.has(f.ref)) { open.add(f.ref); walk(c.frames, from, fromMod, prefix, ctr, gs, f.id); }
          continue;
        }
        const num = (prefix ? prefix + '.' : '') + (++ctr.n), g = guardOf(gs);
        const to = t.symbol ? tm + '#' + t.symbol : tm;
        calls.push({ id: f.id, num, label: num + (g.loop ? '*' : '') + (g.cond ? ` [${g.cond}]` : ''), from, to, fromMod, toMod: tm, sym: t.symbol || null, callee: f.callee, kind: f.kind, depth: num.split('.').length, loop: g.loop, cond: g.cond });
        note(f.id, pf, calls[calls.length - 1]);
        touch(fromMod, from.indexOf('#') > 0 ? from.slice(from.indexOf('#') + 1) : null); touch(tm, t.symbol);
        const k = fromMod + '>' + tm; if (!used.has(k)) used.set(k, new Set()); if (t.symbol) used.get(k).add(t.symbol);
        if (c && !open.has(f.ref)) { open.add(f.ref); walk(c.frames, to, tm, num, { n: 0 }, [], f.id); }
      }
    };
    const top = { n: 0 };
    for (const r of roots) walk(r.frames, id, r.mod, '', top, [], null);
    if (!calls.length) return null;
    return { calls, modules, rows, used, frames, kids };
  }

  root.CallStack = { load, index, of, guardOf };
})(typeof window !== 'undefined' ? window : globalThis);
