// Graph router (trial, knob `router: graph`). Pure: rects in, polylines out.
// docs/graph-router.md has the rules; this file is their only implementation.
//  G1 channel network: per strand, the grid of midlines of every gap between
//     the cards it may not cross (the cards at each level of its path), inside
//     its common box. Any gap, above or under, is a candidate.
//  G2 per strand, A* over (node, heading): length + bend + face + congestion.
//  G3 negotiation (PathFinder): strands crossing an over-full cell are ripped
//     and rerouted with present + history cost, a few rounds.
//  G4 nudging: segments sharing a corridor are ordered (end-side votes, the
//     crossing-free order when one exists), tracked (one track per overlap),
//     and spread across the corridor. Tracks = max overlap: the corridor's
//     minimum width, reported as its need so gaps can be sized to fit.
(function (root) {
  const E = 0.5;
  const hitsOpen = (r, x0, y0, x1, y1) => {
    if (Math.abs(y0 - y1) < E) { const lo = Math.min(x0, x1), hi = Math.max(x0, x1); return y0 > r.y + E && y0 < r.y + r.h - E && hi > r.x + E && lo < r.x + r.w - E; }
    const lo = Math.min(y0, y1), hi = Math.max(y0, y1); return x0 > r.x + E && x0 < r.x + r.w - E && hi > r.y + E && lo < r.y + r.h - E;
  };
  const inOpen = (r, x, y) => x > r.x + E && x < r.x + r.w - E && y > r.y + E && y < r.y + r.h - E;
  const infl = (r, p) => ({ x: r.x - p, y: r.y - p, w: r.w + 2 * p, h: r.h + 2 * p });
  const uniq = a => [...new Set(a.map(v => Math.round(v * 2) / 2))].sort((p, q) => p - q);
  // d: 0 +x, 1 −x, 2 +y, 3 −y
  const DX = [1, -1, 0, 0], DY = [0, 0, 1, -1];
  const FACE_D = { r: 0, l: 1, b: 2, t: 3 };

  class Heap {
    constructor() { this.k = []; this.v = []; }
    push(k, v) { const K = this.k, V = this.v; let i = K.length; K.push(k); V.push(v); while (i > 0) { const p = (i - 1) >> 1; if (K[p] <= k) break; K[i] = K[p]; V[i] = V[p]; i = p; } K[i] = k; V[i] = v; }
    pop() { const K = this.k, V = this.v, top = V[0], k = K.pop(), v = V.pop(); const n = K.length; if (n) { let i = 0; for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && K[c + 1] < K[c]) c++; if (K[c] >= k) break; K[i] = K[c]; V[i] = V[c]; i = c; } K[i] = k; V[i] = v; } return top; }
    get size() { return this.k.length; }
  }

  // G1: one grid per obstacle signature (strands with the same path share it).
  function buildGrid(obst, bound, extraX, extraY, o) {
    const pad = o.pad;
    const ex = [bound.x, bound.x + bound.w], ey = [bound.y, bound.y + bound.h];
    for (const r of obst) { ex.push(r.x, r.x + r.w); ey.push(r.y, r.y + r.h); }
    const mids = (arr, lo, hi) => { const s = uniq(arr).filter(v => v >= lo - E && v <= hi + E), out = []; for (let i = 0; i + 1 < s.length; i++) if (s[i + 1] - s[i] >= 2 * pad + 1) out.push((s[i] + s[i + 1]) / 2); return out; };
    const xs = uniq([...mids(ex, bound.x, bound.x + bound.w), ...extraX.filter(v => v > bound.x && v < bound.x + bound.w)]);
    const ys = uniq([...mids(ey, bound.y, bound.y + bound.h), ...extraY.filter(v => v > bound.y && v < bound.y + bound.h)]);
    const nx = xs.length, ny = ys.length, blk = obst.map(r => infl(r, pad));
    // blocking by index ranges: each obstacle marks the nodes and edges it covers
    const free = new Uint8Array(nx * ny).fill(1), hOk = new Uint8Array(nx * ny).fill(1), vOk = new Uint8Array(nx * ny).fill(1);
    const lb = (a, v) => { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] <= v) lo = m + 1; else hi = m; } return lo; };   // first index > v
    for (const r of blk) {
      const i0 = lb(xs, r.x + E), i1 = lb(xs, r.x + r.w - E) - 1, j0 = lb(ys, r.y + E), j1 = lb(ys, r.y + r.h - E) - 1;
      // nodes strictly inside
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) free[j * nx + i] = 0;
      // h edges on rows strictly inside, spanning into the open x-range: i from i0−1 to i1
      for (let j = j0; j <= j1; j++) for (let i = Math.max(0, i0 - 1); i <= Math.min(nx - 2, i1); i++) hOk[j * nx + i] = 0;
      for (let i = i0; i <= i1; i++) for (let j = Math.max(0, j0 - 1); j <= Math.min(ny - 2, j1); j++) vOk[j * nx + i] = 0;
    }
    for (let j = 0; j < ny; j++) { hOk[j * nx + nx - 1] = 0; }
    for (let i = 0; i < nx; i++) vOk[(ny - 1) * nx + i] = 0;
    // capacities are computed on first use
    const hCapC = new Float32Array(nx * ny).fill(-1), vCapC = new Float32Array(nx * ny).fill(-1);
    const walls = (vert, c, lo, hi) => {
      let L = vert ? bound.x : bound.y, R = vert ? bound.x + bound.w : bound.y + bound.h, lb = true, rb = true;
      for (const r of obst) {
        const a0 = vert ? r.y : r.x, a1 = vert ? r.y + r.h : r.x + r.w, b0 = vert ? r.x : r.y, b1 = vert ? r.x + r.w : r.y + r.h;
        if (a1 <= lo + E || a0 >= hi - E) continue;
        if (b1 <= c + E) { if (b1 > L) { L = b1; lb = false; } } else if (b0 >= c - E) { if (b0 < R) { R = b0; rb = false; } }
      }
      return [L, R, lb, rb];   // lb / rb: that side is the bound, not a card
    };
    const capOf = (vert, c, lo, hi) => {
      if (o.resizable && o.resizable(vert ? 'v' : 'h', c, (lo + hi) / 2)) return 999;
      const [L, R] = walls(vert, c, lo, hi);
      return Math.max(1, Math.floor((R - L - 2 * pad) / (o.pitch + 2.5)));
    };
    const hCap = k => hCapC[k] >= 0 ? hCapC[k] : (hCapC[k] = capOf(false, ys[(k / nx) | 0], xs[k % nx], xs[k % nx + 1]));
    const vCap = k => vCapC[k] >= 0 ? vCapC[k] : (vCapC[k] = capOf(true, xs[k % nx], ys[(k / nx) | 0], ys[((k / nx) | 0) + 1]));
    const hCells = new Array(nx * ny), vCells = new Array(nx * ny);
    const hCell = k => hCells[k] || (hCells[k] = cellsOf(false, ys[(k / nx) | 0], xs[k % nx], xs[k % nx + 1]));
    const vCell = k => vCells[k] || (vCells[k] = cellsOf(true, xs[k % nx], ys[(k / nx) | 0], ys[((k / nx) | 0) + 1]));
    return { xs, ys, nx, ny, free, hOk, vOk, hCap, vCap, hCell, vCell, blk, walls };
  }

  // congestion cells: 24px along the segment, keyed by its line
  const CELL = 24;
  const cellsOf = (vert, c, a, b) => { const out = [], lo = Math.min(a, b), hi = Math.max(a, b), base = (vert ? 1 : 2) * 1e10 + (Math.round(c) + 20000) * 1e5; for (let t = Math.floor(lo / CELL); t <= Math.floor((hi - E) / CELL); t++) out.push(base + t + 5000); return out; };

  // G2: A* for one strand on its grid.
  function astar(g, s, net, o) {
    const { xs, ys, nx, ny, free, hOk, vOk, hCap, vCap, hCell, vCell, blk } = g, A = s.A, B = s.B;
    const endBlk = [A, B];
    const nodeOk = k => free[k] && !inOpen(A, xs[k % nx], ys[(k / nx) | 0]) && !inOpen(B, xs[k % nx], ys[(k / nx) | 0]);
    const stubOk = (x0, y0, x1, y1) => !blk.some(r => hitsOpen(r, x0, y0, x1, y1)) && !endBlk.some(r => hitsOpen(r, x0, y0, x1, y1));
    const idx = (arr, v) => { let lo = 0, hi = arr.length - 1; while (lo <= hi) { const m = (lo + hi) >> 1; if (Math.abs(arr[m] - v) < E) return m; if (arr[m] < v) lo = m + 1; else hi = m - 1; } return -1; };
    // ports: the face midpoint, out along the face normal to the first node past the clearance
    const port = (R, f, clear) => {
      const d = FACE_D[f], cx = R.x + R.w / 2, cy = R.y + R.h / 2;
      const fx = f === 'r' ? R.x + R.w : f === 'l' ? R.x : cx, fy = f === 'b' ? R.y + R.h : f === 't' ? R.y : cy;
      const horiz = d < 2, line = horiz ? idx(ys, cy) : idx(xs, cx);
      if (line < 0) return null;
      const arr = horiz ? xs : ys, f0 = horiz ? fx : fy, sg = d % 2 === 0 ? 1 : -1;
      // the first node past the clearance; short of that (a tight margin), the
      // farthest free node before the ray is blocked
      let last = null;
      for (let t = sg > 0 ? 0 : arr.length - 1; t >= 0 && t < arr.length; t += sg) {
        if (sg * (arr[t] - f0) < 1) continue;
        const k = horiz ? line * nx + t : t * nx + line;
        if (!nodeOk(k)) break;
        const x = xs[k % nx], y = ys[(k / nx) | 0];
        if (!stubOk(fx, fy, x, y)) break;
        last = { k, d, fx, fy, len: Math.abs(x - fx) + Math.abs(y - fy) };
        if (sg * (arr[t] - f0) >= clear) return last;
      }
      return last && { ...last, len: last.len + 30 };
    };
    const starts = [], goals = [];
    for (const f of s.srcFaces) { const p = port(A, f, s.minS ?? o.minS); if (p) starts.push({ ...p, pen: s.facePen.src[f] }); }
    for (const f of s.tgtFaces) { const p = port(B, f, s.minT ?? o.minT); if (p) goals.push({ ...p, din: p.d ^ 1, pen: s.facePen.tgt[f] }); }
    if (!starts.length || !goals.length) return null;
    const N = nx * ny * 4, gC = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1);
    const goalAt = new Map(); goals.forEach((q, i) => goalAt.set(q.k, (goalAt.get(q.k) || []).concat(i)));
    const gx = goals.map(q => xs[q.k % nx]), gy = goals.map(q => ys[(q.k / nx) | 0]), ng = goals.length;
    const hx = k => { const x = xs[k % nx], y = ys[(k / nx) | 0]; let b = Infinity; for (let q = 0; q < ng; q++) { const d = Math.abs(x - gx[q]) + Math.abs(y - gy[q]); if (d < b) b = d; } return b; };
    const heap = new Heap();
    for (const st of starts) { const sid = st.k * 4 + st.d, c = st.len + st.pen; if (c < gC[sid]) { gC[sid] = c; prev[sid] = -2 - starts.indexOf(st); heap.push(c + hx(st.k), sid); } }
    let best = Infinity, bestSid = -1, bestGoal = -1;
    const quiet = net.use.size === 0 && net.hist.size === 0;
    const cong = (cells, cap) => { if (quiet) return 0; let x = 0; for (let t = 0; t < cells.length; t++) { const cl = cells[t], u = (net.use.get(cl) || 0) + 1 - cap; if (u > 0) x += u * o.over; const h = net.hist.get(cl); if (h) x += h * o.histW; } return x; };
    let pops = 0;
    while (heap.size) {
      if (++pops > 4 * N) { console.warn('GraphRouter: A* budget', s.id); break; }
      const sid = heap.pop(), gc = gC[sid];
      if (gc + 0 >= best) break;
      const k = sid >> 2, d = sid & 3, i = k % nx, j = (k / nx) | 0;
      const gl = goalAt.get(k);
      if (gl) for (const gi of gl) { const q = goals[gi], tot = gc + q.len + q.pen + (d !== q.din ? o.bend : 0); if (tot < best) { best = tot; bestSid = sid; bestGoal = gi; } }
      for (let nd = 0; nd < 4; nd++) {
        if (nd === (d ^ 1)) continue;   // no U-turn in place
        const ni = i + DX[nd], nj = j + DY[nd];
        if (ni < 0 || nj < 0 || ni >= nx || nj >= ny) continue;
        const nk = nj * nx + ni;
        let ok, e, len, vert = nd >= 2;
        if (!vert) { e = nd === 0 ? k : nk; ok = hOk[e] && free[nk]; len = Math.abs(xs[ni] - xs[i]); }
        else { e = nd === 2 ? k : nk; ok = vOk[e] && free[nk]; len = Math.abs(ys[nj] - ys[j]); }
        if (!ok || !nodeOk(nk)) continue;
        if (hitsOpen(A, xs[i], ys[j], xs[ni], ys[nj]) || hitsOpen(B, xs[i], ys[j], xs[ni], ys[nj])) continue;
        const c = gc + len + (nd !== d ? o.bend : 0) + (quiet ? 0 : vert ? cong(vCell(e), vCap(e)) : cong(hCell(e), hCap(e)));
        const nsid = nk * 4 + nd;
        if (c < gC[nsid]) { gC[nsid] = c; prev[nsid] = sid; heap.push(c + hx(nk), nsid); }
      }
    }
    if (bestSid < 0) return null;
    const nodes = [];
    let cur = bestSid;
    while (cur >= 0) { nodes.push(cur >> 2); cur = prev[cur]; }
    const st = starts[-2 - cur], q = goals[bestGoal];
    nodes.reverse();
    const pts = [[st.fx, st.fy], ...nodes.map(k => [xs[k % nx], ys[(k / nx) | 0]]), [q.fx, q.fy]];
    return { pts: simplify(pts), cost: best, sf: Object.keys(FACE_D).find(f => FACE_D[f] === st.d), tf: Object.keys(FACE_D).find(f => FACE_D[f] === (q.d)) };
  }
  function simplify(p) {
    const q = [p[0]];
    for (let i = 1; i < p.length; i++) {
      const a = q[q.length - 1], b = p[i];
      if (Math.abs(a[0] - b[0]) < E && Math.abs(a[1] - b[1]) < E) continue;
      if (q.length >= 2) { const z = q[q.length - 2]; if ((Math.abs(z[0] - a[0]) < E && Math.abs(a[0] - b[0]) < E) || (Math.abs(z[1] - a[1]) < E && Math.abs(a[1] - b[1]) < E)) { q[q.length - 1] = b; continue; } }
      q.push(b);
    }
    return q;
  }
  const segsOf = pts => { const out = []; for (let i = 0; i + 1 < pts.length; i++) { const a = pts[i], b = pts[i + 1], vert = Math.abs(a[0] - b[0]) < E; out.push({ vert, c: vert ? a[0] : a[1], lo: Math.min(vert ? a[1] : a[0], vert ? b[1] : b[0]), hi: Math.max(vert ? a[1] : a[0], vert ? b[1] : b[0]) }); } return out; };
  const netAdd = (net, pts, sgn) => { for (const sg of segsOf(pts)) for (const cl of cellsOf(sg.vert, sg.c, sg.lo, sg.hi)) net.use.set(cl, (net.use.get(cl) || 0) + sgn); };

  function route(strands, o) {
    o = { pad: 4, pitch: 4, bend: 22, over: 40, histW: 10, iters: 4, minS: 8, minT: 18, ...o };
    const t0 = performance.now();
    // a strand may carry fallbacks (`alts`: the same strand routed one box up);
    // their grids are built on first use
    const grids = new Map();
    const gridOf = (alt, s) => {
      let G = grids.get(alt.sig);
      if (!G) grids.set(alt.sig, G = { obst: alt.obst, bound: alt.bound, xs: [], ys: [], list: [] });
      if (!G.list.includes(s)) { G.list.push(s); for (const R of [s.A, s.B]) { G.xs.push(R.x + R.w / 2); G.ys.push(R.y + R.h / 2); } G.g = null; }
      return G;
    };
    for (const s of strands) gridOf(s, s);
    const ready = G => G.g || (G.g = buildGrid(G.obst, G.bound, G.xs, G.ys, o));
    const tryRoute = s => {
      for (const alt of [s, ...(s.alts || [])]) {
        const G = gridOf(alt, s), r = astar(ready(G), s, net, o);
        if (r) { r.sig = alt.sig; return r; }
      }
      return null;
    };
    const net = { use: new Map(), hist: new Map(), cap: new Map() };
    const order = [...strands].sort((p, q) => (Math.abs(p.A.x - p.B.x) + Math.abs(p.A.y - p.B.y)) - (Math.abs(q.A.x - q.B.x) + Math.abs(q.A.y - q.B.y)));
    const res = new Map();
    const capAt = (G, sg) => { // min capacity of the grid edges under a segment, per cell
      const g = G.g, out = [];
      const cells = cellsOf(sg.vert, sg.c, sg.lo, sg.hi);
      const cap = g.walls(sg.vert, sg.c, sg.lo, sg.hi), w = cap[1] - cap[0];
      const k = o.resizable && o.resizable(sg.vert ? 'v' : 'h', sg.c, (sg.lo + sg.hi) / 2) ? 999 : Math.max(1, Math.floor((w - 2 * o.pad) / (o.pitch + 2.5)));
      for (const cl of cells) out.push([cl, k]);
      return out;
    };
    for (let it = 0; it < o.iters; it++) {
      let rerouted = 0;
      for (const s of order) {
        const old = res.get(s.id);
        if (old && it > 0) {
          const over = segsOf(old.pts).some(sg => cellsOf(sg.vert, sg.c, sg.lo, sg.hi).some(cl => (net.use.get(cl) || 0) > (net.cap.get(cl) ?? 999)));
          if (!over) continue;
          netAdd(net, old.pts, -1);
        }
        const r = tryRoute(s);
        if (r) { res.set(s.id, r); netAdd(net, r.pts, 1); rerouted++; const G = grids.get(r.sig); for (const sg of segsOf(r.pts)) for (const [cl, k] of capAt(G, sg)) net.cap.set(cl, Math.min(net.cap.get(cl) ?? 999, k)); }
        else if (old) { res.set(s.id, old); netAdd(net, old.pts, 1); }
      }
      let overflow = 0;
      for (const [cl, u] of net.use) { const k = net.cap.get(cl) ?? 999; if (u > k) { overflow++; net.hist.set(cl, (net.hist.get(cl) || 0) + 1); } }
      if (!overflow || (it > 0 && !rerouted)) break;
    }
    const tRoute = performance.now() - t0;
    const groups = nudge(strands, res, grids, o);
    return { res, groups, ms: { route: tRoute, total: performance.now() - t0 } };
  }

  // G4 nudging, one orientation at a time (vertical segments, then horizontal,
  // each pass on the current geometry). A segment moves only inside its
  // corridor: the walls are the obstacles overlapping its span widened by the
  // pad, so the stretch its neighbours gain (the swept rectangle) is free too.
  // Segments on one grid line are a group: ordered by end-side votes, one
  // track per overlap, the block kept on the line and slid into the corridor.
  function nudge(strands, res, grids, o) {
    for (const s of strands) { const r = res.get(s.id); if (r) r.out = r.pts.map(p => p.slice()); }
    const groups = [];
    for (const vertPass of [true, false]) groups.push(...nudgePass(strands, res, grids, o, vertPass));
    return groups;
  }
  function nudgePass(strands, res, grids, o, vertPass) {
    const segs = [];
    for (const s of strands) {
      const r = res.get(s.id); if (!r) continue;
      const pts = r.out, n = pts.length - 1, G = grids.get(r.sig);
      for (let i = 0; i < n; i++) {
        const a = pts[i], b = pts[i + 1], vert = Math.abs(a[0] - b[0]) < E;
        if (vert !== vertPass || (Math.abs(a[0] - b[0]) < E && Math.abs(a[1] - b[1]) < E)) continue;
        const c = vert ? a[0] : a[1], lo = Math.min(vert ? a[1] : a[0], vert ? b[1] : b[0]), hi = Math.max(vert ? a[1] : a[0], vert ? b[1] : b[0]);
        let [L, R, lb, rb] = G.g.walls(vert, c, lo - o.pad - 1, hi + o.pad + 1);
        L += o.pad + 2; R -= o.pad + 2;
        for (const [E2, cl] of [[s.A, s.minS ?? o.minS], [s.B, s.minT ?? o.minT]]) {
          const a0 = vert ? E2.y : E2.x, a1 = vert ? E2.y + E2.h : E2.x + E2.w, b0 = vert ? E2.x : E2.y, b1 = vert ? E2.x + E2.w : E2.y + E2.h;
          if (a1 < lo - o.pad || a0 > hi + o.pad) continue;
          if (b1 <= c + E) L = Math.max(L, b1 + (i === 0 || i === n - 1 ? 0 : cl)); else if (b0 >= c - E) R = Math.min(R, b0 - (i === 0 || i === n - 1 ? 0 : cl));
        }
        // a port segment slides along its face only
        const face = (R0, f) => { if (f === 'r' || f === 'l') { L = Math.max(L, R0.y + 3); R = Math.min(R, R0.y + R0.h - 3); } else { L = Math.max(L, R0.x + 3); R = Math.min(R, R0.x + R0.w - 3); } };
        if (i === 0) face(s.A, r.sf);
        if (i === n - 1) face(s.B, r.tf);
        // a line routed outside its clearances (a tight gap) keeps its place: the
        // corridor grows to hold it, so its tracks still spread instead of stacking
        if (c < L || c > R) { L = Math.min(L, c); R = Math.max(R, c); }
        const side = (p, q) => vert ? Math.sign(q[0] - p[0]) : Math.sign(q[1] - p[1]);
        const aLo = vert ? a[1] < b[1] : a[0] < b[0];
        const sA = i > 0 ? side(a, pts[i - 1]) : 0, sB = i + 1 < n ? side(b, pts[i + 2]) : 0;
        segs.push({ s, r, i, vert, c, lo, hi, L, R, lb, rb, sLo: aLo ? sA : sB, sHi: aLo ? sB : sA, w: s.sw || 1.5 });
      }
    }
    // Lines closer than a track step whose spans overlap are one group: they
    // share a corridor (the grid can hold several midlines in one gap — the
    // bound edge, a head line, a port line), so their tracks must spread
    // together or they end up packed below pitch.
    const MERGE = o.pitch + 8;
    const lines = [];
    for (const sg of [...segs].sort((p, q) => p.c - q.c)) { const l = lines[lines.length - 1]; if (l && Math.abs(l.c - sg.c) < E) l.segs.push(sg); else lines.push({ c: sg.c, segs: [sg] }); }
    const uf = lines.map((_, i) => i), find = i => uf[i] === i ? i : (uf[i] = find(uf[i]));
    const spanOv = (A, B) => A.segs.some(p => B.segs.some(q => p.hi > q.lo + E && q.hi > p.lo + E));
    for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length && lines[j].c - lines[i].c < MERGE; j++) if (spanOv(lines[i], lines[j])) uf[find(j)] = find(i);
    const byKey = new Map();
    lines.forEach((l, i) => { const k = find(i); (byKey.get(k) || byKey.set(k, []).get(k)).push(...l.segs); });
    const groups = [];
    const ov = (p, q) => p.hi > q.lo + E && q.hi > p.lo + E;
    const cmp = (p, q) => {
      let v = 0;
      if (p.lo > q.lo + E && p.lo < q.hi - E) v += p.sLo; if (p.hi > q.lo + E && p.hi < q.hi - E) v += p.sHi;
      if (q.lo > p.lo + E && q.lo < p.hi - E) v -= q.sLo; if (q.hi > p.lo + E && q.hi < p.hi - E) v -= q.sHi;
      if (v) return v;
      if (Math.abs(p.c - q.c) > E) return p.c - q.c;   // the router's own order
      const t = (p.sLo + p.sHi) - (q.sLo + q.sHi); if (t) return t;
      return p.s.id < q.s.id ? -1 : 1;
    };
    for (const all of byKey.values()) {
      // clusters of mutually overlapping spans are independent
      all.sort((p, q) => p.lo - q.lo);
      const clusters = []; let cur = null, reach = -Infinity;
      for (const sg of all) { if (!cur || sg.lo >= reach - E) { cur = []; clusters.push(cur); reach = -Infinity; } cur.push(sg); reach = Math.max(reach, sg.hi); }
      for (const list of clusters) {
        const n = list.length;
        if (n === 1) { groups.push({ orient: list[0].vert ? 'v' : 'h', L: list[0].L, R: list[0].R, lo: list[0].lo, hi: list[0].hi, n: 1, need: list[0].w + 2 * (o.pad + 2) }); continue; }
        const succ = list.map(() => []), indeg = new Array(n).fill(0);
        for (let x = 0; x < n; x++) for (let y = x + 1; y < n; y++) if (ov(list[x], list[y])) { if (cmp(list[x], list[y]) < 0) { succ[x].push(y); indeg[y]++; } else { succ[y].push(x); indeg[x]++; } }
        const done = new Array(n).fill(false), topo = [];
        while (topo.length < n) {
          let pick = -1;
          for (let x = 0; x < n; x++) if (!done[x] && (pick < 0 || indeg[x] < indeg[pick])) pick = x;
          done[pick] = true; topo.push(pick);
          for (const y of succ[pick]) indeg[y]--;
        }
        const track = new Array(n).fill(0);
        topo.forEach((x, t) => { let k = 0; for (const y of topo.slice(0, t)) if (ov(list[x], list[y])) k = Math.max(k, track[y] + 1); track[x] = k; });
        const nt = Math.max(...track) + 1, tw = new Array(nt).fill(0);
        list.forEach((sg, x) => { tw[track[x]] = Math.max(tw[track[x]], sg.w); });
        let L = Math.max(...list.map(sg => sg.L)), R = Math.min(...list.map(sg => sg.R)); const cs = list.map(sg => sg.c), c = (Math.min(...cs) + Math.max(...cs)) / 2;
        if (R < L) { L = Math.min(L, c); R = Math.max(R, c); if (R < L) L = R = c; }
        const sw = tw.reduce((a, b) => a + b, 0), room = Math.max(0, R - L);
        const gap = nt > 1 ? Math.max(1, Math.min(o.pitch, (room - sw) / (nt - 1))) : 0, tot = sw + gap * (nt - 1);
        // the block stays centred on its line, slid into the corridor when it
        // overhangs; a block wider than its corridor overflows towards a bound
        // (open highway), never into a card when it can help it
        let x0 = c - tot / 2; if (x0 + tot > R) x0 = R - tot; if (x0 < L) x0 = L;
        if (tot > room) { const lb = list.every(sg => sg.lb), rb = list.every(sg => sg.rb); if (rb && !lb) x0 = L; else if (lb && !rb) x0 = R - tot; }
        const at = []; for (let k = 0; k < nt; k++) { at[k] = x0 + tw[k] / 2; x0 += tw[k] + gap; }
        // no per-segment clamp: a corridor too tight for its tracks overflows evenly
        // instead of stacking them on one line
        list.forEach((sg, x) => { sg.c2 = at[track[x]]; });
        groups.push({ orient: list[0].vert ? 'v' : 'h', L, R, lo: Math.min(...list.map(s => s.lo)), hi: Math.max(...list.map(s => s.hi)), n: nt, need: sw + o.pitch * (nt - 1) + 2 * (o.pad + 2) });
      }
    }
    for (const sg of segs) if (sg.c2 != null) { const ax = sg.vert ? 0 : 1, p = sg.r.out; p[sg.i][ax] = sg.c2; p[sg.i + 1][ax] = sg.c2; }
    return groups;
  }

  root.GraphRouter = { route, buildGrid, simplify };
})(typeof window !== 'undefined' ? window : globalThis);
