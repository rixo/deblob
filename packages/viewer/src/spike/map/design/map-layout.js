// Layout: measuring and placement of the map tree (size, fill, rank) and the
// scene helpers that read it (flatten, lift, commonBox).
// Methods of the map component (Deblob Map Host.dc.html), moved here for the
// host contract (CLAUDE.md, ask 1): every project file ≤ 200 KiB. They run
// with `this` = the component, verbatim from the page; the page mixes
// `methods` into its prototype after `bind(MapConsts)` (engineReady()).
// Tests: root.MapLayout.bind(root.MapConsts); Object.assign(fakeMap, root.MapLayout.methods).
(function (root) {
  let LEVELS, HEX_BANDS, OUT_GROUPS, WRAP, WRAPW, GUT, BWR, UNIT_PAD, DIR_PAD, UNIT_HEAD, DIR_HEAD, FUSED_FOLDED_H, CHEV_W, RULE_EXTRA, FILL_MAX, HEX_PAD, GRP_PAD, HEX_HEAD, GRP_HEAD, GRP_FOLDED_H, BAND_HEAD, BAND_HEAD_FIRST, BAND_SEP, BOX, boxH, boxW;
  const methods = {
  sizeItem(n) {
    const g = n.group;
    if (g === 'blob') return { w: Math.max(58, n.label.length * 6.9 + 6), h: BOX.rowH };
    const label = n.label.length * 7.4;
    if ((g === 'ports' || g === 'model' || g === 'externals') && !(this.paint[n.id] && this.paint[n.id].hasMembers)) return { w: Math.max(76, boxW(n.label.length * 7.15)), h: boxH(0) };
    const rw = n.rows.reduce((m, r) => Math.max(m, BOX.dot + 8 + r.length * 6.9), 0);
    // Room for the fold chevron; the driver pin block is 43 px (gap 6 + spacer 16 + gap 6 + pin 15) plus title padding.
    const pn = this.paint[n.id], chev = pn && pn.hook ? CHEV_W + 16 : pn && pn.hasMembers ? CHEV_W + 4 : 0;
    return { w: Math.max(108, boxW(Math.max(label + chev, rw))), h: boxH(n.rows.length) };
  },
  wrap(a, n, kind) {
    const maxW = WRAPW[kind];
    if (!maxW) { const out = []; for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n)); return out; }
    const out = [[]];
    let w = 0;
    for (const k of a) {
      const next = w + (w ? 9 : 0) + k.w;
      if (w && next > maxW) { out.push([k]); w = k.w; }
      else { out[out.length - 1].push(k); w = next; }
    }
    return out.filter(r => r.length);
  },
  // `rowgap` / `colgap`: a number, or a function of the gutter index (A4: gutters
  // sized to the channels they carry).
  // `gap` (between boxes of one rank) may be a function (rank index, slot index):
  // the graph router sizes those gaps too (G5).
  rows(list, gap, rowgap) {
    let y = 0, w = 0, i = 0, last = 0;
    const gp = typeof rowgap === 'function' ? rowgap : () => rowgap, ig = typeof gap === 'function' ? gap : () => gap;
    for (const r of list) {
      let x = 0, h = 0, lg = 0;
      r.forEach((k, j) => { k.x = x; k.y = y; lg = ig(i, j); x += k.w + lg; h = Math.max(h, k.h); });
      if (r.length) { w = Math.max(w, x - lg); last = gp(i++); y += h + last; }
    }
    return { w, h: Math.max(0, y - last) };
  },
  cols(list, gap, colgap) {
    let x = 0, h = 0, i = 0, last = 0;
    const gp = typeof colgap === 'function' ? colgap : () => colgap, ig = typeof gap === 'function' ? gap : () => gap;
    for (const r of list) {
      let y = 0, w = 0, lg = 0;
      r.forEach((k, j) => { k.x = x; k.y = y; lg = ig(i, j); y += k.h + lg; w = Math.max(w, k.w); });
      if (r.length) { h = Math.max(h, y - lg); last = gp(i++); x += w + last; }
    }
    return { w: Math.max(0, x - last), h };
  },
  innerAt(id, base) { const g = this.rowGaps && this.rowGaps[id]; return (i, j) => Math.max(base, (g && g[i] && g[i][j]) || 0); },
  gutterAt(id, base) { const g = this.gutters && this.gutters[id]; return i => Math.max(base, (g && g[i]) || 0); },
  stack(list, gap) {
    let y = 0, w = 0, last = 0;
    const gp = typeof gap === 'function' ? gap : () => gap;
    list.forEach((k, i) => { k.x = 0; k.y = y; last = gp(i); y += k.h + last; w = Math.max(w, k.w); });
    return { w, h: Math.max(0, y - last) };
  },
  shift(list, dx, dy) { for (const k of list) { k.x += dx; k.y += dy; } },
  ruleExtra() { return RULE_EXTRA; },
  // Second pass, top-down: a container that came out wider than its content (a
  // long head, a wider sibling in the same column) hands the slack to what it
  // holds, so nothing is left ragged on the right. Runs after size().
  fill(n, W) {
    n.w = W;
    if (n.folded || !n.kids || !n.kids.length) return;
    const inner = W - (n.ox || 0) - (n.oxr ?? n.ox ?? 0);
    if (n.type === 'band' || n.type === 'group') {
      if (n.kind === 'blob') return;
      this.fillRows(this.rowsOf(n.kids), inner, 9, n.type === 'group' && WRAP[n.kind] === 1);
    } else if (n.type === 'hex') {
      for (const b of n.kids) this.fill(b, inner);
    } else if (n.type === 'unit') {
      const hex = n.kids.find(k => k.type === 'hex');
      const groups = n.kids.filter(k => k.type === 'group');
      const nested = n.kids.filter(k => k.type === 'unit' || k.type === 'fold');
      const side = hex && groups.length && !this.dirH();
      if (side) {
        // Stacked groups take their column's width; the hexagon takes the rest.
        const gw = Math.max(...groups.map(g => g.w));
        const hw = inner - GUT - gw;
        this.fill(hex, hw);
        for (const g of groups) { g.x = hw + GUT; this.fill(g, gw); }
      } else {
        if (hex) this.fill(hex, inner);
        for (const g of groups) this.fill(g, inner);
      }
      if (nested.length) this.fillRows(this.rowsOf(nested), inner, GUT, false);
    } else {
      for (const k of n.kids) this.fill(k, k.w);   // dir / root: ranks keep their own widths
    }
  },
  rowsOf(kids) {
    const m = new Map();
    for (const k of kids) { const r = m.get(k.y) || []; r.push(k); m.set(k.y, r); }
    return [...m.values()].map(r => r.sort((a, b) => a.x - b.x));
  },
  fillRows(rows, inner, gap, always) {
    for (const r of rows) {
      const slack = inner - r.reduce((s, k) => s + k.w, 0) - gap * (r.length - 1);
      if (slack > 0 && (always || slack / r.length <= FILL_MAX * Math.min(...r.map(k => k.w)))) {
        const per = Math.floor(slack / r.length);
        let x = 0;
        r.forEach((k, i) => { k.w += per + (i === r.length - 1 ? slack - per * r.length : 0); k.x = x; x += k.w + gap; });
      }
      for (const k of r) if (k.kids) this.fill(k, k.w);
    }
  },
  // The layer's own body layout, from (0,0): bands stacked in a hexagon, wrapped
  // rows in a group or band. Shared by the layer's own size() and the fused path.
  layBody(n) {
    if (n.type === 'hex') {
      const s = this.stack(n.kids, this.gutterAt(n.id, BAND_SEP));
      // Band rulers are section dividers: every band spans the hexagon's inner width.
      for (const b of n.kids) b.w = s.w;
      return s;
    }
    // G5: the gaps inside a layer grow with the graph router's need (no need: base gaps)
    const s = this.rows(this.wrap(n.kids, WRAP[n.kind], n.kind), this.innerAt(n.id, 9), this.gutterAt(n.id, n.kind === 'blob' ? 2 : 9));
    // Single-column groups read as a list: every box takes the column width.
    if (n.type === 'group' && WRAP[n.kind] === 1 && n.kind !== 'blob') for (const k of n.kids) k.w = s.w;
    return s;
  },
  // A fused node is a container in shape (unit head, unit pad) whose body is the
  // layer's. Open or folded exactly like any container.
  sizeFused(n) {
    if (n.folded) return Object.assign(n, { w: this.headWidth(n.id), h: FUSED_FOLDED_H, ox: UNIT_PAD, oy: FUSED_FOLDED_H, kids: [] });
    n.kids.forEach(k => this.size(k));
    const s = this.layBody(n), head = UNIT_HEAD + this.ruleExtra();
    return Object.assign(n, { w: Math.max(s.w + UNIT_PAD * 2, this.headWidth(n.id)), h: head + s.h + UNIT_PAD, ox: UNIT_PAD, oy: head });
  },
  size(n) {
    if (n.fused) return this.sizeFused(n);
    if (n.type === 'item') return Object.assign(n, this.sizeItem(n));
    if (n.type === 'fold') {
      const p = this.paint[n.id];
      // Same head geometry as a folded fused card: title line, UNIT_PAD above and below.
      return Object.assign(n, { w: Math.max(152, p.label.length * 8.4 + 96), h: FUSED_FOLDED_H });
    }
    if (n.type === 'band') {
      const bh = this.paint[n.id] && this.paint[n.id].first ? BAND_HEAD_FIRST : BAND_HEAD;
      if (n.folded) return Object.assign(n, { w: this.headWidth(n.id), h: bh - 8, ox: 0, oy: 0, kids: [] });
      n.kids.forEach(k => this.size(k));
      const s = this.rows(this.wrap(n.kids, WRAP[n.kind], n.kind), this.innerAt(n.id, 9), this.gutterAt(n.id, 9));
      this.shift(n.kids, 0, bh);
      return Object.assign(n, { w: Math.max(s.w, this.headWidth(n.id)), h: bh + s.h, ox: 0, oy: 0 });
    }
    if (n.type === 'hex' || n.type === 'group') {
      const head0 = n.type === 'hex' ? HEX_HEAD : GRP_HEAD;
      const pad = n.type === 'hex' ? HEX_PAD : GRP_PAD;
      if (n.folded) return Object.assign(n, { w: this.headWidth(n.id), h: GRP_FOLDED_H, ox: pad, oy: head0, kids: [] });
      n.kids.forEach(k => this.size(k));
      const s = this.layBody(n);
      return Object.assign(n, { w: Math.max(s.w + pad * 2, this.headWidth(n.id)), h: head0 + s.h + pad, ox: pad, oy: head0 });
    }
    if (n.type === 'unit') {
      n.kids.forEach(k => this.size(k));
      const hex = n.kids.find(k => k.type === 'hex');
      const groups = n.kids.filter(k => k.type === 'group');
      const nested = n.kids.filter(k => k.type === 'unit' || k.type === 'fold');
      const stacked = this.dirH();
      // A17: the layer gaps inside a routed unit read the gutter need like
      // directory gutters (index 0 = hexagon → first group).
      const gp = stacked ? this.gutterAt(n.id, GUT) : () => GUT;
      // A17: the margin on the side a D stack runs along grows to hold it (lo = left when stacked, top otherwise)
      const sd = (this.sides && this.sides[n.id]) || {}, sLo = sd.lo || 0, sHi = sd.hi || 0;
      let w = 0, h = 0, top = 0;
      if (hex) { hex.x = 0; hex.y = top; w = Math.max(w, hex.w); h = top + hex.h; }
      if (groups.length) {
        const gs = this.stack(groups, hex ? i => gp(i + 1) : gp);
        if (stacked && hex) { this.shift(groups, 0, top + hex.h + gp(0)); w = Math.max(w, gs.w); h = top + hex.h + gp(0) + gs.h; }
        else { this.shift(groups, hex ? hex.w + GUT : 0, top); w = Math.max(w, (hex ? hex.w + GUT : 0) + gs.w); h = Math.max(h, top + gs.h); }
      }
      if (nested.length) {
        const ns = this.rows(this.wrap(nested, 2), GUT, GUT);
        this.shift(nested, 0, h ? h + GUT : 0);
        w = Math.max(w, ns.w); h = (h ? h + GUT : 0) + ns.h;
      }
      const pad = UNIT_PAD, head = UNIT_HEAD + this.ruleExtra();
      return Object.assign(n, { w: Math.max(w + pad * 2 + (stacked ? sLo + sHi : 0), this.headWidth(n.id)), h: head + h + pad + (stacked ? 0 : sLo + sHi), ox: pad + (stacked ? sLo : 0), oxr: pad + (stacked ? sHi : 0), oy: head + (stacked ? 0 : sLo) });
    }
    // dir / root
    n.kids.forEach(k => this.size(k));
    const s = this.flowLay(n.id, this.splitRanks(this.rank(n.kids)));
    const pad = n.type === 'root' ? 0 : DIR_PAD;
    const head = n.type === 'root' ? 0 : DIR_HEAD + this.ruleExtra();
    return Object.assign(n, { w: Math.max(s.w + pad * 2, this.headWidth(n.id)), h: head + s.h + pad, ox: pad, oy: head });
  },
  // Fit to view (toggle `aspect`): a rank longer than aspectCap along the
  // rank axis splits into adjacent sub-columns (sub-rows in vertical flow),
  // order kept, balanced by extent. Same rank = no arrows between the parts.
  splitRanks(ranks) {
    const cap = this.aspectCap && this.aspectCap.split;
    if (!cap) return ranks;
    const ext = this.dirH() ? 'h' : 'w', gap = this.dirH() ? 26 : 30, out = [];
    for (const r of ranks) {
      const total = r.reduce((s, k) => s + k[ext], 0) + gap * (r.length - 1);
      const c = Math.min(r.length, Math.ceil((total + gap) / (cap + gap)));
      if (c < 2) { out.push(r); continue; }
      const per = total / c; let cur = [], acc = 0, parts = 1;
      for (const k of r) {
        if (cur.length && parts < c && acc + k[ext] / 2 > per * parts) { out.push(cur); cur = []; parts++; }
        cur.push(k); acc += k[ext] + gap;
      }
      out.push(cur);
    }
    return out;
  },
  // Ranks along the flow. Fit to view, map longer than the view along the
  // flow: the rank sequence wraps into shelves no longer than aspectCap.shelf,
  // stacked across the flow. Gutter / gap indices stay global (rank order),
  // gapFinder reads shelves back from positions.
  flowLay(id, list) {
    const H = this.dirH(), ig = this.innerAt(id, H ? 26 : 30), gp = this.gutterAt(id, H ? 60 : 52);
    const lay = (l, a, b) => H ? this.cols(l, a, b) : this.rows(l, a, b);
    const cap = this.aspectCap && this.aspectCap.shelf;
    if (!cap) return lay(list, ig, gp);
    const ext = H ? 'w' : 'h', shelves = [];
    let cur = [], acc = 0;
    list.forEach((r, i) => {
      const l = Math.max(...r.map(k => k[ext]));
      if (cur.length && acc + l > cap) { shelves.push(cur); cur = []; acc = 0; }
      cur.push(r); acc += l + gp(i);
    });
    if (cur.length) shelves.push(cur);
    const SG = 60;
    let off = 0, q = 0, m = 0;
    for (const sh of shelves) {
      const o = off, s = lay(sh, (i, j) => ig(i + o, j), i => gp(i + o));
      for (const r of sh) for (const k of r) { if (H) k.y += q; else k.x += q; }
      m = Math.max(m, H ? s.w : s.h); q += (H ? s.h : s.w) + SG; off += sh.length;
    }
    q = Math.max(0, q - SG);
    return H ? { w: m, h: q } : { w: q, h: m };
  },
  // Fit to view: the rank-length cap whose map comes closest to the view's
  // aspect (log error). Sized once per scene, before routing; routing passes keep it.
  fitCap(root) {
    const el = this.canvas(); if (!el || !el.clientWidth) return null;
    const T = (el.clientWidth - 56) / Math.max(1, el.clientHeight - 128), H = this.dirH();
    this.aspectCap = null; this.size(root);
    const A = () => root.w / Math.max(1, root.h), err = () => Math.abs(Math.log(A() / T));
    if (Math.abs(Math.log(A() / T)) < 0.1) return null;
    // Longer than the view along the flow → shelves; across it → split ranks.
    const mode = (H ? A() > T : A() < T) ? 'shelf' : 'split';
    const meas = () => (mode === 'shelf') === H ? root.w : root.h;
    const done = () => mode === 'shelf' ? (H ? A() <= T : A() >= T) : (H ? A() >= T : A() <= T);
    let best = null, bestE = err(), ext = meas(), stall = 0;
    for (let i = 0; i < 30 && stall < 3; i++) {
      const cap = ext * 0.88;
      this.aspectCap = { [mode]: cap }; this.size(root);
      const e = err(), nx = meas();
      if (e < bestE) { bestE = e; best = cap; }
      if (done()) break;
      stall = nx >= ext - 1 ? stall + 1 : 0; ext = Math.min(cap, nx);
    }
    this.aspectCap = null;
    return best ? { [mode]: best } : null;
  },
  // Fold depth: the set of ids folded at a stop is computed from the graph, so
  // the slider replaces Collapse all / Expand all and chevrons still override.
  foldSetAt(d) {
    const out = [];
    const cs = this.g.containers;
    if (d <= 0) for (const c of cs) if (c.type === 'dir' && c.parent) out.push(c.id);   // root stays open
    if (d <= 1) for (const c of cs) if (c.type === 'unit' || c.type === 'driver') out.push(c.id);
    if (d <= 2) for (const cid of ['#root', ...cs.map(c => c.id)]) { out.push(cid + '#hex'); for (const g of [...OUT_GROUPS, ...HEX_BANDS]) out.push(cid + '#g:' + g); }
    if (d <= 3) for (const it of this.g.items) if (it.rows && it.rows.length) out.push(it.id);
    return out;
  },
  // Depth scope (knob `depthScope`, default on, Session 46): the slider acts on
  // the selection: the selected boxes and what they hold, never their holders
  // (Session 46f); with no selection, on the shown items when some are hidden
  // (fold ids that hold any of them); else on everything.
  // Fold ids outside the scope keep their folds. The cursor reads the same
  // scope back (depthOf), so selecting moves it to the selection's depth.
  depthScopeFn() {
    if (!(this.props.depthScope ?? true) || !this.vis) return null;
    const G = this.selGroup(this.cfg());
    let key, S;
    if (G.length) key = 's:' + G.join(',');
    else if (this.vis.present && this.g.items.some(i => !this.vis.present.has(i.id))) key = 'v';
    else return null;
    const vis = this.vis;
    if (!vis.scopeMemo || vis.scopeKey !== key) {
      vis.scopeKey = key; vis.scopeMemo = new Map();
      vis.scopeSet = key === 'v' ? vis.present : new Set(G.flatMap(g => this.endItems(String(g).split('|')[0])));
    }
    S = vis.scopeSet;
    const sel = key !== 'v';
    return id => { let v = vis.scopeMemo.get(id); if (v === undefined) { const E = this.endItems(id); v = sel ? E.length > 0 && E.every(i => S.has(i)) : E.some(i => S.has(i)); vis.scopeMemo.set(id, v); } return v; };
  },
  // Depth cursor read back from the drawn map (DECISIONS Session 34). A fold id's
  // level is the stop that first folds it; bands and fused nodes are layers.
  depthLevel(id) {
    if (/#(hex$|g:|b:)/.test(id)) return 2;
    const c = this.byId[id];
    if (!c) return -1;
    if (c.type === 'dir') return c.parent ? 0 : -1;
    if (c.type === 'unit' || c.type === 'driver') return 1;
    return c.rows && c.rows.length ? 3 : -1;
  },
  // A container is never narrower than its own header line.
  headWidth(id) {
    const p = this.paint[id];
    if (!p || p.type === 'root') return 0;
    if (p.fused) {
      // Container title (13.5px/600) + gap + layer label (11.5px/600) + glyph +
      // chevron with its margin + head padding + border reserve.
      const title = p.fused.join(' › ').length * 8.4, sub = p.label.length * 7.4, glyph = p.type === 'hex' ? 24 : 0;
      return Math.ceil(title + 8 + glyph + sub + CHEV_W + 9 + 13 * 2 + 2 * BWR + 4);
    }
    const unit = p.type === 'unit' || p.type === 'driver';
    const scale = p.type === 'band' ? 6.4 : p.type === 'hex' || p.type === 'group' ? 6.8 : (unit ? 8 : 7.4);
    const pad = p.type === 'band' ? 16 : p.type === 'hex' ? 34 : p.type === 'group' ? 30 : 34;
    const route = this.byId[id] ? (String(this.descItems(id).length).length * 2 + 1) * 6.2 + 12 : 0;
    const sub = p.sub ? p.sub.length * 6.8 + 10 : 0;
    const glyph = p.type === 'hex' ? 17 : 0; // 11px hexagon icon + 6px gap
    return Math.ceil(p.label.length * scale + (p.meta ? p.meta.length * 6.1 + 12 : 0) + sub + glyph + pad + CHEV_W + route);
  },
  // Layered placement of a dir's children. Edges are weighted by count, cycles
  // are broken first (Eades–Lin–Smyth) so a back-edge never wedges a rank, then
  // ranks are ordered by weighted barycenter over the boxes' real extents,
  // sweeping down and up until the crossing count stops improving.
  rank(kids) {
    const owner = new Map();
    for (const k of kids) for (const i of k.items) owner.set(i, k.id);
    const idx = new Map(kids.map((k, i) => [k.id, i]));
    const W = new Map();
    for (const e of this.liveEdges) {
      const a = owner.get(e.from), b = owner.get(e.to);
      if (!a || !b || a === b) continue;
      if (!W.has(a)) W.set(a, new Map());
      W.get(a).set(b, (W.get(a).get(b) || 0) + 1);
    }
    let es = [];
    for (const [a, m] of W) for (const [b, w] of m) es.push([a, b, w]);
    const ord = this.acyclicOrder(kids.map(k => k.id), es, idx);
    es = es.map(([a, b, w]) => ord.get(a) <= ord.get(b) ? [a, b, w] : [b, a, w]);
    // Drivers first (DECISIONS Session 28, tiers Session 29): tier 0 holds a
    // driver-layer item, tier 1 is a driver container with assembly only, tier 2
    // is everything else. An edge from a later tier into an earlier one counts
    // as leaving the earlier one, and each tier ranks after the last rank of the
    // tiers before it — so a driver sits left of its assembly-only siblings.
    const drvC = new Set(this.g.containers.filter(c => c.type === 'driver').map(c => c.id));
    const holds = (k, f) => k.items.some(i => { const it = this.byId[i]; return it && f(it); });
    const tier = new Map(kids.map(k => [k.id, holds(k, it => it.group === 'driver') ? 0 : holds(k, it => drvC.has(it.c)) ? 1 : 2]));
    es = es.map(([a, b, w]) => tier.get(b) < tier.get(a) ? [b, a, w] : [a, b, w]);
    const rank = new Map(kids.map(k => [k.id, 0]));
    const relax = () => { for (let p = 0; p <= kids.length; p++) {
      let moved = false;
      for (const [a, b] of es) if (rank.get(b) < rank.get(a) + 1) { rank.set(b, rank.get(a) + 1); moved = true; }
      if (!moved) break;
    } };
    relax();
    for (let T = 1; T <= 2; T++) {
      const prev = kids.filter(k => tier.get(k.id) < T), cur = kids.filter(k => tier.get(k.id) === T);
      if (!prev.length || !cur.length) continue;
      const d = Math.max(...prev.map(k => rank.get(k.id)));
      cur.forEach(k => rank.set(k.id, Math.max(rank.get(k.id), d + 1)));
      relax();
    }
    const max = Math.max(0, ...rank.values());
    let out = [];
    for (let r = 0; r <= max; r++) out.push(kids.filter(k => rank.get(k.id) === r));
    out = out.filter(r => r.length);
    if (out.length < 2) return out;
    const ext = this.dirH() ? 'h' : 'w', gap = this.dirH() ? 26 : 30;
    const adj = new Map(kids.map(k => [k.id, []]));
    for (const [a, b, w] of es) { adj.get(a).push([b, w]); adj.get(b).push([a, w]); }
    const centers = r => { const c = new Map(); let p = 0; for (const k of r) { c.set(k.id, p + k[ext] / 2); p += k[ext] + gap; } return c; };
    const sweep = (r, ref) => {
      const c = centers(out[ref]), own = centers(out[r]);
      const bc = k => {
        let s = 0, n = 0;
        for (const [o, w] of adj.get(k.id)) if (c.has(o)) { s += c.get(o) * w; n += w; }
        return n ? s / n : own.get(k.id);
      };
      out[r] = out[r].map(k => ({ k, b: bc(k) })).sort((p, q) => (p.b - q.b) || (idx.get(p.k.id) - idx.get(q.k.id))).map(x => x.k);
    };
    const crossings = () => {
      let n = 0;
      for (let r = 0; r + 1 < out.length; r++) {
        const p = new Map(out[r].map((k, i) => [k.id, i])), q = new Map(out[r + 1].map((k, i) => [k.id, i]));
        const seg = es.filter(([a, b]) => (p.has(a) && q.has(b)) || (p.has(b) && q.has(a))).map(([a, b, w]) => p.has(a) ? [p.get(a), q.get(b), w] : [p.get(b), q.get(a), w]);
        for (let i = 0; i < seg.length; i++) for (let j = i + 1; j < seg.length; j++)
          if ((seg[i][0] - seg[j][0]) * (seg[i][1] - seg[j][1]) < 0) n += seg[i][2] * seg[j][2];
      }
      return n;
    };
    let best = out.map(r => r.slice()), bestN = crossings();
    for (let it = 0; it < 4 && bestN > 0; it++) {
      for (let r = 1; r < out.length; r++) sweep(r, r - 1);
      for (let r = out.length - 2; r >= 0; r--) sweep(r, r + 1);
      const n = crossings();
      if (n < bestN) { bestN = n; best = out.map(r => r.slice()); }
    }
    return best;
  },
  // Eades–Lin–Smyth: peel sinks to the right and sources to the left; when only
  // cycles remain, take the node with the largest weighted out−in. Edges that
  // point backwards in the resulting order are the ones to reverse for ranking.
  acyclicOrder(ids, es, idx) {
    const alive = new Set(ids), left = [], right = [];
    const outW = id => es.reduce((s, [a, b, w]) => s + (a === id && alive.has(b) ? w : 0), 0);
    const inW = id => es.reduce((s, [a, b, w]) => s + (b === id && alive.has(a) ? w : 0), 0);
    while (alive.size) {
      let changed = true;
      while (changed) {
        changed = false;
        for (const id of [...alive]) if (outW(id) === 0) { right.unshift(id); alive.delete(id); changed = true; }
        for (const id of [...alive]) if (inW(id) === 0) { left.push(id); alive.delete(id); changed = true; }
      }
      if (!alive.size) break;
      const pick = [...alive].map(id => ({ id, d: outW(id) - inW(id) })).sort((p, q) => (q.d - p.d) || (idx.get(p.id) - idx.get(q.id)))[0].id;
      left.push(pick); alive.delete(pick);
    }
    return new Map([...left, ...right].map((id, i) => [id, i]));
  },
  flatten(n, x, y, out, z) {
    out[n.id] = { x, y, w: n.w, h: n.h, t: n.type, z };
    if (n.type === 'item' && n.syms && n.rows.length) {
      const top = y + BOX.bw + BOX.padY + BOX.labelH + BOX.gap;
      n.syms.forEach((sy, i) => { if (i < n.rows.length) out[n.id + '#' + sy.name] = { x, y: top + i * BOX.rowH, w: n.w, h: BOX.rowH, t: 'member', z: z + 1 }; });
    }
    if (n.kids) for (const k of n.kids) this.flatten(k, x + (n.ox || 0) + k.x, y + (n.oy || 0) + k.y, out, z + 1);
  },
  // For every item, the *deepest drawn node that stands for it* — a folded band
  // or kind group, not just its data container. Data parentage skips the layout
  // nodes (a folded `adapters` group is not the module's `c`), so an endpoint
  // lifted by parentage alone would jump past the visible group to the unit.
  indexOwners(pos) {
    const depth = id => { let d = 0, p = this.T.parent[id]; while (p) { d++; p = this.T.parent[p]; } return d; };
    const own = {};
    for (const nid in pos) {
      const its = this.tItems[nid];
      if (!its) continue;
      const d = depth(nid);
      for (const it of its) if (!own[it] || own[it].d < d) own[it] = { id: nid, d };
    }
    this.owner = own;
  },
  // Position-aware: an endpoint with no rect of its own is represented by the
  // nearest ancestor that has one — a collapsed unit, group, band or hexagon.
  liftIn(id, pos) {
    let cur = id;
    while (cur) {
      if (pos[cur]) return cur;
      // The node that draws this item, however deep it is folded.
      const o = this.owner && this.owner[cur];
      if (o && pos[o.id]) return o.id;
      // A member id (`module#Symbol`) only has a layout parent while members are
      // drawn; off screen it falls back to its module.
      cur = this.T.parent[cur] || this.parentOf(cur) || (cur.indexOf('#') > 0 ? cur.slice(0, cur.indexOf('#')) : null);
    }
    return null;
  },
  lift(id) { return this.frame ? this.liftIn(id, this.frame.nodes) : null; },
  axisOf(id) {
    const t = this.T.type[id];
    if (t === 'hex' || t === 'group') return false;
    if (t === 'unit' || t === 'band') return true;
    return this.dirH();
  },
  commonBox(a, b) {
    const up = [];
    let p = this.T.parent[a];
    while (p) { up.push(p); p = this.T.parent[p]; }
    let q = this.T.parent[b];
    let c = '#root';
    while (q) { if (up.includes(q)) { c = q; break; } q = this.T.parent[q]; }
    // A17: inside an active unit the hexagon is not a routing box of its own —
    // an arrow between two of its bands (or a band and a layer group) is routed
    // by the unit, like any other pair of layers. Same-band pairs keep the band.
    if (this.T.type[c] === 'hex') { const u = this.T.parent[c]; if (u && this.T.type[u] === 'unit' && this.openBox(u)) return u; }
    return c;
  },
  // Arrow detail is a static semantic scale (LEVELS): unit → layer → box. Every
  // endpoint is lifted to the nearest ancestor at or above the chosen level;
  // arrows with both ends in one node merge away. Bands are rulers, never ends.
  // `ends` keeps the finest visible endpoints for the highlight.
  levelOf(id) {
    let t = this.T.type[id];
    if (t === 'fold') t = this.byId[id] ? this.byId[id].type : 'dir';
    if (t === 'unit' || t === 'driver') return 3;
    if (t === 'hex' || t === 'group') return 2;
    if (t === 'item') return 1;
    if (t === 'member') return 0;
    if (t === 'band') return this.paint[id] && this.paint[id].folded ? 1 : -1;
    return 4;   // dir, root, externals
  },
  liftTo(id, L) {
    const want = LEVELS.length - 1 - LEVELS.indexOf(L);   // LEVELS runs coarse→fine, levelOf fine→coarse
    let cur = id, last = id;
    while (cur) {
      const lv = this.levelOf(cur);
      if (lv >= 4) return last;
      if (lv >= want) return cur;
      if (lv >= 0) last = cur;
      cur = this.T.parent[cur] || this.parentOf(cur);
    }
    return last;
  },
  };
  root.MapLayout = { methods, bind(C) { ({ LEVELS, HEX_BANDS, OUT_GROUPS, WRAP, WRAPW, GUT, BWR, UNIT_PAD, DIR_PAD, UNIT_HEAD, DIR_HEAD, FUSED_FOLDED_H, CHEV_W, RULE_EXTRA, FILL_MAX, HEX_PAD, GRP_PAD, HEX_HEAD, GRP_HEAD, GRP_FOLDED_H, BAND_HEAD, BAND_HEAD_FIRST, BAND_SEP, BOX, boxH, boxW } = C); } };
})(typeof window !== 'undefined' ? window : globalThis);
