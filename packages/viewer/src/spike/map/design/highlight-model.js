// highlight-model.js — salience, stack and occlusion, as pure functions.
// docs/highlight-model.md is the spec; names here match it one for one.
//
// Everything reads a `view`: what the model needs to know about the frame.
//   view.nodes          visible node ids, layout order
//   view.edges          visible arrows [{ id, a, b, ends?, pts }], layout order
//   view.edge(id)       arrow by id, or undefined
//   view.lift(id)       q: any subject id → the visible node that represents it
//   view.inside(id, x)  x is id or a descendant of id (visible or not)
//   view.depth(id)      nesting depth of a visible node
//   view.memberOf(x)    the module a member row belongs to, else null
//   view.surface(id)    O1: the node has an opaque face
//   view.rect(id)       { x, y, w, h } of a visible node
//   view.bundle(id)     A19: the arrows a bundle id stands for, else null (optional)
//   view.stack(x)       a function subject's stack: { nodes, edges } (drawn ends
//                       of its calls, arrows it uses), else null (optional)
// Selection model (docs/selection-model.md), used by tiers / stackOf:
//   view.container(id)  unit or layer: high only when P names it (optional, else false)
//   view.parent(id)     parent node id, else null (optional; faster container test)
//   view.frame(fid)     calls world only: a panel step { arc, kids } (arc = edge id
//                       of its call, kids = nested frame ids); edges carry m.calls
//                       = the frames they draw. Its presence marks the calls world.
(function (root) {
  const isArrow = id => id.indexOf('|') >= 0;
  const endpoints = m => [m.a, m.b, ...(m.ends || [])];
  const length = pts => { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return l; };
  const cmp = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
  const frameOf = (view, x) => view.frame && typeof x === 'string' ? view.frame(x) : null;
  const empty = () => ({ scope: new Set(), nodes: new Set(), edges: new Set(), calls: new Set() });
  const addEdge = (view, o, id) => { const m = view.edge(id); if (!m) return; o.edges.add(id); for (const e of endpoints(m)) o.nodes.add(e); };
  // A step: its call and (unless own) every call nested in it, their arrows, their ends.
  function stepSet(view, x, own) {
    const o = empty(), st = [x];
    while (st.length) { const f = st.pop(), F = view.frame(f); if (!F) continue; o.calls.add(f); addEdge(view, o, F.arc); if (!own) st.push(...(F.kids || [])); }
    return o;
  }

  // q — the quotient map. A subject that is folded away is represented by the
  // deepest visible node containing it; a visible arrow represents itself.
  const bundleOf = (view, x) => view.bundle ? view.bundle(x) : null;
  function rep(view, x) {
    if (!x) return null;
    // A group (sticky select) is represented by its first member, the anchor.
    if (Array.isArray(x)) return rep(view, x[0]);
    if (isArrow(x)) return view.edge(x) || bundleOf(view, x) ? x : null;
    return view.lift(x);
  }

  // P(x) — participants. scope: the representative and its visible
  // descendants (an arrow: its ends). edges: every arrow touching the scope.
  // nodes: scope ∪ endpoints of those arrows.
  function participants(view, x) {
    // A group: the union of its members' participants (P(a ∪ b) = P(a) ∪ P(b)).
    if (Array.isArray(x)) {
      let out = null;
      for (const id of x) {
        const P = participants(view, id);
        if (!P) continue;
        if (!out) out = empty();
        for (const k of ['scope', 'nodes', 'edges', 'calls']) for (const v of P[k] || []) out[k].add(v);
      }
      return out;
    }
    // P(step) = its sub-stack (selection-model § 1).
    if (frameOf(view, x)) return stepSet(view, x, false);
    // P(f), a function with a traced stack (hook, member row): scope q(f);
    // edges: the arrows its stack uses; nodes: scope ∪ q(every end of every call).
    // Call mode: every subject takes this path (view.stack = the pinned stack's
    // calls touching it); scope is q(x) with its descendants, as usual.
    const St = view.stack ? view.stack(x) : null;
    if (St) { const q = rep(view, x), scope = new Set(q ? [q] : []); if (q) for (const id of view.nodes) if (view.inside(q, id)) scope.add(id); return { scope, nodes: new Set([...scope, ...St.nodes]), edges: new Set(St.edges), calls: new Set() }; }
    const r = rep(view, x);
    if (!r) return null;
    const scope = new Set(), nodes = new Set(), edges = new Set(), calls = new Set();
    const take = m => { edges.add(m.id); for (const e of endpoints(m)) nodes.add(e); for (const f of m.calls || []) calls.add(f); };
    // A bundle (A19) is a subject: its participants are its strands' together.
    if (isArrow(r)) { for (const m of view.edge(r) ? [view.edge(r)] : bundleOf(view, r)) take(m); for (const n of nodes) scope.add(n); return { scope, nodes, edges, calls }; }
    for (const id of view.nodes) if (view.inside(r, id)) { scope.add(id); nodes.add(id); }
    for (const m of view.edges) if (endpoints(m).some(e => view.inside(r, e))) take(m);
    return { scope, nodes, edges, calls };
  }

  // Hover set: P(x), except a step, which is its own call only (§ 1). A step with
  // no call of its own on the map changes nothing.
  function hoverSet(view, x) {
    if (frameOf(view, x)) { const o = stepSet(view, x, true); return o.edges.size ? o : null; }
    return participants(view, x);
  }

  // Tiers (selection-model § 2): rest · low · high · highest for every node, arrow
  // and step. G = selection (id, array or null), h = hover.
  //   idle      G = ∅, no h          everything rest
  //   hover     G = ∅, h             high = hoverSet(h), rest low
  //   selected  G                    high = P(G), rest low
  //   narrowed  G, h, F ≠ ∅          high = F, rest low (Π included)
  //   blind     G, h, F = ∅          as selected
  // F = hoverSet(h) ∩ P(G): calls world on calls then their arrows, imports world
  // on arrows; nodes = hoverSet(h).scope ∩ P(G).nodes plus the ends of F's arrows.
  // Containers: high only if named by the set, rest while holding one of its nodes,
  // else low. A box with a high member row is high. Highest: high arrows touching
  // the subject's scope, or the subject itself / a step subject's own call.
  const asGroup = sel => sel == null ? [] : Array.isArray(sel) ? sel : [sel];
  function highOf(view, G, hover) {
    const Ps = G.length ? participants(view, G) : null, Ph = hover ? hoverSet(view, hover) : null;
    if (Ps && Ph) {
      const F = empty();
      if (view.frame) { for (const f of Ph.calls) if (Ps.calls.has(f)) { F.calls.add(f); addEdge(view, F, view.frame(f).arc); } }
      else for (const id of Ph.edges) if (Ps.edges.has(id)) addEdge(view, F, id);
      for (const id of Ph.scope) if (Ps.nodes.has(id)) F.nodes.add(id);
      if (F.nodes.size || F.edges.size) return { H: F, state: 'narrowed', subj: [hover], Ph };
      return { H: Ps, state: 'blind', subj: G, Ph };
    }
    if (Ps) return { H: Ps, state: 'selected', subj: G, Ph };
    if (Ph) return { H: Ph, state: 'hover', subj: [hover], Ph };
    return { H: null, state: 'idle', subj: [], Ph };
  }
  function tierFn(view, r, hover) {
    const { H, subj, Ph } = r;
    if (!H) return () => 'rest';
    const hiBox = new Set(), held = new Set(), sScope = new Set(), sEdges = new Set();
    for (const id of H.nodes) { const b = view.memberOf(id); if (b) hiBox.add(b); }
    if (view.parent) for (const id of H.nodes) for (let p = view.parent(id); p && !held.has(p); p = view.parent(p)) held.add(p);
    const holds = c => view.parent ? held.has(c) : [...H.nodes].some(x => x !== c && view.inside(c, x));
    for (const x of subj) {
      const f = frameOf(view, x);
      if (f) { sEdges.add(f.arc); continue; }
      const p = x === hover && Ph ? Ph : participants(view, x);
      if (!p) continue;
      for (const id of p.scope) sScope.add(id);
      if (isArrow(x)) for (const id of p.edges) sEdges.add(id);
    }
    return id => {
      if (frameOf(view, id)) return H.calls.has(id) ? 'high' : 'low';
      if (isArrow(id)) {
        const m = view.edge(id);
        if (!m) { const b = bundleOf(view, id); return b && b.length ? LOOKS[Math.max(...b.map(s => LOOK[tierOfEdge(s)]))] : 'low'; }
        return tierOfEdge(m);
      }
      if (view.container && view.container(id)) return H.nodes.has(id) ? 'high' : holds(id) ? 'rest' : 'low';
      return H.nodes.has(id) || hiBox.has(id) ? 'high' : 'low';
    };
    function tierOfEdge(m) {
      if (!H.edges.has(m.id)) return 'low';
      return sEdges.has(m.id) || sScope.has(m.a) || sScope.has(m.b) ? 'highest' : 'high';
    }
  }
  const LOOK = { low: 0, rest: 1, high: 2, highest: 3 }, LOOKS = ['low', 'rest', 'high', 'highest'];
  function tiers(view, sel, hover) {
    const G = asGroup(sel);
    // § 5: a low element gets no hover highlight; low is read from the selection
    // alone (keyboard hover has no pointer reset). Such a hover is blind.
    let r0 = null, dropped = false;
    if (G.length && hover != null) { r0 = highOf(view, G, null); if (tierFn(view, r0, null)(hover) === 'low') dropped = true; }
    const r = dropped ? { ...r0, state: 'blind' } : highOf(view, G, hover), tierOf = tierFn(view, r, dropped ? null : hover);
    const tier = new Map(), lit = new Set();
    for (const id of view.nodes) { const t = tierOf(id); tier.set(id, t); if (t === 'high') lit.add(id); }
    for (const m of view.edges) { const t = tierOf(m.id); tier.set(m.id, t); if (LOOK[t] >= 2) lit.add(m.id); }
    // Hover highlight follows the tier read from the selection alone (§ 5).
    let alone = null;
    const hoverable = id => {
      if (!G.length) return true;
      if (!alone) alone = r.state === 'selected' || r.state === 'blind' ? tierOf : tierFn(view, r0 || highOf(view, G, null), null);
      return alone(id) !== 'low';
    };
    // Held (§ 2): narrowed, an arrow low by the hover but high by the selection
    // alone keeps its stack place; it only takes the low look.
    let a0 = null, nodeSet = null;
    const held = id => {
      if (r.state !== 'narrowed' || tierOf(id) !== 'low') return false;
      if (!nodeSet) { nodeSet = new Set(view.nodes); a0 = tierFn(view, r0 || highOf(view, G, null), null); }
      return !nodeSet.has(id) && LOOK[a0(id)] >= 2;
    };
    return { state: r.state, subject: r.subj, H: r.H, tier, tierOf, lit, hoverable, held };
  }
  // U5 stack: low/rest arrows < nodes < held < high arrows < highest arrows; lit arrows
  // shorter above longer, then layout order. Nodes: depth first, then high above
  // the rest. A node never sorts under an ancestor, whatever the tiers: faces are
  // opaque, so a rest container over low children, or a folding card lit by the
  // landing frame over its leaving children (mid-tween), would hide them.
  function stackOf(view, T) {
    const items = [];
    view.nodes.forEach((id, i) => items.push({ id, key: [1, view.depth(id), LOOK[T.tierOf(id)] >= 2 ? 1 : 0, 0, i] }));
    view.edges.forEach((m, i) => { const t = LOOK[T.tierOf(m.id)], hd = t < 2 && !!T.held && T.held(m.id), lit = t >= 2 || hd; items.push({ id: m.id, key: [hd ? 1.5 : lit ? t : 0, 0, 0, lit ? -length(m.pts) : 0, view.nodes.length + i] }); });
    items.sort((a, b) => cmp(a.key, b.key));
    const z = new Map();
    items.forEach((it, i) => z.set(it.id, i));
    return { order: items, z };
  }

  // H — the highlight, and the focus state it came from.
  //   idle      nothing selected, nothing hovered,     H = ∅ (all low)
  //             or a selection standing for nothing    (opts.idle 'high': null)
  //   hover     hover only                             H = P(hover)
  //   selected  selection only                         H = P(sel)
  //   narrowed  both, F = P(hover) ∩ P(sel) not empty  H = F
  //   blind     both, F empty                          H = P(sel)
  // Hover never adds: it narrows or does nothing.
  function salience(view, sel, hover, opts) {
    const B = participants(view, sel || hover);
    if (!B) return { H: opts && opts.idle === 'high' ? null : new Set(), state: 'idle', subject: null };
    let H = B, state = sel ? 'selected' : 'hover';
    if (sel && hover) {
      const Ph = participants(view, hover);
      state = 'blind';
      if (Ph) {
        const nodes = new Set(), edges = new Set();
        for (const id of Ph.scope) if (B.nodes.has(id)) nodes.add(id);
        for (const id of Ph.edges) if (B.edges.has(id)) { edges.add(id); for (const e of endpoints(view.edge(id))) nodes.add(e); }
        if (nodes.size || edges.size) { H = { scope: nodes, nodes, edges }; state = 'narrowed'; }
      }
    }
    const set = new Set([...H.nodes, ...H.edges]);
    return { H: set, state, subject: subject(view, sel, hover, set) };
  }

  // The subject: what hover resolves to when it stands inside H, else the
  // selection's representative. Used by the stack (S5) only.
  function subject(view, sel, hover, H) {
    const h = hover && !isArrow(hover) ? view.lift(hover) : null;
    if (h && H && H.has(h)) return h;
    return sel ? rep(view, sel) : null;
  }

  // K(el) — the sort key. One tuple per drawable, compared lexicographically;
  // the stack is the sorted list and z = index.
  //   [0] layer   0 dim arrow · 1 node · 2 lit arrow                     S1
  //   [1] tier    node in H → 1, else 0 (arrows: 0)                      S2
  //   [2] depth   nesting depth (arrows: 0)                              S3
  //   [3] near    lit arrow ending on the subject or one of its members  S5a
  //   [4] -length lit arrow: shorter above longer                        S5b
  //   [5] index   layout order; makes the order total                    S4/S5c
  const touches = (view, x, s) => !!s && (x === s || view.memberOf(x) === s);
  function sortKey(view, H, subj, el, i) {
    if (!isArrow(el.id)) return [1, H ? (H.has(el.id) ? 1 : 0) : 1, view.depth(el.id), 0, 0, i];
    const lit = !!H && H.has(el.id);
    return [lit ? 2 : 0, 0, 0, lit && (touches(view, el.a, subj) || touches(view, el.b, subj)) ? 1 : 0, lit ? -length(el.pts) : 0, i];
  }
  function stack(view, H, subj) {
    const items = [];
    view.nodes.forEach((id, i) => items.push({ id, key: sortKey(view, H, subj, { id }, i) }));
    view.edges.forEach((m, i) => items.push({ id: m.id, key: sortKey(view, H, subj, m, view.nodes.length + i) }));
    items.sort((a, b) => cmp(a.key, b.key));
    const z = new Map();
    items.forEach((it, i) => z.set(it.id, i));
    return { order: items, z };
  }

  // Occlusion. picture(H): the surfaces (O1) whose scope holds a lit node (O2).
  // cutters(m): the surfaces of the picture that m does not end inside (O3).
  // Dim arrows are never cut (O4): callers only ask for lit arrows.
  function picture(view, H) {
    if (!H) return [];
    const lit = [...H].filter(id => !isArrow(id));
    return view.nodes.filter(id => view.surface(id) && lit.some(x => view.inside(id, x)));
  }
  const hides = (view, sid, m) => !view.inside(sid, m.a) && !view.inside(sid, m.b);
  function cutters(view, pic, m) { return pic.filter(sid => hides(view, sid, m)); }

  // Cut polyline chains against a rect: the parts inside are dropped, what is
  // left comes back as chains. Slab test, so any segment direction works.
  function cut(chains, R) {
    const out = [];
    const slab = (p, d, lo, hi) => { if (d === 0) return p > lo && p < hi ? [-Infinity, Infinity] : null; const a = (lo - p) / d, b = (hi - p) / d; return a < b ? [a, b] : [b, a]; };
    for (const pts of chains) {
      let cur = [];
      const flush = () => { if (cur.length > 1) out.push(cur); cur = []; };
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], dx = x2 - x1, dy = y2 - y1;
        const sx = slab(x1, dx, R.x, R.x + R.w), sy = slab(y1, dy, R.y, R.y + R.h);
        const tin = sx && sy ? Math.max(sx[0], sy[0], 0) : 1, tout = sx && sy ? Math.min(sx[1], sy[1], 1) : 0;
        if (tin >= tout) { if (!cur.length) cur.push([x1, y1]); cur.push([x2, y2]); continue; }
        if (tin > 0) { if (!cur.length) cur.push([x1, y1]); cur.push([x1 + dx * tin, y1 + dy * tin]); }
        flush();
        if (tout < 1) { cur.push([x1 + dx * tout, y1 + dy * tout]); cur.push([x2, y2]); }
      }
      flush();
    }
    return out;
  }
  function visibleChains(view, pic, m) {
    let chains = [m.pts];
    for (const sid of cutters(view, pic, m)) chains = cut(chains, view.rect(sid));
    return chains;
  }

  root.HighlightModel = { rep, participants, hoverSet, tiers, stackOf, salience, subject, sortKey, stack, picture, cutters, cut, visibleChains };
})(typeof window !== 'undefined' ? window : globalThis);
