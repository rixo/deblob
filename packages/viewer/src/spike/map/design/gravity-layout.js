// Gravity layout (pure): docs/gravity-model.md. Replaces place-sandbox.js
// phase 2 in the gravity map. One energy, minimised per containment level
// (siblings in a directory, or the top), over the DRAWN nodes only:
//   stress     Σ w_ij (‖x_i − x_j‖ − d_ij)²,  d_ij = min(graph, tree) + sizes + gap
//   stability  α Σ ‖x_i − b_i‖²,  b = base picture (leaf targets of ideal())
//   orbit      β Σ (‖x_i − c‖ − r_i)²,  c = selection centre (focus only)
// then non-overlap by projection. α and β are relative to each node's stress
// weight, so they are dimensionless. Deterministic: layout = f(state).
// Unit, layer and card interiors stay fixed (rigid nodes).
// Needs PlaceSandbox.prepare (model) and ideal (base targets).
(function (root) {
  const GAP_IN = 10, HEAD = 30, LHEAD = 24, PAD = 10;
  const itemW = l => Math.max(84, Math.round(6.9 * l.length + 22)), ITEM_H = 28;
  const cardW = l => Math.max(80, Math.round(7.4 * l.length + 44)), CARD_H = 34;
  const WRAP = { ports: 3, service: 2, model: 5, adapters: 1, assembly: 2, driver: 1, blob: 1 };
  const WRAPW = { ports: 430, model: 450 };
  const isU = n => n.type === 'unit' || n.type === 'driver';

  // o.energy: 'stress' (default) | 'metric' | 'linlog' — the law; levers
  // are listed where the energies are built (solve, "Energy").
  // o: spread (px per hop), gap, cohesion (tree weight), stability (α),
  // orbit (β), iters, dirs, shown (Set of drawn leaves under focus), sel (Set
  // of selected leaves: the centre), openCards, fuse, metrics.
  // Base picture = stress layout of the drawn leaves. Folds keep every leaf
  // (a folded box still holds its contents), so the base is ideal() as is;
  // focus draws fewer leaves, so their base is re-solved over them alone
  // (same law, smaller graph): a fresh start (classical MDS), so the
  // solution is not trapped on the side the full map had put it, then
  // aligned to the full map by Procrustes (rotation, reflection,
  // translation; no scale) so it stays recognisable.
  function rebase(M, T, shown, coh) {
    const L = [...shown].sort((a, b) => a - b), n = L.length, ix = new Map(L.map((l, k) => [l, k]));
    if (n < 2) return T;
    const anc = M.leaves.map(l => { const a = []; let p = l.id; while (p && M.nodes.has(p)) { a.push(p); p = M.nodes.get(p).parent; } return a.reverse(); });
    const D = Array.from({ length: n }, () => new Float64Array(n));
    for (let a = 0; a < n; a++) {
      const hop = new Int32Array(n).fill(-1); hop[a] = 0; const q = [a];
      for (let h = 0; h < q.length; h++) for (const v of M.adj[L[q[h]]]) { const k = ix.get(v); if (k != null && hop[k] < 0) { hop[k] = hop[q[h]] + 1; q.push(k); } }
      for (let b = 0; b < n; b++) {
        if (a === b) continue;
        const A = anc[L[a]], B = anc[L[b]]; let c = 0; while (c < A.length && c < B.length && A[c] === B[c]) c++;
        D[a][b] = Math.min(hop[b] > 0 ? hop[b] : Infinity, ((A.length - c) + (B.length - c)) * coh);
      }
    }
    let big = 0; for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (a !== b && isFinite(D[a][b])) big = Math.max(big, D[a][b]);
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (a !== b && !isFinite(D[a][b])) D[a][b] = big * 1.2;
    const { X, Y } = mds(D, n);
    for (let it = 0; it < 300; it++) for (let i = 0; i < n; i++) {
      let sx = 0, sy = 0, sw = 0;
      for (let j = 0; j < n; j++) { if (i === j) continue; const d = D[i][j], w = 1 / (d * d), dx = X[i] - X[j], dy = Y[i] - Y[j], l = Math.hypot(dx, dy) || 1e-6; sx += w * (X[j] + d * dx / l); sy += w * (Y[j] + d * dy / l); sw += w; }
      if (sw) { X[i] = sx / sw; Y[i] = sy / sw; }
    }
    // Procrustes onto the full-map positions of the same leaves.
    let mx = 0, my = 0, tx = 0, ty = 0;
    for (let k = 0; k < n; k++) { mx += X[k] / n; my += Y[k] / n; tx += T[L[k]].x / n; ty += T[L[k]].y / n; }
    let a = 0, b = 0, c = 0, d = 0;
    for (let k = 0; k < n; k++) { const px = X[k] - mx, py = Y[k] - my, qx = T[L[k]].x - tx, qy = T[L[k]].y - ty; a += px * qx; b += px * qy; c += py * qx; d += py * qy; }
    const flip = Math.hypot(a - d, b + c) > Math.hypot(a + d, b - c), th = flip ? Math.atan2(b + c, a - d) : Math.atan2(b - c, a + d), cs = Math.cos(th), sn = Math.sin(th);
    const T2 = T.slice();
    L.forEach((l, k) => { const px = X[k] - mx, py = (Y[k] - my) * (flip ? -1 : 1); T2[l] = { x: tx + cs * px - sn * py, y: ty + sn * px + cs * py }; });
    return T2;
  }
  // Classical MDS (double centring, two power iterations): deterministic start.
  function mds(D, n) {
    const B = Array.from({ length: n }, () => new Float64Array(n)), rm = new Float64Array(n); let tm = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const d2 = D[i][j] * D[i][j]; B[i][j] = d2; rm[i] += d2 / n; tm += d2 / (n * n); }
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) B[i][j] = -0.5 * (B[i][j] - rm[i] - rm[j] + tm);
    const power = orth => {
      let v = new Float64Array(n).map((_, i) => orth ? ((i % 2) ? 1 : -1) * (1 + i / n) : (i + 1) / n - 0.5), lam = 0;
      for (let it = 0; it < 200; it++) {
        const u = new Float64Array(n);
        for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n; j++) s += B[i][j] * v[j]; u[i] = s; }
        if (orth) { let dd = 0; for (let i = 0; i < n; i++) dd += u[i] * orth[i]; for (let i = 0; i < n; i++) u[i] -= dd * orth[i]; }
        let nn = 0; for (let i = 0; i < n; i++) nn += u[i] * u[i]; nn = Math.sqrt(nn) || 1; lam = nn; for (let i = 0; i < n; i++) u[i] /= nn; v = u;
      }
      return { v, lam };
    };
    const e1 = power(null), e2 = power(e1.v), X = [], Y = [];
    for (let i = 0; i < n; i++) { X.push(e1.v[i] * Math.sqrt(e1.lam)); Y.push(e2.v[i] * Math.sqrt(e2.lam) + (i % 7) * 1e-3); }
    return { X, Y };
  }

  function layout(M, T, folded, o) {
    o = o || {};
    if (o.shown) T = rebase(M, T, o.shown, o.cohesion ?? 0.6);
    const Mx = o.metrics || null, OC = o.openCards || null, shown = o.shown || null, fuse = o.fuse || null, dirs = !!o.dirs;
    const s = o.spread ?? 110, g = o.gap ?? 28, coh = o.cohesion ?? 0.6, ALPHA = o.stability ?? 0.6, BETA = o.orbit ?? 0.5, iters = o.iters ?? 100;
    // Clusters (Session 47q, docs/gravity-model.md "Unification"): with
    // directory boxes off, every directory of o.clusters is attached: a
    // virtual node in the solve, drawn (galaxy star) only if o.showStars.
    // One rule for every level: a node and its nearest holder in the same
    // solve share a membership edge of weight K (star → planet, planet →
    // moon, star → child star). Sibling groups keep λ·g apart (hulls).
    const CL = !dirs && o.clusters ? o.clusters : null, K = o.galaxy ?? 6, LAM = o.groupGap ?? 1, SHOW = !!o.showStars;
    const isCl = id => !!CL && CL.has(id);
    const clSz = n => SHOW ? (Mx && Mx.star ? Mx.star(n) : { w: cardW(n.label), h: 20 }) : { w: 0, h: 0 };
    const leafSz = (n, open) => Mx ? Mx.leaf(n, open) : { w: itemW(n.label), h: ITEM_H };
    const foldSz = n => Mx ? Mx.folded(n) : { w: cardW(n.label), h: CARD_H };
    const headOf = n => Mx ? Mx.head(n) : { head: n.type === 'layer' ? LHEAD : HEAD, padX: PAD, padB: PAD };
    const nL = M.leaves.length, drawn = i => !shown || shown.has(i), out = new Map();

    // Drawn leaves of a node: hidden by focus = absent (no link, no area, no pull).
    const LM = new Map(), BM = new Map();
    const leavesOf = id => { let v = LM.get(id); if (!v) { const n = M.nodes.get(id); v = (n.type === 'item' ? [n.li] : M.leafIdx.get(id) || []).filter(drawn); LM.set(id, v); } return v; };
    const has = id => leavesOf(id).length > 0;
    const base = id => { let v = BM.get(id); if (!v) { const L = leavesOf(id); let x = 0, y = 0; for (const i of L) { x += T[i].x; y += T[i].y; } v = L.length ? { x: s * x / L.length, y: s * y / L.length } : { x: 0, y: 0 }; BM.set(id, v); } return v; };
    // Reference radius: from the area of the node's drawn contents, whatever
    // is folded, so a fold changes no target distance (only the overlap).
    const RM = new Map();
    const refR = id => { let v = RM.get(id); if (v == null) { let a = 0; for (const i of leavesOf(id)) { const z = leafSz(M.leaves[i], false); a += (z.w + GAP_IN) * (z.h + GAP_IN); } const f = foldSz(M.nodes.get(id)); v = Math.sqrt(Math.max(1.6 * a, (f.w + GAP_IN) * (f.h + GAP_IN))) / 2; RM.set(id, v); } return v; };
    const hop = new Array(nL);
    for (let i = 0; i < nL; i++) {
      if (!drawn(i)) continue;
      const H = new Int16Array(nL).fill(-1); H[i] = 0; const q = [i];
      for (let k = 0; k < q.length; k++) { const u = q[k]; for (const v of M.adj[u]) if (H[v] < 0 && drawn(v)) { H[v] = H[u] + 1; q.push(v); } }
      hop[i] = H;
    }
    const wOf = (a, b) => M.w.get(a < b ? a + ',' + b : b + ',' + a) || 0;
    const gd = (a, b) => gdOwn(leavesOf(a), leavesOf(b));
    const gdOwn = (LA, LB) => {
      const SB = new Set(LB); let h = Infinity, m = 0;
      for (const i of LA) { const H = hop[i]; for (const j of LB) if (H[j] >= 0 && H[j] < h) h = H[j]; for (const j of M.adj[i]) if (SB.has(j)) m += wOf(i, j); }
      return { h, m };
    };
    const AN = new Map();
    const anc = id => { let a = AN.get(id); if (!a) { a = []; for (let p = id; p && M.nodes.has(p); p = M.nodes.get(p).parent) a.push(p); a.reverse(); AN.set(id, a); } return a; };
    const td = (a, b) => { const A = anc(a), B = anc(b); let c = 0; while (c < A.length && c < B.length && A[c] === B[c]) c++; return (A.length - c) + (B.length - c); };
    const holds = (a, b) => anc(b).includes(a) || anc(a).includes(b);

    // Orbit: the selection is the centre; r = hops from it × spread.
    const S = o.sel && o.sel.size ? [...o.sel].filter(drawn) : [];
    let hs = null, cS = null;
    if (S.length && BETA > 0) {
      hs = new Int16Array(nL).fill(-1);
      for (const i of S) { const H = hop[i]; for (let j = 0; j < nL; j++) if (H[j] >= 0 && (hs[j] < 0 || H[j] < hs[j])) hs[j] = H[j]; }
      let x = 0, y = 0; for (const i of S) { x += T[i].x; y += T[i].y; } cS = { x: s * x / S.length, y: s * y / S.length };
    }
    const hopSel = id => { if (!hs) return -1; let h = -1; for (const i of leavesOf(id)) if (hs[i] >= 0 && (h < 0 || hs[i] < h)) h = hs[i]; return h; };

    // Non-overlap = least-squares projection of the target onto the
    // separation constraints (Dwyer, Marriott, Stuckey: node overlap removal
    // as a QP), solved with Dykstra's alternating projections, which converge
    // to the nearest non-overlapping picture. A pair gets a constraint once
    // it overlaps; its axis and order come from the target, never from the
    // current picture, so the constraint set is convex and deterministic.
    function project(X0, Y0, Wd, Hd, n, Gp) {
      const X = Float64Array.from(X0), Y = Float64Array.from(Y0), C = [], seen = new Set();
      const add = () => {
        let k = 0;
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
          if (seen.has(i * n + j)) continue;
          const G = Gp[i * n + j];
          if ((Wd[i] + Wd[j]) / 2 + G - Math.abs(X[j] - X[i]) <= 0.01 || (Hd[i] + Hd[j]) / 2 + G - Math.abs(Y[j] - Y[i]) <= 0.01) continue;
          seen.add(i * n + j); k++;
          const ox = (Wd[i] + Wd[j]) / 2 + G - Math.abs(X0[j] - X0[i]), oy = (Hd[i] + Hd[j]) / 2 + G - Math.abs(Y0[j] - Y0[i]);
          const ax = ox / (Wd[i] + Wd[j]) <= oy / (Hd[i] + Hd[j]) ? 0 : 1, d0 = ax ? Y0[j] - Y0[i] : X0[j] - X0[i];
          C.push({ i, j, ax, s: d0 >= 0 ? 1 : -1, need: ax ? (Hd[i] + Hd[j]) / 2 + G : (Wd[i] + Wd[j]) / 2 + G, pi: 0, pj: 0 });
        }
        return k;
      };
      for (let round = 0; round < 30 && add(); round++) {
        X.set(X0); Y.set(Y0); for (const c of C) { c.pi = 0; c.pj = 0; }
        for (let sweep = 0; sweep < 600; sweep++) {
          let moved = 0;
          for (const c of C) {
            const V = c.ax ? Y : X, yi = V[c.i] + c.pi, yj = V[c.j] + c.pj, v = c.need - c.s * (yj - yi);
            const zi = v > 0 ? yi - c.s * v / 2 : yi, zj = v > 0 ? yj + c.s * v / 2 : yj;
            c.pi = yi - zi; c.pj = yj - zj; moved += Math.abs(V[c.i] - zi) + Math.abs(V[c.j] - zj); V[c.i] = zi; V[c.j] = zj;
          }
          if (moved < 0.01) break;
        }
      }
      separate(X, Y, Wd, Hd, n, 800, Gp);   // residue: rounds cap before every pair is found
      return { X, Y };
    }
    function separate(X, Y, Wd, Hd, n, passes, Gp) {
      for (let p = 0; p < passes; p++) {
        let any = false;
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
          const dx = X[j] - X[i], dy = Y[j] - Y[i];
          const G = Gp[i * n + j], ox = (Wd[i] + Wd[j]) / 2 + G - Math.abs(dx), oy = (Hd[i] + Hd[j]) / 2 + G - Math.abs(dy);
          if (ox <= 0 || oy <= 0) continue;
          any = true;
          if (ox / (Wd[i] + Wd[j]) <= oy / (Hd[i] + Hd[j])) { const sg = dx >= 0 ? 1 : -1; X[i] -= sg * ox / 2; X[j] += sg * ox / 2; }
          else { const sg = dy >= 0 ? 1 : -1; Y[i] -= sg * oy / 2; Y[j] += sg * oy / 2; }
        }
        if (!any) return;
      }
    }
    // One level: centres of `ids` (sizes B) in the frame whose origin is fb.
    function solve(ids, B, fb) {
      const n = ids.length, X = new Float64Array(n), Y = new Float64Array(n), bx = new Float64Array(n), by = new Float64Array(n);
      const Wd = new Float64Array(n), Hd = new Float64Array(n), R = new Float64Array(n), rr = new Float64Array(n);
      // Every node's reference radius is its contents' (a star: its whole
      // system), whatever is drawn; only the projection sees drawn sizes.
      for (let i = 0; i < n; i++) { const b = base(ids[i]); bx[i] = b.x - fb.x; by[i] = b.y - fb.y; Wd[i] = B[i].w; Hd[i] = B[i].h; R[i] = refR(ids[i]); }
      // Own leaves: a node's leaves minus those of other nodes of this solve
      // it holds (no link counted twice). A star holds all of its leaves in
      // its planets, so it has no links: it acts through the tree only.
      const own = ids.map(id => { const inner = ids.filter(o => o !== id && anc(o).includes(id)); if (!inner.length) return null; const X = new Set(); inner.forEach(o => leavesOf(o).forEach(l => X.add(l))); return leavesOf(id).filter(l => !X.has(l)); });
      if (n < 2) { X[0] = bx[0]; Y[0] = by[0]; return { X, Y }; }
      const Gp = new Float64Array(n * n).fill(g);
      // Holder in this solve: the nearest node of ids that holds it.
      const up = ids.map((id, i) => { let best = -1, bl = -1; for (let j = 0; j < n; j++) { if (j === i) continue; const A = anc(id), k = A.indexOf(ids[j]); if (k >= 0 && k > bl) { bl = k; best = j; } } return best; });
      // ── Energy (Session 48, docs/gravity-model.md "Energies"). One law per
      // value of o.energy; same inputs, same anchor / focus tail, same
      // projection after. Nothing below tests a node's type: a directory is
      // a node of the solve (its virtual / star node) tied to its members by
      // tree springs; a unit is a rigid node; sizes enter only as reference
      // radii (fold-independent), never as drawn sizes.
      //   stress  today's law: every pair aims at a target distance (min of
      //           import hops and tree distance × cohesion) + the membership
      //           disk, massless stars, the group push. A directory can never
      //           be stronger than one import here (see the doc's Review).
      //   metric  one graph, one metric: import springs (length s) ∪ tree
      //           springs (member ↔ holder, length cohesion·s/2, so siblings
      //           sit cohesion·s apart via the star); targets = shortest
      //           paths; weight = springs / d². Groups compact; nothing
      //           pushes groups apart except their radii.
      //   linlog  Noack's LinLog (ForceAtlas2 family): springs attract in
      //           proportion to distance, every pair repels as −log distance
      //           × degree × degree. Its minima are the graph's modularity
      //           clusterings: a directory (dense through its tree springs)
      //           contracts by itself, systems that rarely import each other
      //           drift apart, a bridge sits between in proportion to its
      //           links. Heavy nodes (hubs, big stars) repel as hard as they
      //           pull, so stars repel stars.
      // Levers (what moves what):
      //   spread s     scale: px per import hop / per typical spring
      //   cohesion c   how much shorter a directory tie is than an import
      //                (metric / linlog tree spring = c·s/2; stress: sibling
      //                target c·s per tree step)
      //   galaxy K     springs a directory tie is worth against one import
      //                (metric / linlog); stress: share of the disk pull
      //   groupGap λ   clearance pushed between sibling systems' hulls (every
      //                energy; the gap the eye sees between star systems)
      //   stability α  pull towards the previous picture (0 = none)
      //   orbit β      focus: pull into the hop shells around the selection
      //   gap g        clearance the projection keeps between boxes
      //   linlog only, constants (not knobs yet): repulsion exponent (log =
      //   LinLog, the one that clusters; a stronger power spreads uniformly),
      //   degree weighting q = 1 + Σ springs, scale κ (fits the mean spring
      //   to its length + radii: the only place sizes touch the energy).
      const EN = o.energy === 'linlog' || o.energy === 'metric' ? o.energy : 'stress';
      const D = new Float64Array(n * n), Wt = new Float64Array(n * n), E = [];   // E: springs { i, j, w, len }
      // A node's import weight (springs it holds to other nodes of this
      // solve). The tree tie is K × that (≥ K): one meaning of K in every
      // energy — how much a directory holds a member against its own imports.
      const imp = new Float64Array(n).fill(0);
      // Container and content: centre offset, only the inner radius counts.
      const radTerm = (i, j, inA, inB) => inA ? R[j] : inB ? R[i] : R[i] + R[j] + g;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const a = ids[i], b = ids[j], inA = anc(b).includes(a), inB = anc(a).includes(b);
        const q = inA || inB || (own[i] && !own[i].length) || (own[j] && !own[j].length) ? { h: Infinity, m: 0 } : gdOwn(own[i] || leavesOf(a), own[j] || leavesOf(b));
        const mem = up[i] === j || up[j] === i;
        if (EN === 'stress') {
          let d = coh * s * td(a, b);
          if (q.h < Infinity) d = Math.min(d, s * q.h / (1 + 0.5 * Math.log(1 + q.m)));
          d += radTerm(i, j, inA, inB);
          D[i * n + j] = D[j * n + i] = d; Wt[i * n + j] = Wt[j * n + i] = mem ? 0 : 1 / (d * d);
        } else if (q.m > 0) { E.push({ i, j, w: q.m, len: s }); imp[i] += q.m; imp[j] += q.m; }   // each import is a spring
      }
      // A holder's import weight is its members' (a system's links are its
      // units' links), summed bottom-up before its own tie is made.
      if (EN !== 'stress') { const deep = ids.map((_, i) => i).sort((a, b) => anc(ids[b]).length - anc(ids[a]).length); for (const i of deep) if (up[i] >= 0) imp[up[i]] += imp[i]; }
      if (EN !== 'stress') for (let i = 0; i < n; i++) if (up[i] >= 0) E.push({ i, j: up[i], w: K * Math.max(1, imp[i]), len: coh * s / 2, tree: true });   // the tree tie
      if (EN === 'metric') {
        // Targets = shortest paths over the springs (Dijkstra, dense).
        const adjL = ids.map(() => []); for (const e of E) { adjL[e.i].push([e.j, e.len]); adjL[e.j].push([e.i, e.len]); }
        let big = 0;
        for (let a = 0; a < n; a++) {
          const dist = new Float64Array(n).fill(Infinity), done = new Uint8Array(n); dist[a] = 0;
          for (;;) { let u = -1; for (let k = 0; k < n; k++) if (!done[k] && dist[k] < Infinity && (u < 0 || dist[k] < dist[u])) u = k; if (u < 0) break; done[u] = 1; for (const [v, l] of adjL[u]) if (dist[u] + l < dist[v]) dist[v] = dist[u] + l; }
          for (let b = a + 1; b < n; b++) { D[a * n + b] = dist[b]; if (isFinite(dist[b])) big = Math.max(big, dist[b]); }
        }
        const spr = new Float64Array(n * n); for (const e of E) spr[Math.min(e.i, e.j) * n + Math.max(e.i, e.j)] += e.w;
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
          const p = i * n + j, inA = anc(ids[j]).includes(ids[i]), inB = anc(ids[i]).includes(ids[j]);
          const d = (isFinite(D[p]) ? D[p] : big * 1.2) + radTerm(i, j, inA, inB);   // disconnected: a little beyond the farthest
          D[p] = D[j * n + i] = d; Wt[p] = Wt[j * n + i] = Math.max(1, spr[p]) / (d * d);
        }
      }
      if (EN === 'linlog') for (const e of E) {   // springs only; used by the base-scale fit below and by κ
        const p = e.i * n + e.j, inA = anc(ids[e.j]).includes(ids[e.i]), inB = anc(ids[e.i]).includes(ids[e.j]);
        D[p] = D[e.j * n + e.i] = e.len + radTerm(e.i, e.j, inA, inB); Wt[p] = Wt[e.j * n + e.i] += e.w;
      }
      // Membership (Session 47r): a member stays within its holder's disk,
      // sized to hold all its members (radius √(Σ member areas / π), minus its
      // own radius): pulled in when outside, free inside, where links arrange
      // it. Weight K × its own total link weight, so K is a share of the
      // pull, whatever a member's degree.
      // A node with no leaves of its own (it holds them all through members:
      // a directory's virtual node) has no mass: it sits at its members'
      // centroid, recomputed each epoch, and takes no stress of its own.
      const derived = ids.map((id, i) => EN === 'stress' && !!own[i] && own[i].length === 0);
      for (let i = 0; i < n; i++) if (derived[i]) for (let j = 0; j < n; j++) if (j !== i) Wt[i * n + j] = Wt[j * n + i] = 0;
      const byDepth = ids.map((_, i) => i).filter(i => derived[i]).sort((a, b) => anc(ids[b]).length - anc(ids[a]).length);
      const centre = () => { for (const h of byDepth) { let x = 0, y = 0, c = 0; for (let j = 0; j < n; j++) if (up[j] === h) { x += X[j]; y += Y[j]; c++; } if (c) { X[h] = x / c; Y[h] = y / c; } } };
      const ring = new Float64Array(n), memW = new Float64Array(n), within = new Set();
      if (EN === 'stress') { const area = new Float64Array(n);
        for (let i = 0; i < n; i++) if (up[i] >= 0) area[up[i]] += (2 * R[i]) * (2 * R[i]);
        for (let i = 0; i < n; i++) if (up[i] >= 0) {
          const h = up[i]; let s0 = 0; for (let j = 0; j < n; j++) if (j !== i && j !== h) s0 += Wt[i * n + j];
          ring[i] = Math.max(R[i] + R[h] + g, Math.sqrt(area[h] / Math.PI) - R[i]); memW[i] = K * s0;
          const p = i < h ? i * n + h : h * n + i; D[p] = ring[i]; Wt[p] = memW[i]; within.add(p);
        } }
      // Base scale = least-squares fit to the stress targets (Gansner et al.).
      { let mx = 0, my = 0; for (let i = 0; i < n; i++) { mx += bx[i] / n; my += by[i] / n; }
        let num = 0, den = 0;
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const l = Math.hypot(bx[i] - bx[j], by[i] - by[j]), w = Wt[i * n + j]; num += w * D[i * n + j] * l; den += w * l * l; }
        const k = den > 0 ? num / den : 1;
        for (let i = 0; i < n; i++) { bx[i] = mx + (bx[i] - mx) * k; by[i] = my + (by[i] - my) * k; X[i] = bx[i]; Y[i] = by[i]; } }
      // Focus = membership (Session 47s): the selection holds what it
      // reaches, in shells by hop: a node stays in the annulus between the
      // disk holding every node of lower hop (inner, + own radius) and the
      // disk holding every node up to its own hop (outer, − own radius),
      // around the selection's centroid (massless, per epoch). Annulus
      // constrained stress (Target Netgrams); membership is the case inner
      // = 0. Weight β × own link weight.
      const rrIn = new Float64Array(n);
      const FOC = hs ? ids.map(id => hopSel(id)) : null;
      if (FOC) { const byH = new Map(); for (let i = 0; i < n; i++) if (FOC[i] >= 0) byH.set(FOC[i], (byH.get(FOC[i]) || 0) + 4 * R[i] * R[i]);
        let cum = 0; const cumAt = new Map(); for (const h of [...byH.keys()].sort((a, b) => a - b)) { cum += byH.get(h); cumAt.set(h, cum); }
        const hsA = [...cumAt.keys()].sort((a, b) => a - b), prev = h => { let c = 0; for (const k of hsA) if (k < h) c = cumAt.get(k); return c; };
        for (let i = 0; i < n; i++) { rr[i] = FOC[i] < 0 ? -1 : Math.max(0, Math.sqrt(cumAt.get(FOC[i]) / Math.PI) - R[i]); rrIn[i] = FOC[i] > 0 ? Math.sqrt(prev(FOC[i]) / Math.PI) + R[i] : 0; } }
      // SGD stress (Zheng, Pawar, Goodman 2018): pairs in a shuffled order
      // (seeded: deterministic), step μ = min(w η, 1), η annealed
      // exponentially from 1 / w_min to ε / w_max. Anchor (α) and orbit (β)
      // are pair terms with a fixed end, weighted by the node's total weight.
      const P = []; let wmin = Infinity, wmax = 0, sw = new Float64Array(n);
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const w = Wt[i * n + j]; if (!(w > 0)) continue; P.push(i * n + j); wmin = Math.min(wmin, w); wmax = Math.max(wmax, w); sw[i] += w; sw[j] += w; }
      centre();
      let seed = 0x9e3779b9 ^ n; for (const id of ids) for (let c = 0; c < id.length; c++) seed = Math.imul(seed ^ id.charCodeAt(c), 16777619);
      const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
      const TMAX = o.sgdIters ?? 40, EPS = 0.05, etaMax = 1 / wmin, etaMin = EPS / wmax, lam = Math.log(etaMax / etaMin) / (TMAX - 1);
      // Epoch tail, every energy: massless centring, anchor (α), focus (β).
      // rate(i) = the epoch's step scale for node i, in (0, 1] once × α / β.
      const tail = rate => {
        centre();
        let fcx = 0, fcy = 0;
        if (FOC) { let c = 0; for (let i = 0; i < n; i++) if (FOC[i] === 0) { fcx += X[i]; fcy += Y[i]; c++; } if (c) { fcx /= c; fcy /= c; } }
        for (let i = 0; i < n; i++) {
          if (ALPHA > 0) { const mu = Math.min(ALPHA * rate(i), 1); X[i] += mu * (bx[i] - X[i]); Y[i] += mu * (by[i] - Y[i]); }
          if (FOC && rr[i] >= 0) { const dx = X[i] - fcx, dy = Y[i] - fcy, l = Math.hypot(dx, dy) || 1e-6, tgt = l > rr[i] ? rr[i] : l < rrIn[i] ? rrIn[i] : l; if (tgt !== l) { const mu = Math.min(BETA * rate(i), 1), m = mu * (l - tgt) / l; X[i] -= m * dx; Y[i] -= m * dy; } }
        }
      };
      if (EN === 'linlog') {
        // Gradient descent on E = Σ_springs w·l − κ Σ_pairs q_i q_j ln l.
        // q = 1 + Σ springs at the node (Noack's edge repulsion / FA2 degree
        // weighting). κ: the mean spring rests (w = κ q q / l) at its length
        // + radii. Step per node = F / q, clipped to `cap`, annealed s → ε·s
        // over a fixed number of epochs: deterministic, scale-free.
        // Degree lever (o.llDegree): 'all' springs (tree ties included: a
        // star weighs its whole system, stars repel stars hard), 'imports'
        // (a star is light: systems separate through their members only),
        // 'none' (plain LinLog, q = 1: hubs may swallow the map).
        const dg = o.llDegree || 'all', q = new Float64Array(n).fill(1);
        if (dg !== 'none') for (const e of E) if (dg === 'all' || !e.tree) { q[e.i] += e.w; q[e.j] += e.w; }
        // Mass by size (o.llMass, exponent, default 1): q_i × (area_i / mean
        // area)^m over the drawn boxes, so a big box claims room in the energy
        // itself instead of getting it from the projection. Repulsion only:
        // springs keep their weight (a big box pulls no harder), and the step
        // divides by the same q, so a heavy box also moves less. Zero-size
        // nodes (stars) keep mass 1.
        { const mE = o.llMass ?? 1; if (mE > 0) { let sa = 0, c = 0; const ar = new Float64Array(n); for (let i = 0; i < n; i++) { ar[i] = Wd[i] * Hd[i]; if (ar[i] > 0) { sa += ar[i]; c++; } }
          if (c) { const mean = sa / c; for (let i = 0; i < n; i++) if (ar[i] > 0) q[i] *= Math.pow(ar[i] / mean, mE); } } }
        // Attraction exponent a (o.llAttract, default 1): force along a
        // spring = w · l^a. a = 0 is Noack's LinLog (constant pull: clusters
        // hardest, but a system pulled by a foreign neighbour turns into a
        // comb — the only rest points of a constant pull in a constant field
        // lie on the axis through the star, so every planet ends up on the
        // pulled side and the star at the edge). a = 1 is ForceAtlas2's
        // model: the pull grows with distance, so planets ring their star
        // and the foreign pull only shifts the ring. κ: the mean spring
        // rests (w l^a = κ q q / l) at its length + radii.
        const A = o.llAttract ?? 1;
        let num = 0, den = 0; for (const e of E) { num += e.w * Math.pow(D[e.i * n + e.j], A + 1); den += q[e.i] * q[e.j]; }
        const kap = den > 0 ? num / den : s, FX = new Float64Array(n), FY = new Float64Array(n);
        const T2 = o.llIters ?? 200, lam2 = Math.log(1 / EPS) / (T2 - 1);
        for (let t = 0; t < T2; t++) {
          const cap = s * Math.exp(-lam2 * t);
          FX.fill(0); FY.fill(0);
          for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
            let dx = X[j] - X[i], dy = Y[j] - Y[i], l = Math.hypot(dx, dy);
            if (l < 1e-6) { dx = rnd() - 0.5; dy = rnd() - 0.5; l = Math.hypot(dx, dy); }
            const f = kap * q[i] * q[j] / (l * l);   // repulsion q q / l along the unit vector
            FX[i] -= f * dx; FY[i] -= f * dy; FX[j] += f * dx; FY[j] += f * dy;
          }
          for (const e of E) { const dx = X[e.j] - X[e.i], dy = Y[e.j] - Y[e.i], l = Math.hypot(dx, dy) || 1e-6, f = e.w * Math.pow(l, A) / l;   // attraction w·l^a along the unit vector
            FX[e.i] += f * dx; FY[e.i] += f * dy; FX[e.j] -= f * dx; FY[e.j] -= f * dy; }
          for (let i = 0; i < n; i++) { const m = Math.hypot(FX[i], FY[i]) / q[i]; if (m > 0) { const st = Math.min(m, 1) * cap / (m * q[i]); X[i] += FX[i] * st; Y[i] += FY[i] * st; } }
          tail(() => cap / s);
        }
        // No intrinsic scale in this energy (κ only sets the balance): fit
        // the picture to the springs' lengths + radii, least squares, as the
        // base scale does. The projection then removes what still overlaps.
        { let mx = 0, my = 0, num = 0, den = 0; for (let i = 0; i < n; i++) { mx += X[i] / n; my += Y[i] / n; }
          for (const e of E) { const l = Math.hypot(X[e.i] - X[e.j], Y[e.i] - Y[e.j]); num += e.w * D[e.i * n + e.j] * l; den += e.w * l * l; }
          const k = den > 0 ? num / den : 1; for (let i = 0; i < n; i++) { X[i] = mx + (X[i] - mx) * k; Y[i] = my + (Y[i] - my) * k; } }
      } else for (let t = 0; t < TMAX; t++) {
        const eta = etaMax * Math.exp(-lam * t);
        for (let k = P.length - 1; k > 0; k--) { const r = Math.floor(rnd() * (k + 1)), tmp = P[k]; P[k] = P[r]; P[r] = tmp; }
        for (const p of P) {
          const i = (p / n) | 0, j = p % n, w = Wt[p], d = D[p];
          let dx = X[i] - X[j], dy = Y[i] - Y[j], l = Math.hypot(dx, dy);
          if (l < 1e-6) { dx = rnd() - 0.5; dy = rnd() - 0.5; l = Math.hypot(dx, dy); }
          if (l <= d && within.has(p)) continue;   // inside the disk: free
          const mu = Math.min(w * eta, 1), m = mu * (l - d) / (2 * l);
          if (derived[i]) { X[j] += 2 * m * dx; Y[j] += 2 * m * dy; }
          else if (derived[j]) { X[i] -= 2 * m * dx; Y[i] -= 2 * m * dy; }
          else { X[i] -= m * dx; Y[i] -= m * dy; X[j] += m * dx; Y[j] += m * dy; }
        }
        tail(i => sw[i] * eta);
      }
      // Cluster separation: a constraint, so it applies under every energy
      // (Session 48: the user wants a visible gap between systems; in
      // linlog K tightens a system, λ·g clears the space between them).
      // Groups = a node with everything it holds in this
      // solve; hulls from reference radii, so folds never move groups. Sibling groups (same holder, or both top) keep λ·g clear
      // between their hulls; a push moves the whole group. Inner levels
      // first, then outer.
      if (LAM > 0) {
        const kids = ids.map(() => []), tops0 = [];
        for (let i = 0; i < n; i++) (up[i] < 0 ? tops0 : kids[up[i]]).push(i);
        const grp = i => { const out = [i]; for (const c of kids[i]) out.push(...grp(c)); return out; };
        const levels = []; const walk = (sibs, dep) => { if (sibs.length > 1) (levels[dep] = levels[dep] || []).push(sibs); for (const c of sibs) walk(kids[c], dep + 1); };
        walk(tops0, 0);
        const pad = LAM * g;
        for (let dep = levels.length - 1; dep >= 0; dep--) for (const sibs of levels[dep] || []) {
          const G = sibs.map(grp);
          for (let pass = 0; pass < 60; pass++) {
            const H = G.map(m => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const i of m) { const hw = R[i], hh = R[i]; x0 = Math.min(x0, X[i] - hw); x1 = Math.max(x1, X[i] + hw); y0 = Math.min(y0, Y[i] - hh); y1 = Math.max(y1, Y[i] + hh); } return { x0, y0, x1, y1 }; });
            let any = false;
            scan: for (let a = 0; a < G.length; a++) for (let b = a + 1; b < G.length; b++) {
              if (G[a].length < 2 && G[b].length < 2) continue;   // two single boxes: the projection's job
              const A = H[a], Bh = H[b];
              const ox = Math.min(A.x1, Bh.x1) - Math.max(A.x0, Bh.x0) + pad, oy = Math.min(A.y1, Bh.y1) - Math.max(A.y0, Bh.y0) + pad;
              if (ox <= 0 || oy <= 0) continue;
              any = true;
              const ax = (A.x0 + A.x1) / 2, bxc = (Bh.x0 + Bh.x1) / 2, ay = (A.y0 + A.y1) / 2, byc = (Bh.y0 + Bh.y1) / 2;
              if (ox <= oy) { const sg = bxc >= ax ? 1 : -1; for (const i of G[a]) X[i] -= sg * ox / 2; for (const i of G[b]) X[i] += sg * ox / 2; }
              else { const sg = byc >= ay ? 1 : -1; for (const i of G[a]) Y[i] -= sg * oy / 2; for (const i of G[b]) Y[i] += sg * oy / 2; }
              break scan;   // hulls changed: recompute next pass
            }
            if (!any) break;
          }
        }
      }
      centre();
      // The target reads no actual size (reference radii only), so a fold
      // changes only the projection's input sizes (and group hulls).
      const out = project(X, Y, Wd, Hd, n, Gp);
      // Projection displacement (readout): mean move of a drawn box by the
      // non-overlap projection = the room the energy did not claim.
      let pd = 0, pc = 0; for (let i = 0; i < n; i++) if (Wd[i] > 0) { pd += Math.hypot(out.X[i] - X[i], out.Y[i] - Y[i]); pc++; }
      // Cluster readout (o.report): per holder with ≥ 2 members, mean
      // distance of its members to it ÷ mean distance to the nearest holder
      // outside its line (neither ancestor nor descendant). < 1 = reads as a
      // cluster; the smaller the clearer.
      if (o.report) {
        const H = ids.map((_, i) => i).filter(i => up.filter(u => u === i).length >= 2), rows = [];
        for (const h of H) { let so = 0, sf = 0, c = 0; const F = H.filter(k => k !== h && !holds(ids[k], ids[h]));
          for (let i = 0; i < n; i++) if (up[i] === h) { c++; so += Math.hypot(out.X[i] - out.X[h], out.Y[i] - out.Y[h]); let f = Infinity; for (const k of F) f = Math.min(f, Math.hypot(out.X[i] - out.X[k], out.Y[i] - out.Y[k])); sf += f; }
          rows.push({ id: ids[h], n: c, own: so / c, foreign: sf / c, ratio: isFinite(sf) && sf > 0 ? so / sf : NaN }); }
        const ok = rows.filter(r => !isNaN(r.ratio));
        o.report({ energy: EN, rows, mean: ok.length ? ok.reduce((a, r) => a + r.ratio, 0) / ok.length : NaN, proj: pc ? pd / pc : 0 });
      }
      return out;
    }

    // Nested units are members of their holder (moons), in every mode.
    const kidsOf = n => n.kids.filter(k => has(k) && !(isU(n) && isU(M.nodes.get(k))));
    const lay = id => {
      if (fuse && fuse.has(id)) return lay(fuse.get(id));
      const n = M.nodes.get(id);
      if (n.type === 'item') { const z = leafSz(n, !!(OC && OC.has(id))); return { id, w: z.w, h: z.h, open: false }; }
      const K = kidsOf(n);
      if (folded.has(id) || !K.length) { const z = foldSz(n); return { id, w: z.w, h: z.h, open: false }; }
      if (n.type === 'layer' || isU(n)) return fixed(n, K);
      { const z = foldSz(n); return { id, w: z.w, h: z.h, open: false }; }
    };
    // Fixed interiors (as place-sandbox.js): a layer is a wrapped grid; a
    // unit stacks its layers, then nested boxes; layers span the unit.
    const fixed = (n, ids) => {
      const K = ids.map(lay), hd = headOf(n);
      let y = hd.head, w = 0;
      if (n.type === 'layer') {
        const maxW = WRAPW[n.kind], cols = WRAP[n.kind] || 2;
        let x = hd.padX, rowH = 0, inRow = 0;
        for (const k of K) {
          if (inRow && (maxW ? x + k.w > hd.padX + maxW : inRow >= cols)) { y += rowH + GAP_IN; x = hd.padX; rowH = 0; inRow = 0; }
          k.px = x; k.py = y; x += k.w + GAP_IN; rowH = Math.max(rowH, k.h); inRow++; w = Math.max(w, x - GAP_IN + hd.padX);
        }
        y += rowH + hd.padB;
      } else {
        for (const k of K) { k.px = hd.padX; k.py = y; y += k.h + GAP_IN; w = Math.max(w, k.w + 2 * hd.padX); }
        y += hd.padB - GAP_IN;
        w = Math.max(w, foldSz(n).w);
        for (const k of K) if (M.nodes.get(k.id).type === 'layer') stretch(k, w - 2 * hd.padX);
      }
      w = Math.max(w, foldSz(n).w);
      K.forEach(k => { k.dx = k.px + k.w / 2 - w / 2; k.dy = k.py + k.h / 2 - y / 2; });
      return { id: n.id, w, h: y, open: true, K };
    };
    const stretch = (b, w) => { const d = w - b.w; if (d <= 0) return; b.w = w; if (b.K) b.K.forEach(k => { k.dx -= d / 2; }); };
    const place = (b, x, y) => { out.set(b.id, { x: x - b.w / 2, y: y - b.h / 2, w: b.w, h: b.h, open: b.open }); if (b.K) b.K.forEach(k => place(k, x + k.dx, y + k.dy)); };

    // One solve for every mode (Session 47s). Directories are clusters:
    // enclosed (dir boxes on: drawn as the hull of their members, head and
    // padding) or attached (off: a virtual node, drawn as a star in galaxy).
    // A folded directory is a box. Nested units are moons of their holder.
    const ENC = dirs;
    const clNode = id => { const n = M.nodes.get(id); return n.type === 'dir' && !(ENC && folded.has(id)) && (ENC ? !(fuse && fuse.has(id)) : isCl(id)); };
    const tops = [];
    const walk = id => {
      const n = M.nodes.get(id); if (!has(id)) return;
      if (n.type === 'dir') { if (ENC && folded.has(id)) { tops.push(id); return; } if (clNode(id)) tops.push(id); n.kids.forEach(walk); return; }
      tops.push(id);
      if (isU(n) && !folded.has(id)) n.kids.forEach(k => { if (isU(M.nodes.get(k))) walk(k); });
    };
    M.roots.forEach(walk);
    const B = tops.map(id => { if (!clNode(id)) return lay(id); const z = ENC ? { w: 0, h: 0 } : clSz(M.nodes.get(id)); return { id, w: z.w, h: z.h, open: false, virt: ENC || !SHOW, cl: true }; }), P = solve(tops, B, { x: 0, y: 0 });
    if (ENC) enclose(tops, B, P);
    B.forEach((b, i) => { if (!b.virt) place(b, P.X[i], P.Y[i]); });
    return out;

    // Enclosure: a directory box is the hull of its members plus its head
    // and padding. Sibling hulls (same holder, or both top) keep g apart;
    // a push moves the whole group. Inner levels first.
    function enclose(ids, B, P) {
      const n = ids.length, X = P.X, Y = P.Y;
      const up = ids.map((id, i) => { let best = -1, bl = -1; const A = anc(id); for (let j = 0; j < n; j++) { if (j === i) continue; const k = A.indexOf(ids[j]); if (k >= 0 && k > bl) { bl = k; best = j; } } return best; });
      const kids = ids.map(() => []), top = [];
      for (let i = 0; i < n; i++) (up[i] < 0 ? top : kids[up[i]]).push(i);
      const grp = i => { const o2 = [i]; for (const c of kids[i]) o2.push(...grp(c)); return o2; };
      const hull = i => {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        if (!B[i].cl) { x0 = X[i] - B[i].w / 2; x1 = X[i] + B[i].w / 2; y0 = Y[i] - B[i].h / 2; y1 = Y[i] + B[i].h / 2; }
        for (const c of kids[i]) { const h = hull(c); x0 = Math.min(x0, h.x0); y0 = Math.min(y0, h.y0); x1 = Math.max(x1, h.x1); y1 = Math.max(y1, h.y1); }
        if (B[i].cl) { const nd = M.nodes.get(ids[i]), hd = headOf(nd), fw = foldSz(nd).w; x0 -= hd.padX; x1 += hd.padX; y0 -= hd.head; y1 += hd.padB; if (x1 - x0 < fw) { const c = (x0 + x1) / 2; x0 = c - fw / 2; x1 = c + fw / 2; } }
        return { x0, y0, x1, y1 };
      };
      const levels = []; const lw = (sibs, dep) => { if (sibs.length > 1) (levels[dep] = levels[dep] || []).push(sibs); for (const c of sibs) lw(kids[c], dep + 1); };
      lw(top, 0);
      for (let dep = levels.length - 1; dep >= 0; dep--) for (const sibs of levels[dep] || []) {
        const G = sibs.map(grp);
        for (let pass = 0; pass < 200; pass++) {
          const H = sibs.map(hull); let any = false;
          scan: for (let a = 0; a < sibs.length; a++) for (let b = a + 1; b < sibs.length; b++) {
            const A = H[a], Bh = H[b], ox = Math.min(A.x1, Bh.x1) - Math.max(A.x0, Bh.x0) + g, oy = Math.min(A.y1, Bh.y1) - Math.max(A.y0, Bh.y0) + g;
            if (ox <= 0 || oy <= 0) continue;
            any = true;
            const sx = (Bh.x0 + Bh.x1) >= (A.x0 + A.x1) ? 1 : -1, sy = (Bh.y0 + Bh.y1) >= (A.y0 + A.y1) ? 1 : -1;
            if (ox <= oy) { for (const i of G[a]) X[i] -= sx * ox / 2; for (const i of G[b]) X[i] += sx * ox / 2; }
            else { for (const i of G[a]) Y[i] -= sy * oy / 2; for (const i of G[b]) Y[i] += sy * oy / 2; }
            break scan;
          }
          if (!any) break;
        }
      }
      for (let i = 0; i < n; i++) if (B[i].cl) { const h = hull(i); out.set(ids[i], { x: h.x0, y: h.y0, w: h.x1 - h.x0, h: h.y1 - h.y0, open: true }); }
    }
  }

  root.GravityLayout = { layout };
})(typeof window !== 'undefined' ? window : globalThis);
