// Paint geometry: strand paths, heads, cuts, clips and the call arcs.
// Methods of the map component (Deblob Map Host.dc.html), moved here for the
// host contract (CLAUDE.md, ask 1): every project file ≤ 200 KiB. They run
// with `this` = the component, verbatim from the page; the page mixes
// `methods` into its prototype after `bind(MapConsts)` (engineReady()).
// Tests: root.MapPaint.bind(root.MapConsts); Object.assign(fakeMap, root.MapPaint.methods).
(function (root) {
  let _unused;
  const methods = {
  // A24: the path of a polyline restricted to its flow-axis segments, each
  // drawn with its adjoining corner arcs (so a repaint joins the untouched
  // cross-axis legs seamlessly). Cross-axis segments are skipped.
  pathAlong(pts, r, corners, axis) {
    const q = [pts[0]];
    for (let i = 1; i < pts.length; i++) { const p = pts[i], l = q[q.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) >= .5) q.push(p); }
    if (q.length < 2) return '';
    const P = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    // corner at q[i]: tangent points s (in) and t (out); null when straight through
    const corner = i => {
      if (i <= 0 || i >= q.length - 1 || corners === 'square') return null;
      const p = q[i], a = q[i - 1], b = q[i + 1];
      const u1 = [p[0] - a[0], p[1] - a[1]], l1 = Math.hypot(u1[0], u1[1]) || 1;
      const u2 = [b[0] - p[0], b[1] - p[1]], l2 = Math.hypot(u2[0], u2[1]) || 1;
      if (Math.abs(u1[0] * u2[1] - u1[1] * u2[0]) / (l1 * l2) < .05 && u1[0] * u2[0] + u1[1] * u2[1] > 0) return null;
      const d1 = Math.min(r, l1 / 2), d2 = Math.min(r, l2 / 2);
      return { p, s: [p[0] - u1[0] / l1 * d1, p[1] - u1[1] / l1 * d1], t: [p[0] + u2[0] / l2 * d2, p[1] + u2[1] / l2 * d2] };
    };
    const arc = c => corners === 'chamfer' ? ` L ${P(c.t)}` : ` Q ${P(c.p)} ${P(c.t)}`;
    const parts = [];
    for (let i = 0; i < q.length - 1; i++) {
      const a = q[i], b = q[i + 1];
      if (Math.abs(b[axis] - a[axis]) < Math.abs(b[1 - axis] - a[1 - axis])) continue;
      const ca = corner(i), cb = corner(i + 1);
      let d = ca ? `M ${P(ca.s)}${arc(ca)}` : `M ${P(a)}`;
      d += cb ? ` L ${P(cb.s)}${arc(cb)}` : ` L ${P(b)}`;
      parts.push(d);
    }
    return parts.join(' ');
  },
  // A24: the straight parts of a polyline's segments, between the tangent
  // points of its corners (same geometry as pathOf), each with its axis (0 =
  // along x) and the arc length from the polyline's start so a dashed part
  // repainted alone keeps the line's dash phase.
  runsOf(pts, r, corners) {
    const q = [pts[0]];
    for (let i = 1; i < pts.length; i++) { const p = pts[i], l = q[q.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) < .5) { if (i === pts.length - 1 && q.length > 1) q[q.length - 1] = p; } else q.push(p); }
    pts = q;
    if (pts.length < 2) return [];
    const S = [], T = [], A = [];
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i], a = pts[i - 1], b = pts[i + 1];
      const u1 = [p[0] - a[0], p[1] - a[1]], l1 = Math.hypot(u1[0], u1[1]) || 1;
      const u2 = [b[0] - p[0], b[1] - p[1]], l2 = Math.hypot(u2[0], u2[1]) || 1;
      const straight = Math.abs(u1[0] * u2[1] - u1[1] * u2[0]) / (l1 * l2) < .05 && u1[0] * u2[0] + u1[1] * u2[1] > 0;
      if (corners === 'square' || straight) { S[i] = T[i] = p; A[i] = 0; continue; }
      const d1 = Math.min(r, l1 / 2), d2 = Math.min(r, l2 / 2);
      const s = [p[0] - u1[0] / l1 * d1, p[1] - u1[1] / l1 * d1], t = [p[0] + u2[0] / l2 * d2, p[1] + u2[1] / l2 * d2];
      S[i] = s; T[i] = t;
      if (corners === 'chamfer') A[i] = Math.hypot(t[0] - s[0], t[1] - s[1]);
      else { let L = 0, prev = s; for (let k = 1; k <= 24; k++) { const u = k / 24, w0 = (1 - u) * (1 - u), w1 = 2 * u * (1 - u), w2 = u * u; const c = [w0 * s[0] + w1 * p[0] + w2 * t[0], w0 * s[1] + w1 * p[1] + w2 * t[1]]; L += Math.hypot(c[0] - prev[0], c[1] - prev[1]); prev = c; } A[i] = L; }
    }
    const out = [];
    let off = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = i === 0 ? pts[0] : T[i], b = i === pts.length - 2 ? pts[pts.length - 1] : S[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const ax = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]) ? 0 : 1;
      // a straight-through vertex (S = T = p, no arc) does not end a run:
      // a straight member's join point sits on its own line
      const prev = out[out.length - 1];
      if (prev && A[i] === 0 && S[i] === T[i] && prev.ax === ax) { prev.b = b; prev.lo = Math.min(prev.lo, a[ax], b[ax]); prev.hi = Math.max(prev.hi, a[ax], b[ax]); }
      else if (len > .5) out.push({ a, b, ax, fix: (a[1 - ax] + b[1 - ax]) / 2, lo: Math.min(a[ax], b[ax]), hi: Math.max(a[ax], b[ax]), off: +off.toFixed(1) });
      off += len + (A[i + 1] || 0);
    }
    for (const r of out) r.fix = (r.a[1 - r.ax] + r.b[1 - r.ax]) / 2;
    return out;
  },
  // corners: rounded (quadratic), chamfer (45° cut, the PCB idiom), square.
  pathOf(pts, r, corners) {
    // Mid-tween points coincide (a Z's doubled midpoint, a leg through zero)
    // or fall in line; a zero leg would round to nothing and leave a square
    // corner. Coincident points collapse to one, straight-through points are
    // plain vertices.
    const q = [pts[0]];
    for (let i = 1; i < pts.length; i++) { const p = pts[i], l = q[q.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) < .5) { if (i === pts.length - 1 && q.length > 1) q[q.length - 1] = p; } else q.push(p); }
    pts = q;
    let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i], a = pts[i - 1], b = pts[i + 1];
      const u1 = [p[0] - a[0], p[1] - a[1]], l1 = Math.hypot(u1[0], u1[1]) || 1;
      const u2 = [b[0] - p[0], b[1] - p[1]], l2 = Math.hypot(u2[0], u2[1]) || 1;
      const straight = Math.abs(u1[0] * u2[1] - u1[1] * u2[0]) / (l1 * l2) < .05 && u1[0] * u2[0] + u1[1] * u2[1] > 0;
      if (corners === 'square' || straight) { d += ` L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`; continue; }
      const d1 = Math.min(r, l1 / 2);
      const d2 = Math.min(r, l2 / 2);
      const s = [p[0] - u1[0] / l1 * d1, p[1] - u1[1] / l1 * d1];
      const t = [p[0] + u2[0] / l2 * d2, p[1] + u2[1] / l2 * d2];
      d += corners === 'chamfer'
        ? ` L ${s[0].toFixed(1)} ${s[1].toFixed(1)} L ${t[0].toFixed(1)} ${t[1].toFixed(1)}`
        : ` L ${s[0].toFixed(1)} ${s[1].toFixed(1)} Q ${p[0].toFixed(1)} ${p[1].toFixed(1)} ${t[0].toFixed(1)} ${t[1].toFixed(1)}`;
    }
    const last = pts[pts.length - 1];
    return d + ` L ${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
  },
  // A5: the head grows with the stroke (never thinner than the line it ends)
  // and shrinks to fit its leg (never longer than the run it ends: a 9px gap
  // gets a 7px head). Returns the path and its length so the line can stop at
  // the head's base — a line run to the tip blunts the point.
  // The last point is the tip; `q` is the last point that differs from it, so a
  // degenerate (straight-snapped) corner does not turn the head.
  // Natural head length of a strand merging `count` edges (A5, before any fit).
  headLen(count) { return 1.9 * Math.max(5.5, Math.min(4, 1.3 + Math.log2(count || 1)) * 2.2); },
  headOf(pts, sw, straight, free) {
    const p = pts[pts.length - 1];
    let q = pts[pts.length - 2];
    for (let i = pts.length - 2; i >= 0 && Math.abs(pts[i][0] - p[0]) + Math.abs(pts[i][1] - p[1]) < 0.5; i--) q = pts[i];
    const dx = p[0] - q[0], dy = p[1] - q[1], l = Math.hypot(dx, dy) || 1;
    const ux = dx / l, uy = dy / l, nx = -uy, ny = ux;
    const s0 = Math.max(5.5, (sw || 1.3) * 2.2);
    let s = s0, tip = p, glyph = false;
    const L = Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]);   // whole strand, tail to tip
    if (straight && s0 * 1.9 > L - 2) {
      // A6 glyph: a straight strand shorter than its head loses the line; the
      // head, natural size, is centred between the two faces.
      tip = [p[0] - ux * (L - s0 * 1.9) / 2, p[1] - uy * (L - s0 * 1.9) / 2]; glyph = true;
    } else if (free != null && free < s0 * 1.9) {
      // A7 same z as the line: the occlusion cut that shortens the terminal leg
      // shortens the head too. Cutting a triangle from its base leaves a similar
      // triangle, so the visible head is the natural head scaled to the run.
      if (free < 2) return { d: '', len: 0, u: [ux, uy], glyph: false };
      s = free / 1.9;
    }
    const len = s * 1.9, b = [tip[0] - ux * len, tip[1] - uy * len];
    const d = `M ${tip[0].toFixed(1)} ${tip[1].toFixed(1)} L ${(b[0] + nx * s * .58).toFixed(1)} ${(b[1] + ny * s * .58).toFixed(1)} L ${(b[0] - nx * s * .58).toFixed(1)} ${(b[1] - ny * s * .58).toFixed(1)} Z`;
    return { d, len: Math.max(1, Math.hypot(p[0] - b[0], p[1] - b[1])), u: [ux, uy], glyph };
  },
  // Visible run before the tip: length of the last segment of the chain that
  // ends at the tip, after the occlusion cut. `null` when the tip itself is cut.
  visibleRun(chains, tip) {
    for (const c of chains) {
      const e = c[c.length - 1];
      if (Math.abs(e[0] - tip[0]) + Math.abs(e[1] - tip[1]) > 0.5) continue;
      let i = c.length - 2;
      while (i > 0 && Math.abs(c[i][0] - tip[0]) + Math.abs(c[i][1] - tip[1]) < 0.5) i--;
      return Math.hypot(tip[0] - c[i][0], tip[1] - c[i][1]);
    }
    return -1;
  },
  // The parts of a chain inside a rect (Liang–Barsky per segment), joined back
  // into chains. The inverse of the occlusion cut: used to clip a one-frame
  // arrow to the box folding over it (transition model T3).
  keepIn(chain, r) {
    const x0 = r.x, y0 = r.y, x1 = r.x + r.w, y1 = r.y + r.h, out = [];
    let cur = null;
    for (let i = 0; i + 1 < chain.length; i++) {
      const [ax, ay] = chain[i], [bx, by] = chain[i + 1], dx = bx - ax, dy = by - ay;
      let t0 = 0, t1 = 1, ok = true;
      for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dy, ay - y0], [dy, y1 - ay]]) {
        if (p === 0) { if (q < 0) { ok = false; break; } continue; }
        const t = q / p;
        if (p < 0) { if (t > t1) { ok = false; break; } if (t > t0) t0 = t; }
        else { if (t < t0) { ok = false; break; } if (t < t1) t1 = t; }
      }
      if (!ok) { cur = null; continue; }
      const a = [ax + dx * t0, ay + dy * t0], b = [ax + dx * t1, ay + dy * t1];
      if (cur && t0 === 0) cur.push(b); else out.push(cur = [a, b]);
      if (t1 < 1) cur = null;
    }
    return out;
  },
  // Shorten a chain that ends at the tip so the stroke stops under the head.
  // Never past the chain's previous point.
  trimTo(chain, tip, len, u) {
    const e = chain[chain.length - 1];
    if (Math.abs(e[0] - tip[0]) + Math.abs(e[1] - tip[1]) > 0.5) return chain;
    const out = chain.slice(0, -1), prev = out[out.length - 1];
    const seg = Math.hypot(tip[0] - prev[0], tip[1] - prev[1]), back = Math.min(len - 1, seg);
    out.push([tip[0] - u[0] * back, tip[1] - u[1] * back]);
    return out;
  },
  // Calls: a cubic from a's side to b's, bowed to the right of travel (so a→b
  // and b→a part), peak offset ~20% of the span. Rows stacked in one column go
  // out and back on the right. Head as a filled triangle along the end tangent.
  // tb (knob callSides 'top/bottom'): card ends always on the top / bottom
  // edge; member rows keep the side (A18). Cards sharing a row go out and back
  // over the top; a card end sits at the other end's x, clamped inside the card,
  // so arrivals spread instead of meeting at the centre.
  callArc(ra, rb, row, tb) {
    const ca = [ra.x + ra.w / 2, ra.y + ra.h / 2], cb = [rb.x + rb.w / 2, rb.y + rb.h / 2], dx = cb[0] - ca[0], dy = cb[1] - ca[1];
    if (tb && !row) {
      const cl = (v, r) => Math.max(r.x + Math.min(16, r.w / 2), Math.min(r.x + r.w - Math.min(16, r.w / 2), v));
      const ax = cl(cb[0], ra), bx = cl(ca[0], rb);
      if (Math.abs(dy) < (ra.h + rb.h) / 2) {
        const Y = Math.min(ra.y, rb.y), off = 26 + Math.abs(dx) * 0.18, pA = [ax, ra.y], pB = [bx, rb.y];
        return this.arcOut(pA, [pA[0], Y - off], [pB[0], Y - off], pB);
      }
      const pA = [ax, dy >= 0 ? ra.y + ra.h : ra.y], pB = [bx, dy >= 0 ? rb.y : rb.y + rb.h];
      return this.outIn(pA, [0, dy >= 0 ? 1 : -1], pB, [0, dy >= 0 ? -1 : 1]);
    }
    if (row && Math.abs(dx) < (ra.w + rb.w) / 2) {
      const X = Math.max(ra.x + ra.w, rb.x + rb.w), off = 26 + Math.abs(dy) * 0.18, pA = [ra.x + ra.w, ca[1]], pB = [rb.x + rb.w, cb[1]];
      return this.arcOut(pA, [X + off, pA[1]], [X + off, pB[1]], pB);
    }
    const horiz = row || Math.abs(dx) >= Math.abs(dy) * 0.6;
    const pA = horiz ? [dx >= 0 ? ra.x + ra.w : ra.x, ca[1]] : [ca[0], dy >= 0 ? ra.y + ra.h : ra.y];
    const pB = horiz ? [dx >= 0 ? rb.x : rb.x + rb.w, cb[1]] : [cb[0], dy >= 0 ? rb.y : rb.y + rb.h];
    const sx = dx >= 0 ? 1 : -1, sy = dy >= 0 ? 1 : -1;
    return horiz ? this.outIn(pA, [sx, 0], pB, [-sx, 0]) : this.outIn(pA, [0, sy], pB, [0, -sy]);
  },
  // C1 (arrow model): leave along the source face's outward normal oA, land
  // against the target's oB. The bow (right of travel) is perpendicular to
  // each normal, so it never turns an end inward.
  outIn(pA, oA, pB, oB) {
    const vx = pB[0] - pA[0], vy = pB[1] - pA[1], L = Math.hypot(vx, vy) || 1, n = [-vy / L, vx / L];
    const d = Math.max(18, Math.min(90, 0.4 * Math.abs(vx * oA[0] + vy * oA[1]))), h = Math.min(60, Math.max(10, L * 0.12));
    const c = (p, o) => [p[0] + o[0] * d + Math.abs(o[1]) * n[0] * h, p[1] + o[1] * d + Math.abs(o[0]) * n[1] * h];
    return this.arcOut(pA, c(pA, oA), c(pB, oB), pB);
  },
  loopArc(r) {
    const x = r.x + r.w, cy = r.y + Math.min(r.h / 2, 14);
    return this.arcOut([x, cy - 5], [x + 30, cy - 24], [x + 30, cy + 24], [x, cy + 5]);
  },
  arcOut(pA, c1, c2, pB) {
    const P = p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`, HL = 7;
    let ux = pB[0] - c2[0], uy = pB[1] - c2[1], ul = Math.hypot(ux, uy);
    if (ul < .5) { ux = pB[0] - pA[0]; uy = pB[1] - pA[1]; ul = Math.hypot(ux, uy) || 1; }
    ux /= ul; uy /= ul;
    const tr = HL * 0.85, e = [pB[0] - ux * tr, pB[1] - uy * tr], c2t = [c2[0] - ux * tr, c2[1] - uy * tr];
    const base = [pB[0] - ux * HL, pB[1] - uy * HL], w = HL * 0.42;
    const lx = 0.125 * pA[0] + 0.375 * c1[0] + 0.375 * c2[0] + 0.125 * pB[0], ly = 0.125 * pA[1] + 0.375 * c1[1] + 0.375 * c2[1] + 0.125 * pB[1];
    return { d: `M ${P(pA)} C ${P(c1)} ${P(c2t)} ${P(e)}`, head: `M ${P(pB)} L ${P([base[0] - uy * w, base[1] + ux * w])} L ${P([base[0] + uy * w, base[1] - ux * w])} Z`, lx, ly };
  },
  };
  root.MapPaint = { methods, bind(C) {  } };
})(typeof window !== 'undefined' ? window : globalThis);
