// Frame blending for a fold tween (docs/transition-model.md T1–T5).
// Methods of the map component (Deblob Map Host.dc.html), moved here for the
// host contract (CLAUDE.md, ask 1): every project file ≤ 200 KiB. They run
// with `this` = the component, verbatim from the page; the page mixes
// `methods` into its prototype after `bind(MapConsts)` (engineReady()).
// Tests: root.MapTween.bind(root.MapConsts); Object.assign(fakeMap, root.MapTween.methods).
(function (root) {
  let lerp;
  const methods = {
  // The nearest ancestor drawn in both frames: the box that grows or folds over a
  // node present in only one of them.
  holder(id, A, B) {
    let p = this.T.parent[id] || this.parentOf(id);
    while (p) {
      if (A.nodes[p] && B.nodes[p]) return p;
      p = this.T.parent[p] || this.parentOf(p);
    }
    return null;
  },
  blend(A, B, e) {
    const nodes = {}, once = [];
    for (const id of new Set([...Object.keys(A.nodes), ...Object.keys(B.nodes)])) {
      const a = A.nodes[id], b = B.nodes[id];
      if (a && b) nodes[id] = { ...b, x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), w: lerp(a.w, b.w, e), h: lerp(a.h, b.h, e), op: 1 };
      else { nodes[id] = { ...(b || a), op: Math.min(1, 2 * (b ? e : 1 - e)) }; once.push(id); }
      // Member rows follow the one-frame rule: a folding box keeps its rows,
      // fading over the first half and clipped by the box; an unfolding box
      // fades its rows in over the second half.
      const pa = a && b && A.paint && A.paint[id], pb = pa && B.paint && B.paint[id];
      if (pa && pb && pa.type === 'item' && pb.type === 'item') {
        if (pa.rows.length && !pb.rows.length) { nodes[id].rowsOf = pa; nodes[id].rowsOp = Math.min(1, 2 * (1 - e)); }
        else if (!pa.rows.length && pb.rows.length) nodes[id].rowsOp = Math.max(0, 2 * e - 1);
      }
    }
    // Reveal rule: a node in only one frame keeps its place *in its holder* (no
    // flight, no scale): its offset from the holder's top-left is fixed, so when
    // the holder itself moves (a column re-centres, a gutter resizes) the node
    // rides along. It is clipped to the current rect of its holder, so the box
    // grows to reveal it or folds to hide it. What stays visible is the anchor;
    // the box moves.
    for (const id of once) {
      const hid = this.holder(id, A, B);
      if (!hid) continue;
      const c = nodes[hid], n = nodes[id], f = v => Math.max(0, v).toFixed(1);
      const own = (A.nodes[id] ? A : B).nodes[hid];
      if (own) { n.x += c.x - own.x; n.y += c.y - own.y; }
      n.clip = `inset(${f(c.y - n.y)}px ${f(n.x + n.w - c.x - c.w)}px ${f(n.y + n.h - c.y - c.h)}px ${f(c.x - n.x)}px)`;
    }
    const kin = (m, list) => list.find(o => o.type === m.type && this.nest(o.a, m.a) && this.nest(o.b, m.b));
    const edges = [];
    const ai = new Map(A.edges.map(m => [m.id, m])), bi = new Map(B.edges.map(m => [m.id, m]));
    // A Z (4 points) and a detour (6 points) tween by expanding the Z: its
    // channel's midpoint doubled, so the D line grows out of the channel.
    const six = p => p.length === 6 ? p : [p[0], p[1], [(p[1][0] + p[2][0]) / 2, (p[1][1] + p[2][1]) / 2], [(p[1][0] + p[2][0]) / 2, (p[1][1] + p[2][1]) / 2], p[2], p[3]];
    // Any other pair of lengths (graph router): the shorter polyline grows by
    // doubled midpoints of its longest segment, so it stays orthogonal.
    const grow = (p, n) => { p = p.slice(); while (p.length < n) { if (n - p.length === 1) { p.splice(p.length - 1, 0, p[p.length - 2]); continue; } let bi = 0, bl = -1; for (let i = 0; i + 1 < p.length; i++) { const l = Math.abs(p[i + 1][0] - p[i][0]) + Math.abs(p[i + 1][1] - p[i][1]); if (l > bl) { bl = l; bi = i; } } const md = [(p[bi][0] + p[bi + 1][0]) / 2, (p[bi][1] + p[bi + 1][1]) / 2]; p.splice(bi + 1, 0, md, md); } return p; };
    const zd = n => n === 4 || n === 6;
    const tween = (from, to) => { if (from.length !== to.length) { if (zd(from.length) && zd(to.length)) { from = six(from); to = six(to); } else { const n = Math.max(from.length, to.length); from = grow(from, n); to = grow(to, n); } } return to.map((p, i) => [lerp(from[i][0], p[0], e), lerp(from[i][1], p[1], e)]); };
    // An arrow drawn in one frame only, with no kin to fly to, is content of the
    // box that folds or unfolds over it: it keeps its place, is clipped to that
    // box's live rect and fades like the box's rows (out over the first half,
    // in over the second). Without this it hung outside the folding card.
    const up = x => (this.T && this.T.parent[x]) || this.parentOf(x);
    const eholder = m => { let p = up(m.a); while (p) { if (A.nodes[p] && B.nodes[p] && this.nest(p, m.b)) return p; p = up(p); } return null; };
    const boxed = (m, op) => { const h = eholder(m); return h ? { ...m, op, clipRect: nodes[h] } : null; };
    for (const m of B.edges) {
      const old = ai.get(m.id) || kin(m, A.edges);
      edges.push((!old && boxed(m, Math.max(0, 2 * e - 1))) || { ...m, op: old ? 1 : e, pts: tween(old ? old.pts : m.pts, m.pts) });
    }
    for (const m of A.edges) {
      if (bi.has(m.id)) continue;
      const dest = kin(m, B.edges);
      edges.push((!dest && boxed(m, Math.min(1, 2 * (1 - e)))) || { ...m, op: 1 - e, ghost: !!dest, pts: tween(m.pts, dest ? dest.pts : m.pts) });
    }
    return { nodes, edges };
  },
  nest(a, b) {
    if (a === b) return true;
    // Walk the layout tree (hexagon, bands, groups) as well as data containers.
    const up = x => (this.T && this.T.parent[x]) || this.parentOf(x);
    for (const [x, y] of [[a, b], [b, a]]) { let p = up(x); while (p) { if (p === y) return true; p = up(p); } }
    return false;
  },
  };
  root.MapTween = { methods, bind(C) { ({ lerp } = C); } };
})(typeof window !== 'undefined' ? window : globalThis);
