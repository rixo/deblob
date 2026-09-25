// Placement sandbox engine (pure). Two phases:
//  1. ideal(model, opts): one 2D target per leaf (module), computed once per
//     graph + options. Stress majorization (SMACOF, localized update) over a
//     target distance D(i,j) = min(link hops · 1, tree distance · cohesion),
//     classical-MDS start (deterministic). Option `flow`: after each
//     iteration, project separation constraints x(to) ≥ x(from) + gap on
//     edges between different units (cycles broken by DFS order).
//  2. layout(model, targets, folded, opts): per fold state. Every visible
//     node aims at the centroid of its leaves' targets; siblings push each
//     other apart (pairwise, axis of least overlap) until none overlap; an
//     open box is the bbox of its children + head + pad; bottom-up, then
//     offsets top-down. Deterministic in the fold state: no history.
(function (root) {
  const HEAD = 30, LHEAD = 24, PAD = 10, GAP = 10;
  // Unit interior is fixed, as in the map with the hexagon off: layer groups
  // stacked in this order, full unit width; items in a group wrap in rows
  // (by width where the map wraps by width, else by count), data order.
  const LAYERS = ['ports', 'service', 'model', 'driver', 'adapters', 'blob', 'assembly'];
  const WRAP = { ports: 3, service: 2, model: 5, adapters: 1, assembly: 2, driver: 1, blob: 1 };
  const WRAPW = { ports: 430, model: 450 };
  const itemW = l => Math.max(84, Math.round(6.9 * l.length + 22)), ITEM_H = 28;
  const cardW = l => Math.max(80, Math.round(7.4 * l.length + 44)), CARD_H = 34;

  function prepare(g) {
    const nodes = new Map(), leaves = [];
    const add = n => { nodes.set(n.id, { kids: [], ...n }); return nodes.get(n.id); };
    for (const c of g.containers) if (c.type !== 'externals') add({ id: c.id, label: c.label, type: c.type, parent: c.parent || null });
    for (const it of g.items) {
      if (!nodes.has(it.c)) continue;
      const gid = it.c + '#g:' + it.group;
      if (!nodes.has(gid)) add({ id: gid, label: it.group, type: 'layer', kind: it.group, parent: it.c });
      const n = add({ id: it.id, label: it.label, type: 'item', kind: it.group, parent: gid, li: leaves.length, syms: it.syms || [] });
      leaves.push(n);
    }
    for (const n of nodes.values()) if (n.parent && nodes.has(n.parent)) nodes.get(n.parent).kids.push(n.id);
    const leafIdx = new Map();
    const collect = id => { const n = nodes.get(id); if (n.type === 'item') return [n.li]; const out = []; for (const k of n.kids) out.push(...collect(k)); leafIdx.set(id, out); return out; };
    const roots = [...nodes.values()].filter(n => !n.parent || !nodes.has(n.parent)).map(n => n.id);
    roots.forEach(collect);
    for (const [id, L] of leafIdx) if (!L.length) { const n = nodes.get(id); nodes.delete(id); if (n.parent && nodes.has(n.parent)) { const p = nodes.get(n.parent); p.kids = p.kids.filter(k => k !== id); } }
    for (const n of nodes.values()) { let d = 0, p = n.parent; while (p && nodes.has(p)) { d++; p = nodes.get(p).parent; } n.depth = d; }
    const ord = new Map(g.items.map((it, i) => [it.id, i]));
    const rank = id => { const n = nodes.get(id); return n.type === 'layer' ? LAYERS.indexOf(n.kind) : n.type === 'item' ? ord.get(id) : 100; };
    for (const n of nodes.values()) n.kids.sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0));
    // unit of a leaf: nearest unit / driver ancestor
    const unitOf = id => { let p = nodes.get(id).parent; while (p && nodes.has(p)) { const t = nodes.get(p).type; if (t === 'unit' || t === 'driver') return p; p = nodes.get(p).parent; } return null; };
    leaves.forEach(l => { l.unit = unitOf(l.id); });
    const ix = new Map(leaves.map(l => [l.id, l.li]));
    const w = new Map(), dir = [];
    for (const e of g.edges) {
      if (e.type === 'external') continue;
      const a = ix.get(e.from), b = ix.get(e.to);
      if (a == null || b == null || a === b) continue;
      const k = a < b ? a + ',' + b : b + ',' + a;
      w.set(k, (w.get(k) || 0) + 1);
      dir.push([a, b]);
    }
    const adj = leaves.map(() => []);
    for (const k of w.keys()) { const [a, b] = k.split(',').map(Number); adj[a].push(b); adj[b].push(a); }
    return { nodes, leaves, leafIdx, roots: roots.filter(r => nodes.has(r)), w, dir, adj };
  }

  function ideal(M, o) {
    const n = M.leaves.length, coh = o.cohesion ?? 0.6, flow = !!o.flow;
    const anc = M.leaves.map(l => { const a = []; let p = l.id; while (p && M.nodes.has(p)) { a.push(p); p = M.nodes.get(p).parent; } return a.reverse(); });
    const D = Array.from({ length: n }, () => new Float64Array(n));
    for (let i = 0; i < n; i++) {
      const hop = new Int32Array(n).fill(-1); hop[i] = 0; const q = [i];
      for (let h = 0; h < q.length; h++) { const u = q[h]; for (const v of M.adj[u]) if (hop[v] < 0) { hop[v] = hop[u] + 1; q.push(v); } }
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        let c = 0; while (c < anc[i].length && c < anc[j].length && anc[i][c] === anc[j][c]) c++;
        const td = (anc[i].length - c) + (anc[j].length - c);
        D[i][j] = Math.min(hop[j] > 0 ? hop[j] : Infinity, td * coh);
      }
    }
    // Pull (Session 47a): links touching a leaf of o.pull (Set) get a shorter
    // target distance and a heavier weight, by o.pullK (0..1). Warm start
    // from o.init (the unpulled targets) keeps the rest in place.
    let Wb = null;
    if (o.pull && o.pull.size && o.pullK > 0) {
      Wb = Array.from({ length: n }, () => new Float64Array(n).fill(1));
      const k = o.pullK;
      for (const i of o.pull) for (const j of M.adj[i]) { const d = D[i][j] * (1 - 0.7 * k); D[i][j] = D[j][i] = d; Wb[i][j] = Wb[j][i] = 1 + 6 * k; }
    }
    // classical MDS start
    const B = Array.from({ length: n }, () => new Float64Array(n)), rm = new Float64Array(n); let tm = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const d2 = D[i][j] * D[i][j]; B[i][j] = d2; rm[i] += d2 / n; tm += d2 / (n * n); }
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) B[i][j] = -0.5 * (B[i][j] - rm[i] - rm[j] + tm);
    const power = (orth) => {
      let v = new Float64Array(n).map((_, i) => orth ? ((i % 2) ? 1 : -1) * (1 + i / n) : (i + 1) / n - 0.5), lam = 0;
      for (let it = 0; it < 200; it++) {
        const u = new Float64Array(n);
        for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n; j++) s += B[i][j] * v[j]; u[i] = s; }
        if (orth) { let d = 0; for (let i = 0; i < n; i++) d += u[i] * orth[i]; for (let i = 0; i < n; i++) u[i] -= d * orth[i]; }
        let nn = Math.hypot(...u) || 1; lam = nn; for (let i = 0; i < n; i++) u[i] /= nn; v = u;
      }
      return { v, lam };
    };
    const X = new Float64Array(n), Y = new Float64Array(n);
    if (o.init) for (let i = 0; i < n; i++) { X[i] = o.init[i].x; Y[i] = o.init[i].y; }
    else { const e1 = power(null), e2 = power(e1.v); for (let i = 0; i < n; i++) { X[i] = e1.v[i] * Math.sqrt(e1.lam); Y[i] = e2.v[i] * Math.sqrt(e2.lam) + (i % 7) * 1e-3; } }
    // flow constraints between units, cycles broken by DFS order
    let cons = [];
    if (flow) {
      const out = M.leaves.map(() => []);
      for (const [a, b] of M.dir) if (M.leaves[a].unit !== M.leaves[b].unit) out[a].push(b);
      const st = new Int8Array(n), keep = [];
      const dfs = u => { st[u] = 1; for (const v of out[u]) { if (st[v] === 1) continue; keep.push([u, v]); if (!st[v]) dfs(v); } st[u] = 2; };
      for (let i = 0; i < n; i++) if (!st[i]) dfs(i);
      const seen = new Set(); cons = keep.filter(([a, b]) => { const k = a + ',' + b; if (seen.has(k)) return false; seen.add(k); return true; });
      if (cons.length && !o.init) { let s = 0; for (const [a, b] of cons) s += X[b] - X[a]; if (s < 0) for (let i = 0; i < n; i++) X[i] = -X[i]; }
    }
    const gap = o.flowGap ?? 0.8;
    for (let it = 0, N = o.iters ?? 300; it < N; it++) {
      for (let i = 0; i < n; i++) {
        let sx = 0, sy = 0, sw = 0;
        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          const d = D[i][j]; if (!isFinite(d)) continue;
          const wij = (Wb ? Wb[i][j] : 1) / (d * d), dx = X[i] - X[j], dy = Y[i] - Y[j], l = Math.hypot(dx, dy) || 1e-6;
          sx += wij * (X[j] + d * dx / l); sy += wij * (Y[j] + d * dy / l); sw += wij;
        }
        if (sw) { X[i] = sx / sw; Y[i] = sy / sw; }
      }
      if (cons.length) for (let p = 0; p < 6; p++) for (const [a, b] of cons) { const v = X[a] + gap - X[b]; if (v > 0) { X[a] -= v / 2; X[b] += v / 2; } }
    }
    if (o.init) return M.leaves.map((_, i) => ({ x: X[i], y: Y[i] }));   // same frame as init
    let mx = 0, my = 0; for (let i = 0; i < n; i++) { mx += X[i] / n; my += Y[i] / n; }
    return M.leaves.map((_, i) => ({ x: X[i] - mx, y: Y[i] - my }));
  }

  function separate(R, iters) {
    for (let it = 0; it < iters; it++) {
      let any = false;
      for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {
        const a = R[i], b = R[j];
        const ox = (a.w + b.w) / 2 + GAP - Math.abs(a.x - b.x), oy = (a.h + b.h) / 2 + GAP - Math.abs(a.y - b.y);
        if (ox <= 0 || oy <= 0) continue;
        any = true;
        if (ox < oy) { const s = (a.x < b.x || (a.x === b.x && i < j)) ? 1 : -1; a.x -= s * ox / 2; b.x += s * ox / 2; }
        else { const s = (a.y < b.y || (a.y === b.y && i < j)) ? 1 : -1; a.y -= s * oy / 2; b.y += s * oy / 2; }
      }
      if (!any) return it;
    }
    return iters;
  }

  // Overlap removal with a fixed order: each pair's axis and side come from
  // their anchors (targets, never from current sizes), so nothing flips
  // sides. One-sided: only the box further right (x pairs) or down (y pairs)
  // moves, so a growing box pushes what is right of / below it and never
  // what is left or above. Monotone per axis, so it settles.
  function sepFixed(R, G = GAP) {
    const P = [];
    for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {
      const dx = R[j].ax - R[i].ax, dy = R[j].ay - R[i].ay, X = Math.abs(dx) >= Math.abs(dy);
      P.push([i, j, X, (X ? dx : dy) >= 0 ? 1 : -1]);
    }
    for (let it = 0; it < 600; it++) {
      let any = false;
      for (const [i, j, X, d] of P) {
        const a = R[i], b = R[j];
        if ((a.w + b.w) / 2 + G - Math.abs(a.x - b.x) <= 0 || (a.h + b.h) / 2 + G - Math.abs(a.y - b.y) <= 0) continue;
        any = true;
        const k = X ? 'x' : 'y', need = (X ? a.w + b.w : a.h + b.h) / 2 + G, v = need - (b[k] - a[k]) * d;
        if (v > 0) { if (d > 0) b[k] += v; else a[k] += v; }   // one-sided: the box further right / down moves
      }
      if (!any) return;
    }
  }
  // Gravity compaction: each rect slides toward the centroid, one axis at a
  // time, as far as the rects in its way allow (keeps order, closes holes).
  function compactR(R, passes, G = GAP) {
    if (R.length < 2) return;
    let cx = 0, cy = 0; R.forEach(r => { cx += r.x / R.length; cy += r.y / R.length; });
    const ord = R.map((r, i) => i).sort((i, j) => Math.hypot(R[i].x - cx, R[i].y - cy) - Math.hypot(R[j].x - cx, R[j].y - cy) || i - j);
    for (let p = 0; p < passes; p++) {
      let moved = 0;
      for (const i of ord) for (const ax of ['x', 'y']) {
        const a = R[i], oa = ax === 'x' ? 'y' : 'x', sz = ax === 'x' ? 'w' : 'h', osz = ax === 'x' ? 'h' : 'w';
        const want = (ax === 'x' ? cx : cy) - a[ax]; if (Math.abs(want) < 0.5) continue;
        const dir = Math.sign(want); let room = Math.abs(want);
        for (let j = 0; j < R.length; j++) {
          if (j === i) continue; const b = R[j];
          if (Math.abs(a[oa] - b[oa]) >= (a[osz] + b[osz]) / 2 + G) continue;
          const d = (b[ax] - a[ax]) * dir; if (d <= 0) continue;
          room = Math.min(room, Math.max(0, d - (a[sz] + b[sz]) / 2 - G));
        }
        if (room > 0.5) { a[ax] += dir * room; moved += room; }
      }
      if (moved < 1) break;
    }
  }
  // o: spread, compact, dirs (draw directories; off = stars), star, moon,
  // shown (Set of leaf indices, focus) , gravity (compaction, focus),
  // gap (clear space between freely placed boxes: units, planets, directory
  // children; unit interiors keep GAP), openCards (Set of item ids showing members), fuse (Map
  // holder id → its single box, drawn in the holder's place), metrics (sizes from the box
  // part: { leaf(n, open), folded(n), head(n) → { head, padX, padB } };
  // missing → the sandbox's own constants).
  // A box grows right and down from its anchor (top-left = target − its
  // reference half side), so unfolding pushes what is right of / below it.
  function layout(M, T, folded, o) {
    const Mx = o.metrics || null, OC = o.openCards || null;
    const leafSz = (n, open) => Mx ? Mx.leaf(n, open) : { w: itemW(n.label), h: ITEM_H };
    const foldSz = n => Mx ? Mx.folded(n) : { w: cardW(n.label), h: CARD_H };
    const headOf = n => Mx ? Mx.head(n) : { head: n.type === 'layer' ? LHEAD : HEAD, padX: PAD, padB: PAD };
    const s = o.spread ?? 110, dirs = !!o.dirs, shown = o.shown || null, star = o.star ?? 0.5, moon = o.moon ?? 0.6, out = new Map();
    const isU = n => n.type === 'unit' || n.type === 'driver';
    const cen = id => { const L = M.leafIdx.get(id) || [M.nodes.get(id).li]; let x = 0, y = 0; for (const i of L) { x += T[i].x; y += T[i].y; } return { x: s * x / L.length, y: s * y / L.length }; };
    const has = id => { if (!shown) return true; const n = M.nodes.get(id); return n.type === 'item' ? shown.has(n.li) : (M.leafIdx.get(id) || []).some(i => shown.has(i)); };
    const refA = id => {
      const n = M.nodes.get(id);
      const ar = z => (z.w + GAP) * (z.h + GAP);
      if (n.type === 'item') return ar(leafSz(n, false));
      let a = 0; for (const i of M.leafIdx.get(id) || []) a += ar(leafSz(M.leaves[i], false));
      return Math.max(ar(foldSz(n)), 0.45 * a);
    };
    const kidsOf = n => n.kids.filter(k => has(k) && !(!dirs && isU(n) && isU(M.nodes.get(k))));
    const group = (ids, tg) => {
      const B = ids.map(lay);
      let cx = 0, cy = 0; ids.forEach(id => { const t = tg(id); cx += t.x / ids.length; cy += t.y / ids.length; });
      let r2 = 0, A = 0; ids.forEach(id => { const t = tg(id); r2 += (t.x - cx) ** 2 + (t.y - cy) ** 2; A += refA(id); });
      const rms = Math.sqrt(r2 / Math.max(1, ids.length)), f = rms < 1 ? 1 : Math.min(1, (o.compact ?? 1) * Math.sqrt(A) / 2 / rms);
      const R = ids.map((id, i) => { const t = tg(id), rh = Math.sqrt(refA(id)) / 2, ax = cx + (t.x - cx) * f, ay = cy + (t.y - cy) * f;
        return { ax, ay, x: ax - rh + B[i].w / 2, y: ay - rh + B[i].h / 2, w: B[i].w, h: B[i].h }; });
      sepFixed(R, o.gap ?? GAP); if (o.gravity) compactR(R, 20, o.gap ?? GAP);
      return { B, R };
    };
    // Fusion: a holder with a single box drawn as that box (o.fuse: holder → kid).
    const lay = id => {
      if (o.fuse && o.fuse.has(id)) return lay(o.fuse.get(id));
      const n = M.nodes.get(id);
      if (n.type === 'item') { const z = leafSz(n, !!(OC && OC.has(id))); return { id, w: z.w, h: z.h, open: false }; }
      const K = kidsOf(n);
      if (folded.has(id) || !K.length) { const z = foldSz(n); return { id, w: z.w, h: z.h, open: false }; }
      if (n.type === 'layer' || isU(n)) return fixed(n, K);
      const { B, R } = group(K, cen);
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      R.forEach(r => { x0 = Math.min(x0, r.x - r.w / 2); x1 = Math.max(x1, r.x + r.w / 2); y0 = Math.min(y0, r.y - r.h / 2); y1 = Math.max(y1, r.y + r.h / 2); });
      const hd = headOf(n), w = Math.max(x1 - x0 + 2 * hd.padX, foldSz(n).w), h = y1 - y0 + hd.padB + hd.head, cx = (x0 + x1) / 2, cy = y0 - hd.head + h / 2;
      B.forEach((k, i) => { k.dx = R[i].x - cx; k.dy = R[i].y - cy; });
      return { id, w, h, open: true, K: B };
    };
    // Fixed interiors: a layer is a wrapped grid; a unit stacks its layers,
    // then its nested boxes, left-aligned, layers stretched to the widest.
    const fixed = (n, ids) => {
      const K = ids.map(lay), hd = headOf(n);
      let y = hd.head, w = 0;
      if (n.type === 'layer') {
        const maxW = WRAPW[n.kind], cols = WRAP[n.kind] || 2;
        let x = hd.padX, rowH = 0, inRow = 0;
        for (const k of K) {
          if (inRow && (maxW ? x + k.w > hd.padX + maxW : inRow >= cols)) { y += rowH + GAP; x = hd.padX; rowH = 0; inRow = 0; }
          k.px = x; k.py = y; x += k.w + GAP; rowH = Math.max(rowH, k.h); inRow++; w = Math.max(w, x - GAP + hd.padX);
        }
        y += rowH + hd.padB;
      } else {
        for (const k of K) { k.px = hd.padX; k.py = y; y += k.h + GAP; w = Math.max(w, k.w + 2 * hd.padX); }
        y += hd.padB - GAP;
        // Every layer group spans its unit, open or folded (Session 46t).
        w = Math.max(w, foldSz(n).w);
        for (const k of K) if (M.nodes.get(k.id).type === 'layer') stretch(k, w - 2 * hd.padX);
      }
      w = Math.max(w, foldSz(n).w);
      K.forEach(k => { k.dx = k.px + k.w / 2 - w / 2; k.dy = k.py + k.h / 2 - y / 2; });
      return { id: n.id, w, h: y, open: true, K };
    };
    const stretch = (b, w) => { const d = w - b.w; if (d <= 0) return; b.w = w; if (b.K) b.K.forEach(k => { k.dx -= d / 2; }); };
    const place = (b, x, y) => {
      out.set(b.id, { x: x - b.w / 2, y: y - b.h / 2, w: b.w, h: b.h, open: b.open });
      if (b.K) b.K.forEach(k => place(k, x + k.dx, y + k.dy));
    };
    let tops, tg = cen;
    if (dirs) tops = M.roots.filter(has);
    else {
      // Stars: directories are not drawn; a unit (planet) is pulled toward its
      // directory's centroid, a nested unit (moon) toward its planet. Loose
      // layers of a directory are planets too. A folded planet holds its moons.
      tops = [];
      const walk = id => {
        const n = M.nodes.get(id); if (!has(id)) return;
        if (n.type === 'dir') { n.kids.forEach(walk); return; }
        tops.push(id);
        if (isU(n) && !folded.has(id)) n.kids.forEach(k => { if (isU(M.nodes.get(k))) walk(k); });
      };
      M.roots.forEach(walk);
      const memo = new Map();
      tg = id => {
        if (memo.has(id)) return memo.get(id);
        let t = cen(id), p = M.nodes.get(id).parent, dir = null, planet = null;
        while (p && M.nodes.has(p)) { const q = M.nodes.get(p); if (!planet && !dir && isU(q)) planet = p; if (!dir && q.type === 'dir') dir = p; p = q.parent; }
        if (planet) { const pt = tg(planet); t = { x: t.x + moon * (pt.x - t.x), y: t.y + moon * (pt.y - t.y) }; }
        else if (dir) { const c = cen(dir); t = { x: t.x + star * (c.x - t.x), y: t.y + star * (c.y - t.y) }; }
        memo.set(id, t); return t;
      };
    }
    const { B, R } = group(tops, tg);
    B.forEach((b, i) => place(b, R[i].x, R[i].y));
    return out;
  }

  // Visible representative of a leaf: its highest folded ancestor, else itself.
  function repOf(M, folded, leaf) {
    let rep = leaf.id, p = leaf.parent;
    while (p && M.nodes.has(p)) { if (folded.has(p)) rep = p; p = M.nodes.get(p).parent; }
    return rep;
  }
  function foldAt(M, d) {   // 0 dirs · 1 units · 2 layers · 3 modules
    const f = new Set();
    for (const n of M.nodes.values()) {
      if (d <= 0 && n.type === 'dir' && n.depth > 0) f.add(n.id);
      if (d <= 1 && (n.type === 'unit' || n.type === 'driver')) f.add(n.id);
      if (d <= 2 && n.type === 'layer') f.add(n.id);
    }
    return f;
  }

  root.PlaceSandbox = { prepare, ideal, layout, repOf, foldAt };
})(typeof window !== 'undefined' ? window : globalThis);
