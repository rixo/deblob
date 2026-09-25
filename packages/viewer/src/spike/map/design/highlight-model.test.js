// Fixture + assertions for highlight-model.js. Run: load highlight-model.js,
// then this file, then call runHighlightTests(window.HighlightModel).
//
// Fixture (x →):  U[hex[B C] g[A]]   V[D[run]]   W(folded: E)   Z[F]
//   e1 B→D   crosses U#g and A on its way out of U
//   e2 D→A   crosses nothing
//   e3 E→D   E is folded into W, so it is drawn W→D
//   e4 E→B   drawn W→B, crosses V (and D) on its way
//   e5 C→D#run  ends on a member row
(function (root) {
  const T = {
    U: { p: null, t: 'unit', r: [0, 0, 200, 120] },
    'U#hex': { p: 'U', t: 'hex', r: [10, 30, 100, 80] },
    B: { p: 'U#hex', t: 'item', r: [20, 40, 40, 20] },
    C: { p: 'U#hex', t: 'item', r: [20, 80, 40, 20] },
    'U#g': { p: 'U', t: 'group', r: [120, 30, 70, 80] },
    A: { p: 'U#g', t: 'item', r: [130, 40, 50, 20] },
    V: { p: null, t: 'unit', r: [300, 0, 100, 120] },
    D: { p: 'V', t: 'item', r: [310, 40, 60, 40] },
    'D#run': { p: 'D', t: 'member', r: [310, 60, 60, 10] },
    W: { p: null, t: 'fold', r: [500, 0, 100, 120] },
    E: { p: 'W', t: 'item', hidden: true },
    Z: { p: null, t: 'unit', r: [700, 0, 100, 120] },
    F: { p: 'Z', t: 'item', r: [710, 40, 40, 20] },
  };
  const edges = [
    { id: 'B|D', a: 'B', b: 'D', pts: [[60, 50], [310, 50]] },
    { id: 'D|A', a: 'D', b: 'A', pts: [[310, 55], [180, 55]] },
    { id: 'W|D', a: 'W', b: 'D', ends: ['E'], pts: [[500, 60], [370, 60]] },
    { id: 'W|B', a: 'W', b: 'B', ends: ['E'], pts: [[500, 70], [60, 70]] },
    { id: 'C|D#run', a: 'C', b: 'D#run', pts: [[60, 90], [310, 65]] },
  ];
  // A19: B→D and W→D end on D from the same side — one bundle
  const bundles = { 'D|import|1|n': ['B|D', 'W|D'] };
  const view = {
    nodes: Object.keys(T).filter(id => !T[id].hidden),
    edges,
    edge: id => edges.find(e => e.id === id),
    lift: id => { let c = id; while (c && (!T[c] || T[c].hidden)) c = T[c] ? T[c].p : null; return c; },
    inside: (id, x) => { let c = x; while (c) { if (c === id) return true; c = T[c] && T[c].p; } return false; },
    depth: id => { let d = 0, c = T[id].p; while (c) { d++; c = T[c].p; } return d; },
    memberOf: x => T[x] && T[x].t === 'member' ? T[x].p : null,
    surface: id => ['unit', 'driver', 'fold', 'hex', 'group', 'item'].includes(T[id].t),
    rect: id => { const [x, y, w, h] = T[id].r; return { x, y, w, h }; },
    bundle: id => bundles[id] ? bundles[id].map(k => edges.find(e => e.id === k)) : null,
  };

  root.runHighlightTests = function (HM) {
    const fails = [];
    let n = 0;
    const eq = (name, got, want) => { n++; const g = JSON.stringify(got), w = JSON.stringify(want); if (g !== w) fails.push(`${name}\n  got  ${g}\n  want ${w}`); };
    const setEq = (name, got, want) => eq(name, [...got].sort(), [...want].sort());
    const S = (sel, hover) => HM.salience(view, sel, hover);
    const S0 = (sel, hover, o) => HM.salience(view, sel, hover, o);
    const zOf = (st, id) => st.z.get(id);
    const nodesOf = st => st.order.filter(o => o.id.indexOf('|') < 0).map(o => o.id);
    const arrowsOf = st => st.order.filter(o => o.id.indexOf('|') >= 0).map(o => o.id);

    // q — quotient
    eq('q: folded item → its fold', HM.rep(view, 'E'), 'W');
    eq('q: visible node → itself', HM.rep(view, 'B'), 'B');
    setEq('P(E) = P(W)', HM.participants(view, 'E').nodes, HM.participants(view, 'W').nodes);
    // A19 bundle as subject: its strands and their ends, nothing else
    eq('q: bundle → itself', HM.rep(view, 'D|import|1|n'), 'D|import|1|n');
    setEq('P(bundle).edges = its strands', HM.participants(view, 'D|import|1|n').edges, ['B|D', 'W|D']);
    setEq('P(bundle).nodes = strand ends', HM.participants(view, 'D|import|1|n').nodes, ['B', 'D', 'W', 'E']);
    setEq('hover bundle lights strands + ends', S(null, 'D|import|1|n').H, ['B|D', 'W|D', 'B', 'D', 'W', 'E']);

    // states
    let r = S(null, null);
    eq('idle: H empty (all low)', r.H instanceof Set && r.H.size, 0); eq('idle: state', r.state, 'idle');
    eq('idle high: H null', S0(null, null, { idle: 'high' }).H, null);
    eq('sel standing for nothing: all low', S0('nowhere', null).H instanceof Set && S0('nowhere', null).H.size, 0);
    r = S(null, 'D');
    eq('hover: state', r.state, 'hover');
    setEq('hover D: H', r.H, ['D', 'D#run', 'B', 'A', 'W', 'E', 'C', 'B|D', 'D|A', 'W|D', 'C|D#run']);
    eq('hover D: subject', r.subject, 'D');
    r = S('U', null);
    eq('selected: state', r.state, 'selected');
    setEq('sel U: H = P(U)', r.H, ['U', 'U#hex', 'B', 'C', 'U#g', 'A', 'D', 'W', 'E', 'D#run', 'B|D', 'D|A', 'W|B', 'C|D#run']);
    eq('sel U: subject', r.subject, 'U');
    r = S('U', 'D');
    eq('narrowed: state', r.state, 'narrowed');
    setEq('sel U hover D: H = F (D#run ∈ B via e5 pulls e5 and C in)', r.H, ['D', 'D#run', 'B', 'A', 'C', 'B|D', 'D|A', 'C|D#run']);
    eq('sel U hover D: subject = hover', r.subject, 'D');
    r = S('U', 'W');
    setEq('sel U hover W: H', r.H, ['W', 'E', 'B', 'W|B']);
    r = S('U', 'V');
    setEq('sel U hover V: narrows to lit items inside', r.H, ['D', 'D#run', 'B', 'A', 'C', 'B|D', 'D|A', 'C|D#run']);
    r = S('U', 'Z');
    eq('blind: state', r.state, 'blind');
    setEq('sel U hover Z: H = P(U), no feedback', r.H, S('U', null).H);
    eq('blind: subject = selection', r.subject, 'U');
    // sticky select: a group is the union of its members; the anchor is G[0]
    r = S(['F', 'W'], null);
    setEq('sel [F, W]: H = P(F) ∪ P(W)', r.H, [...new Set([...S('F', null).H, ...S('W', null).H])]);
    eq('sel [F, W]: state', r.state, 'selected');
    eq('sel [F, W]: subject = anchor', r.subject, 'F');
    eq('q(group) = q(anchor)', HM.rep(view, ['E', 'F']), 'W');
    r = S('U', 'E');
    setEq('hover folded item = hover its fold', r.H, S('U', 'W').H);

    // stack
    let st = HM.stack(view, null, null);
    eq('idle: arrows first (S1)', arrowsOf(st).length, 5);
    eq('idle: arrows lowest', st.order.slice(0, 5).every(o => o.id.indexOf('|') >= 0), true);
    const nd = nodesOf(st);
    eq('idle: ancestors below descendants (S3)', nd.indexOf('U') < nd.indexOf('U#hex') && nd.indexOf('U#hex') < nd.indexOf('B') && nd.indexOf('D') < nd.indexOf('D#run'), true);
    eq('idle: ties keep layout order (S4)', nd.indexOf('U') < nd.indexOf('V') && nd.indexOf('V') < nd.indexOf('W'), true);
    r = S('U', 'D'); st = HM.stack(view, r.H, r.subject);
    eq('narrowed: dim arrows lowest', st.order.slice(0, 2).map(o => o.id).sort(), ['W|B', 'W|D']);
    eq('narrowed: lit arrows highest, shorter above longer (S5b)', st.order.slice(-3).map(o => o.id), ['C|D#run', 'B|D', 'D|A']);
    const dimN = nodesOf(st).filter(id => !r.H.has(id)), litN = nodesOf(st).filter(id => r.H.has(id));
    eq('narrowed: every lit node above every dim node (S2)', Math.max(...dimN.map(id => zOf(st, id))) < Math.min(...litN.map(id => zOf(st, id))), true);
    eq('narrowed: lit box above its dim unit', zOf(st, 'B') > zOf(st, 'U'), true);
    r = S('D', null); st = HM.stack(view, r.H, r.subject);
    const keyOf = id => st.order.find(o => o.id === id).key;
    eq('S5a: arrow ending on a member of the subject is near', keyOf('C|D#run')[3], 1);
    eq('S5a: arrow ending on the subject is near', keyOf('B|D')[3], 1);
    r = S('V', null); st = HM.stack(view, r.H, r.subject);
    eq('S5a: a container subject touches no arrow', arrowsOf(st).slice(-3).map(id => keyOf(id)[3]), [0, 0, 0]);
    eq('S5b: container subject → by length, equal length keeps layout order', arrowsOf(st).slice(-4), ['C|D#run', 'B|D', 'D|A', 'W|D']);

    // P(f): a function subject with a stack (view.stack) — its calls' ends, the arrows it uses
    {
      const sv = { ...view, stack: x => x === 'D#run' ? { nodes: ['A', 'B'], edges: ['D|A'] } : null };
      const P = HM.participants(sv, 'D#run');
      setEq('P(f).scope = q(f)', P.scope, ['D#run']);
      setEq('P(f).nodes = scope ∪ ends of its calls', P.nodes, ['D#run', 'A', 'B']);
      setEq('P(f).edges = the arrows its stack uses, not the ones touching it', P.edges, ['D|A']);
      {
        const cv = { ...view, stack: x => x === 'D' ? { nodes: ['A'], edges: [] } : null };
        const Pc = HM.participants(cv, 'D');
        setEq('call mode: scope as usual (q(x) and its descendants)', Pc.scope, HM.participants(view, 'D').scope);
        setEq('call mode: nodes = scope ∪ far ends of its calls, no import ends', Pc.nodes, [...HM.participants(view, 'D').scope, 'A']);
        setEq('call mode: no import arrows', Pc.edges, []);
      }
      setEq('no stack: P as before', HM.participants(sv, 'D').edges, HM.participants(view, 'D').edges);
      const Hs = HM.salience(sv, 'D#run', null).H;
      eq('selected f: H = P(f)', [...Hs].sort(), ['A', 'B', 'D#run', 'D|A'].sort());
    }

    // Selection model (docs/selection-model.md): tiers rest / low / high / highest
    {
      const cview = { ...view, container: id => ['unit', 'hex', 'group'].includes(T[id].t), parent: id => T[id] ? T[id].p : null };
      const TT = (sel, hov) => HM.tiers(cview, sel, hov);
      const tiersOf = (t, ids) => ids.map(id => t.tierOf(id));
      const allIds = [...view.nodes, ...view.edges.map(e => e.id)];
      let t = TT([], null);
      eq('U1 idle: state', t.state, 'idle');
      eq('U1 idle: every node and arrow at rest', allIds.every(id => t.tierOf(id) === 'rest'), true);
      t = TT([], 'D');
      eq('U2 hover: state', t.state, 'hover');
      eq('U2 hover D: D B W high, W|B low, Z F low', tiersOf(t, ['D', 'B', 'W', 'W|B', 'Z', 'F']), ['high', 'high', 'high', 'low', 'low', 'low']);
      eq('containers holding high nodes stay at rest', tiersOf(t, ['U', 'U#hex', 'U#g', 'V']), ['rest', 'rest', 'rest', 'rest']);
      t = TT([], 'C');
      eq('a box with a high member row is high', t.tierOf('D'), 'high');
      t = TT(['A'], null);
      eq('container holding nothing high is low', tiersOf(t, ['U#hex', 'U#g', 'U']), ['low', 'rest', 'rest']);
      t = TT(['U'], null);
      eq('selected U: U named by P is high', tiersOf(t, ['U', 'U#hex', 'V', 'D', 'Z']), ['high', 'high', 'rest', 'high', 'low']);
      eq('selected U: arrows outside P low, inside highest (touch U)', tiersOf(t, ['W|D', 'B|D', 'W|B']), ['low', 'highest', 'highest']);
      t = TT(['U'], 'D');
      eq('U3 narrowed: state', t.state, 'narrowed');
      eq('U3 narrowed: rest of \u03a0 goes low', tiersOf(t, ['W', 'W|B', 'B|D', 'C']), ['low', 'low', 'highest', 'high']);
      eq('U3 narrowed: containers at rest', tiersOf(t, ['U', 'V']), ['rest', 'rest']);
      t = TT(['U'], 'Z');
      const t0 = TT(['U'], null);
      eq('blind: state', t.state, 'blind');
      eq('blind: tiers = selected', allIds.every(id => t.tierOf(id) === t0.tierOf(id)), true);
      t = TT(['D'], 'B');
      eq('highest: only high arrows touching the subject (B)', tiersOf(t, ['B|D', 'D|A']), ['highest', 'low']);
      t = TT(['U'], 'D');
      eq('hoverable: tier read from the selection alone', ['W', 'Z', 'V', 'W|D', 'B|D'].map(id => t.hoverable(id)), [true, false, true, false, true]);
      eq('hoverable at idle: everything', TT([], null).hoverable('Z'), true);
      t = TT(['U'], 'D');
      const so = HM.stackOf(cview, t), ord = so.order.map(o => o.id);
      eq('U5: low arrows lowest', ord[0], 'W|D');
      eq('held: narrowed, W|B (in \u03a0) low look, held; W|D (outside \u03a0) not', [t.tierOf('W|B'), t.held('W|B'), t.held('W|D'), t.held('W')], ['low', true, false, false]);
      eq('held: over every node, under every high arrow', view.nodes.every(id => so.z.get(id) < so.z.get('W|B')) && ['B|D', 'D|A', 'C|D#run'].every(id => so.z.get(id) > so.z.get('W|B')), true);
      eq('held: none when not narrowed', [TT(['U'], null).held('W|B'), TT(['U'], 'Z').held('W|B')], [false, false]);
      eq('U5: highest arrows last', ord.slice(-3).every(id => t.tierOf(id) === 'highest'), true);
      const nz = lk => view.nodes.filter(id => t.tierOf(id) === lk).map(id => so.z.get(id));
      { const hi = view.nodes.filter(id => t.tierOf(id) === 'high'), lo = view.nodes.filter(id => t.tierOf(id) !== 'high');
        eq('U5: same depth, high above low and rest', hi.every(a => lo.every(b => cview.depth(a) !== cview.depth(b) || so.z.get(a) > so.z.get(b))), true);
        eq('U5: a node never under an ancestor', view.nodes.every(a => view.nodes.every(b => a === b || !view.inside(a, b) || so.z.get(a) < so.z.get(b))), true); }
      { const t2 = TT(['A'], null), s2 = HM.stackOf(cview, t2);
        eq('U5: a rest container stays under its low children', t2.tierOf('U#hex') === 'low' && t2.tierOf('U') === 'rest' && s2.z.get('U') < s2.z.get('U#hex') && s2.z.get('U') < s2.z.get('B'), true); }
      eq('lit = high nodes + high/highest arrows (occlusion input)', [...t.lit].sort(), [...S('U', 'D').H].sort());
    }
    // Calls world: frames s1..s5, arrows carry their calls. s1 B\u2192D#run { s2 D#run\u2192A },
    // s3 B\u2192D#run { s4 D#run\u2192A } (repeat, expanded in full), s5 B\u2192C.
    {
      const FR = { s1: { arc: 'B|D#run\u00b7c', kids: ['s2'] }, s2: { arc: 'D#run|A\u00b7c', kids: [] }, s3: { arc: 'B|D#run\u00b7c', kids: ['s4'] }, s4: { arc: 'D#run|A\u00b7c', kids: [] }, s5: { arc: 'B|C\u00b7c', kids: [] } };
      const c1 = 'B|D#run\u00b7c', c2 = 'D#run|A\u00b7c', c3 = 'B|C\u00b7c';
      const cE = [{ id: c1, a: 'B', b: 'D#run', calls: ['s1', 's3'], pts: [[60, 50], [310, 65]] }, { id: c2, a: 'D#run', b: 'A', calls: ['s2', 's4'], pts: [[310, 65], [180, 50]] }, { id: c3, a: 'B', b: 'C', calls: ['s5'], pts: [[60, 50], [60, 90]] }];
      const cv = { ...view, nodes: ['U', 'U#hex', 'B', 'C', 'U#g', 'A', 'V', 'D', 'D#run'], edges: cE, edge: id => cE.find(e => e.id === id), bundle: () => null, frame: f => FR[f] || null,
        container: id => ['unit', 'hex', 'group'].includes(T[id].t), parent: id => T[id] ? T[id].p : null };
      const TT = (sel, hov) => HM.tiers(cv, sel, hov), tiersOf = (t, ids) => ids.map(id => t.tierOf(id));
      const P1 = HM.participants(cv, 's1');
      setEq('P(step) = its sub-stack: calls', P1.calls, ['s1', 's2']);
      setEq('P(step): their arrows', P1.edges, [c1, c2]);
      setEq('P(step): their ends', P1.nodes, ['B', 'D#run', 'A']);
      const h1 = HM.hoverSet(cv, 's1');
      setEq('hoverSet(step) = its own call', h1.calls, ['s1']);
      setEq('hoverSet(step): own arrow only', h1.edges, [c1]);
      setEq('P(arrow) carries its calls', HM.participants(cv, c1).calls, ['s1', 's3']);
      let t = TT([], null);
      eq('calls idle: steps at rest', tiersOf(t, ['s1', c1, 'B']), ['rest', 'rest', 'rest']);
      t = TT([], 's1');
      eq('hover step: own call only', tiersOf(t, ['s1', 's2', c1, c2, 'A', 'D']), ['high', 'low', 'highest', 'low', 'low', 'high']);
      t = TT(['s1'], null);
      eq('select step: sub-stack high, own call highest', tiersOf(t, ['s1', 's2', 's3', c1, c2, c3]), ['high', 'high', 'low', 'highest', 'high', 'low']);
      eq('select step: container at rest, box of a high row high', tiersOf(t, ['V', 'D', 'C']), ['rest', 'high', 'low']);
      t = TT(['s1'], 's1');
      eq('hovering a selected step narrows to its own call', tiersOf(t, ['s1', 's2', c2, 'A']), ['high', 'low', 'low', 'low']);
      t = TT(['B'], 's1');
      eq('sel B hover s1: narrowed', t.state, 'narrowed');
      eq('step numbers lit per call: s1 high, s3 low on the same arrow', tiersOf(t, ['s1', 's3', c1, c3]), ['high', 'low', 'highest', 'low']);
      t = TT(['B'], 's2');
      eq('sel B hover s2 (no shared call): blind', t.state, 'blind');
      t = TT(['B'], 'D#run');
      eq('calls world narrows on calls, then their arrows', tiersOf(t, [c1, c2, 's1', 's3', 's2']), ['highest', 'low', 'high', 'high', 'low']);
      eq('hoverable step: by the selection alone', [TT(['s1'], null).hoverable('s2'), TT(['B'], null).hoverable('s2')], [true, false]);
      eq('§ 5 a low step gets no hover highlight: sel B hover s2 = selected', tiersOf(TT(['B'], 's2'), ['s1', 's2', 's3', c1, c2]), tiersOf(TT(['B'], null), ['s1', 's2', 's3', c1, c2]));
    }

    {
      const t0 = HM.tiers(view, ['W'], null), t1 = HM.tiers(view, ['W'], 'B|D');
      eq('§ 5 low arrow hovered (ends in \u03a0): blind', [t0.tierOf('B|D'), t1.state], ['low', 'blind']);
      eq('§ 5 low arrow hovered: tiers as selected', ['W', 'B', 'D', 'W|B', 'B|D'].map(id => t1.tierOf(id)), ['W', 'B', 'D', 'W|B', 'B|D'].map(id => t0.tierOf(id)));
    }
    // occlusion
    r = S('U', 'D');
    let pic = HM.picture(view, r.H);
    setEq('picture: surfaces holding a lit node (O2)', pic, ['U', 'U#hex', 'B', 'C', 'U#g', 'A', 'V', 'D']);
    setEq('cutters(B→D): what it does not end in (O3)', HM.cutters(view, pic, view.edge('B|D')), ['U#g', 'A', 'C']);
    eq('B→D is cut where it crosses U#g', HM.visibleChains(view, pic, view.edge('B|D')), [[[60, 50], [120, 50]], [[190, 50], [310, 50]]]);
    setEq('cutters(D→A)', HM.cutters(view, pic, view.edge('D|A')), ['U#hex', 'B', 'C']);
    eq('D→A crosses none of them: whole', HM.visibleChains(view, pic, view.edge('D|A')), [[[310, 55], [180, 55]]]);
    r = S('W', null); pic = HM.picture(view, r.H);
    setEq('sel W: picture (C not lit → background)', pic, ['W', 'V', 'D', 'U', 'U#hex', 'B']);
    setEq('cutters(W→B)', HM.cutters(view, pic, view.edge('W|B')), ['V', 'D']);
    eq('W→B passes behind V, over U#g (not in picture)', HM.visibleChains(view, pic, view.edge('W|B')), [[[500, 70], [400, 70]], [[300, 70], [60, 70]]]);
    // cut geometry
    const R = { x: 10, y: 10, w: 10, h: 10 };
    eq('cut: miss', HM.cut([[[0, 0], [5, 0]]], R), [[[0, 0], [5, 0]]]);
    eq('cut: fully inside → nothing', HM.cut([[[12, 15], [18, 15]]], R), []);
    eq('cut: through → two pieces', HM.cut([[[0, 15], [30, 15]]], R), [[[0, 15], [10, 15]], [[20, 15], [30, 15]]]);
    eq('cut: vertical through', HM.cut([[[15, 0], [15, 30]]], R), [[[15, 0], [15, 10]], [[15, 20], [15, 30]]]);
    eq('cut: ends inside → one piece', HM.cut([[[0, 15], [15, 15]]], R), [[[0, 15], [10, 15]]]);

    return { total: n, passed: n - fails.length, fails };
  };
})(typeof window !== 'undefined' ? window : globalThis);
