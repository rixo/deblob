// Rules router: routeEdges and its passes (docs/arrow-model.md A1–A25), the
// graph-router bridge (graphRoute, gapFinder) and the card helpers.
// Methods of the map component (Deblob Map Host.dc.html), moved here for the
// host contract (CLAUDE.md, ask 1): every project file ≤ 200 KiB. They run
// with `this` = the component, verbatim from the page; the page mixes
// `methods` into its prototype after `bind(MapConsts)` (engineReady()).
// Tests: root.MapRouter.bind(root.MapConsts); Object.assign(fakeMap, root.MapRouter.methods).
(function (root) {
  let UNIT_PAD, UNIT_HEAD;
  const methods = {
  // Arrow system, first principle (Session 8): the data is always at member
  // grain. An endpoint is drawn on the *deepest visible* node — the member if
  // it is on screen, else its module, else its band, layer, unit, directory.
  // So a single arrow can join a member to a unit. There is no arrow scale:
  // what you fold is what the arrows follow. Arrows that land on the same pair
  // merge, and the merged load reads as stroke thickness.
  routeEdges(pos) {
    const merged = new Map();
    for (const e of this.liveEdges) {
      const a = this.liftIn(e.from, pos), b = this.liftIn(e.sym ? e.to + '#' + e.sym : e.to, pos);
      if (!a || !b || a === b || !pos[a] || !pos[b]) continue;
      const a0 = a, b0 = b;
      // Arrow families (Session 20 ruling). `type` is the weak form of `import`:
      // one import arrow between two nodes, dashed only while every edge it
      // carries is type-only. `implements` implies a type link but NOT a
      // runtime one, so it never merges with import: type + implements to a box
      // means no hard link, only the type system; an import beside it is a hard
      // link and stays its own arrow. Within a pair, a type edge merges into
      // implements when there is no import to carry it (implements ⊃ type).
      const fam = e.type === 'type' ? 'import' : e.type;
      const key = a + '|' + b + '|' + fam;
      const m = merged.get(key) || { id: key, a, b, type: e.type, count: 0, ends: new Set(), pairs: [] };
      if (m.type === 'type' && e.type === 'import') m.type = 'import';
      m.count++; m.ends.add(a0); m.ends.add(b0); m.pairs.push(e);
      merged.set(key, m);
    }
    // implements ⊃ type (`typeIntoImplements`): a pair whose import arrow is
    // type-only next to an implements arrow folds the type edges into the
    // implements arrow. type + import + implements always stays two arrows.
    if (this.props.typeIntoImplements ?? true) for (const [key, m] of [...merged]) {
      if (m.type !== 'type') continue;
      const im = merged.get(m.a + '|' + m.b + '|implements');
      if (!im) continue;
      im.count += m.count; for (const x of m.ends) im.ends.add(x); im.pairs.push(...m.pairs);
      merged.delete(key);
    }
    const list = [...merged.values()];
    const P = this.arrowParams();
    this.frameRects = pos;
    // A17: the units routed inside are the *active* ones — the selection's
    // representative and its ancestors (a unit reflows when selected, anchored
    // on the selection; hover never reflows). Nothing selected: none.
    this.routeUnits = !!P.insideUnits;
    this.activeUnits = new Set();
    if (P.insideUnits && this.cfg().sel) for (const g of this.selGroup(this.cfg())) { let cur = g; while (cur) { this.activeUnits.add(cur); cur = this.T.parent[cur]; } }
    // A14b (Session 40, user, revised): the direction conventions — A14 lanes,
    // the A16 side of detours and U-turns — hold for every arrow except those
    // internal to a single unit (both ends inside one unit). Those take the side
    // their geometry prefers: fewest boxes crossed, then the shorter way.
    const unitsOf = id => { const u = new Set(); for (let c = this.T.parent[id]; c; c = this.T.parent[c]) if (this.T.type[c] === 'unit') u.add(c); return u; };
    const dirRule = m => { const u = unitsOf(m.a); for (let c = this.T.parent[m.b]; c; c = this.T.parent[c]) if (u.has(c)) return false; return true; };
    let leaves = null;
    const kin = (x, y) => { for (let c = y; c; c = this.T.parent[c]) if (c === x) return true; return false; };
    // boxes a leg along the axis-orthogonal line `at` from u to v crosses (not the ends' own)
    const crossed = (m, H, at, u, v) => {
      if (!leaves) { const par = new Set(Object.keys(pos).map(id => this.T.parent[id])); leaves = Object.keys(pos).filter(id => !par.has(id)); }
      const ax = H ? 'y' : 'x', as = H ? 'h' : 'w', px = H ? 'x' : 'y', ps = H ? 'w' : 'h', lo = Math.min(u, v), hi = Math.max(u, v);
      let n = 0;
      for (const id of leaves) {
        const r = pos[id];
        if (r[ax] >= at || r[ax] + r[as] <= at || r[px] >= hi || r[px] + r[ps] <= lo) continue;
        if (kin(id, m.a) || kin(id, m.b) || kin(m.a, id) || kin(m.b, id)) continue;
        n++;
      }
      return n;
    };
    const cardCache = {}, cardsOf = box => cardCache[box] || (cardCache[box] = this.openBox(box) ? Object.keys(pos).filter(id => (this.T.parent[id] || '#root') === box).map(id => pos[id]) : []);
    // A3 exit side: the common box's axis decides, unless the pair is separated
    // only along the other axis — then the arrow leaves the face that looks at
    // its target instead of making a U-turn.
    for (const m of list) {
      m.box = this.commonBox(m.a, m.b);
      let H = this.axisOf(m.box);
      { const A = pos[m.a], B = pos[m.b];
        const sep = h => h ? (B.x > A.x + A.w + 8 || B.x + B.w + 8 < A.x) : (B.y > A.y + A.h + 8 || B.y + B.h + 8 < A.y);
        if (!sep(H) && sep(!H)) H = !H; }
      // A18 side entry: every arrow inside an active unit keeps the horizontal
      // axis (a stacked pair U-turns) — the layers stack is entered only by its
      // sides, never through the box text.
      if (this.T.type[m.box] === 'unit' && this.openBox(m.box)) H = true;
      m.H = H;
    }
    // root.__routerOverride: debug hook (forces the router without the Tweaks panel)
    if ((root.__routerOverride || this.props.router) === 'graph' && root.GraphRouter) return this.graphRoute(list, pos, P);
    const kS = m => m.a + '/' + (m.H ? 1 : 0), kT = m => m.b + '/' + (m.H ? 1 : 0);
    const bySrc = {}, byTgt = {};
    for (const m of list) { (bySrc[kS(m)] = bySrc[kS(m)] || []).push(m); (byTgt[kT(m)] = byTgt[kT(m)] || []).push(m); }
    const cen = (n, H) => H ? n.y + n.h / 2 : n.x + n.w / 2;
    for (const k in bySrc) bySrc[k].sort((p, q) => cen(pos[p.b], p.H) - cen(pos[q.b], q.H));
    for (const k in byTgt) byTgt[k].sort((p, q) => cen(pos[p.a], p.H) - cen(pos[q.a], q.H));
    // Attachment points and the gap each arrow's channel must live in.
    for (const m of list) {
      const A = pos[m.a], B = pos[m.b], H = m.H;
      const ax = H ? 'y' : 'x', as = H ? 'h' : 'w', px = H ? 'x' : 'y', ps = H ? 'w' : 'h';
      const S = bySrc[kS(m)], T = byTgt[kT(m)];
      m.s = A[ax] + A[as] * ((S.indexOf(m) + 1) / (S.length + 1));
      m.t = B[ax] + B[as] * ((T.indexOf(m) + 1) / (T.length + 1));
      const a0 = A[px], a1 = A[px] + A[ps], b0 = B[px], b1 = B[px] + B[ps];
      // A1 (Session 20): the channel lives in the gutter between the two end
      // *cards* of the common box, never inside a card — a face deep in a
      // container (a member row) is reached by the last leg, not by a bend
      // inside the container. Card = the end's ancestor directly under the box.
      const cA0 = this.cardOf(m.a, m.box) || A, cB0 = this.cardOf(m.b, m.box) || B;
      const ca0 = cA0[px], ca1 = cA0[px] + cA0[ps], cb0 = cB0[px], cb1 = cB0[px] + cB0[ps];
      const c = pos[m.box];
      const lo = c ? c[px] + 8 : -1e9, hi = c ? c[px] + c[ps] - 8 : 1e9;
      // A1 minLeg: the channel keeps at least `minT` before the head and `minS`
      // after the tail. A gutter too narrow for both gives the head its run and
      // collapses the channel range (every strand shares one mid) — never a hook.
      // minLeg is measured from the head's base, not the face: the head's own
      // length (A5, from the merged count) is added, so minLeg = 0 is a bend
      // exactly at the base and any positive value is clear line under the head.
      const minT = this.headLen(m.count) + P.minLeg, minS = Math.max(8, Math.round(P.minLeg / 3));
      // A1: a Z whose end cards overlap across the axis has no gutter for its
      // channel (it would run inside a card between them): it U-turns instead.
      const overlap = cA0 !== cB0 && ca0 < cb1 && cb0 < ca1;
      if (b0 > a1 + 8 && !overlap) {
        m.sp = a1; m.tp = b0; m.dir = 1;
        let g0 = Math.max(a1 + minS, ca1 + minS), g1 = Math.min(b0 - minT, cb0 - minT);
        if (g1 < g0) { m.tight = true; g0 = g1 = Math.max(a1 + 4, Math.min(b0 - 4, b0 - minT)); }
        m.gap = [g0, g1];
      } else if (b1 + 8 < a0 && !overlap) {
        m.sp = a0; m.tp = b1; m.dir = -1;
        let g0 = Math.max(b1 + minT, cb1 + minT), g1 = Math.min(a0 - minS, ca0 - minS);
        if (g1 < g0) { m.tight = true; g0 = g1 = Math.min(a0 - 4, Math.max(b1 + 4, b1 + minT)); }
        m.gap = [g0, g1];
      } else {
        const far = Math.max(a1, b1), near = Math.min(a0, b0);
        // A16 in a unit: the U-turn side follows the flow — up-going left, down-going right
        // A14b: the flow side only for an arrow ending at a whole unit; else the
        // side whose two legs cross fewer boxes, then the one with more room
        const unitBox = this.T.type[m.box] === 'unit' && this.openBox(m.box);
        let right;
        if (unitBox && P.routed && dirRule(m)) right = H ? m.t > m.s : m.t < m.s;
        else if (P.routed) {
          const xr = crossed(m, H, m.s, a1, far + minT) + crossed(m, H, m.t, b1, far + minT);
          const xl = crossed(m, H, m.s, a0, near - minT) + crossed(m, H, m.t, b0, near - minT);
          right = xr !== xl ? xr < xl : hi - far >= near - lo;
        } else right = hi - far >= near - lo;
        // A17: in a unit the U-turn channels take the whole margin (it grew for
        // them); elsewhere 48px. A U-turn between two boxes of one card turns
        // just past them, inside the card (A26).
        const same = cA0 === cB0 && cA0 !== A && cA0 !== B;
        const cap = same ? 16 : unitBox ? 1e9 : 48;
        const rHi = same ? Math.min(hi, cA0[px] + cA0[ps] - 4) : hi, rLo = same ? Math.max(lo, cA0[px] + 4) : lo;
        if (right) { m.sp = a1; m.tp = b1; m.gap = [far + minT, Math.max(far + minT, Math.min(far + minT + cap, rHi))]; m.dir = 2; }
        else { m.sp = a0; m.tp = b0; m.gap = [Math.min(near - minT, Math.max(near - minT - cap, rLo)), near - minT]; m.dir = -2; }
        if (same) m.inCard = true;
      }
      // A2 straight-snap: ends nearly aligned across a gutter meet on one line.
      // Across a gutter too narrow for a bend (`tight`), any overlap of the two
      // faces is enough: the strand takes the overlap point nearest its ends.
      m.s0 = m.s; m.t0 = m.t;
      if (Math.abs(m.dir) === 1) {
        const o0 = Math.max(A[ax], B[ax]) + 3, o1 = Math.min(A[ax] + A[as], B[ax] + B[as]) - 3;
        if (o1 >= o0 && (m.tight || Math.abs(m.s - m.t) <= P.snap)) { m.s = m.t = Math.max(o0, Math.min(o1, (m.s + m.t) / 2)); m.straight = true; }
      }
      // A11 avoid units: a strand whose Z would pass through a card it does not end
      // in is marked; it takes a 6-point detour around that card (below).
      if (P.routed && Math.abs(m.dir) === 1 && this.blockers(m, pos, cardsOf(m.box)).length) { m.detour = true; m.straight = false; }
      // A14 lanes: a forward Z must not run under a card it passes, a backward
      // one not over; if no channel position dodges, the strand detours on its side.
      if (P.routed && Math.abs(m.dir) === 1 && dirRule(m) && this.laners(m, pos, cardsOf(m.box)).length) { m.detour = true; m.straight = false; }
    }
    // A19 bundles: strands of one family that share target, common box, axis
    // and direction are one bundle. They take one face slot and one final
    // track (the trunk); each strand joins the trunk where its own route meets
    // it. bundles[k][0] is the representative that stands for the bundle in
    // every per-face / per-track computation; `syncT` / `syncX` copy back.
    const bundles = {};
    if (P.bundles) {
      // face: a Z (dir ±1) or a U-turn (dir ∓2) enters the near face (dir 1, -2)
      // or the far face (dir -1, 2) — strands on one face bundle across boxes.
      for (const m of list) {
        if (!m.dir) continue;
        const fam = m.type === 'type' ? 'import' : m.type, face = (m.dir === 1 || m.dir === -2) ? 'n' : 'f';
        const k = m.b + '|' + fam + '|' + (m.H ? 1 : 0) + '|' + face;
        (bundles[k] = bundles[k] || []).push(m);
      }
      // A23: a member that A2 made straight stays straight (routing had its
      // veto earlier); it pins the bundle's face slot — the trunk's leg is its
      // line — and the rest of the bundle jogs to it. Two straight members of
      // one bundle at different lines: the heaviest pins, the others jog.
      for (const k in bundles) {
        if (bundles[k].length < 2) { delete bundles[k]; continue; }
        const st = bundles[k].filter(m => m.straight).sort((p, q) => q.count - p.count || Math.abs(q.s0 - q.t0) - Math.abs(p.s0 - p.t0));
        const pin = st[0];
        for (const m of bundles[k]) { m.bundle = k; m.track = k + '|' + m.box + '|' + m.dir; if (m.straight && m !== pin) { m.straight = false; m.s = m.s0; m.t = m.t0; } }
        if (pin) { bundles[k].splice(bundles[k].indexOf(pin), 1); bundles[k].unshift(pin); }
      }
      // A19b: a trunk must be legal for every strand that joins it. A strand
      // whose own channel gap excludes the trunk could only reach it by leaving
      // its face backwards, through its own card (the defect: a strand inside a
      // group joining a trunk placed beside the group). Per track, cluster the
      // members by gap — the common intersection when there is one, else greedy
      // point-stabbing from the earliest gap end — and give each cluster its own
      // trunk, its members' gaps clamped to the cluster's intersection so the
      // channel the slotter picks for any of them is legal for all. Clusters
      // still share the bundle: one face slot, one head.
      const byTrack0 = {};
      for (const k in bundles) for (const m of bundles[k]) (byTrack0[m.track] = byTrack0[m.track] || []).push(m);
      for (const t in byTrack0) {
        const ms = byTrack0[t];
        if (ms.length < 2) continue;
        const rest = ms.slice().sort((p, q) => p.gap[1] - q.gap[1]);
        let ci = 0;
        while (rest.length) {
          const x = rest[0].gap[1], cl = rest.filter(m => m.gap[0] <= x + 0.6 && m.gap[1] >= x - 0.6);
          const lo = Math.max(...cl.map(m => m.gap[0])), hi = Math.min(...cl.map(m => m.gap[1]));
          for (const m of cl) { m.gap = [lo, hi]; m.track = t + '|c' + ci; rest.splice(rest.indexOf(m), 1); }
          ci++;
        }
      }
    }
    // A20 auto pitch: `pitch` is the clear gap between neighbouring strokes,
    // so centres sit pitch + (w1 + w2)/2 apart. A strand's own width is its
    // stroke; its final channel, when bundled, is the track's trunk (summed).
    const swOf = n => Math.min(4, 1.3 + Math.log2(n || 1)), trunkSw = n => Math.min(6, 1.3 + Math.log2(n || 1));
    const trackCount = {};
    for (const m of list) if (m.track) trackCount[m.track] = (trackCount[m.track] || 0) + m.count;
    for (const m of list) { m.w = swOf(m.count); m.wFinal = m.track ? trunkSw(trackCount[m.track]) : m.w; }
    const brep = m => m.bundle ? bundles[m.bundle][0] : m;
    const syncT = () => { for (const k in bundles) { const r = bundles[k][0]; for (const m of bundles[k]) if (!m.straight) m.t = r.t; } };
    const finalX = m => m.gap2 ? m.mid2 : m.mid;
    // faces with a bundle re-fan: one slot per bundle (straight strands keep theirs; A8 refans around them)
    for (const k in byTgt) {
      const all = byTgt[k]; if (!all.some(m => m.bundle)) continue;
      const T = all.filter(m => brep(m) === m);
      byTgt[k] = T;
      // A23: a pinned bundle's slot is the pin's line, not a fan position
      for (const m of all) { if (m.straight) continue; const r = brep(m); if (r.straight) { m.t = r.t; continue; } const B = pos[m.b], ax = m.H ? 'y' : 'x', as = m.H ? 'h' : 'w'; m.t = B[ax] + B[as] * ((T.indexOf(r) + 1) / (T.length + 1)); }
    }
    // A23 late pin: the bundle slot is only known now, so A2 runs again for
    // unpinned bundles — a member whose source slot lands within `snap` of the
    // slot (faces overlapping there) goes straight, pins, and the slot moves
    // to its line. Heaviest first. Without this a member 0.5px off the slot
    // drew as a Z with a hairline jog (Session 26).
    for (const k in bundles) {
      const ms = bundles[k]; if (ms[0].straight) continue;
      const c = ms.filter(m => Math.abs(m.dir) === 1 && !m.detour && Math.abs(m.s - m.t) <= P.snap).sort((p, q) => q.count - p.count);
      for (const m of c) {
        const A = pos[m.a], B = pos[m.b], ax = m.H ? 'y' : 'x', as = m.H ? 'h' : 'w';
        const o0 = Math.max(A[ax], B[ax]) + 3, o1 = Math.min(A[ax] + A[as], B[ax] + B[as]) - 3;
        if (o1 < o0) continue;
        const v = Math.max(o0, Math.min(o1, (m.s + m.t) / 2));
        m.s = m.t = v; m.straight = true; ms.splice(ms.indexOf(m), 1); ms.unshift(m);
        for (const x of ms) if (!x.straight) x.t = v;
        break;
      }
    }
    const syncX = () => { const byTrack = {}; for (const k in bundles) for (const m of bundles[k]) if (!m.straight) (byTrack[m.track] = byTrack[m.track] || []).push(m); for (const k in byTrack) { const X = finalX(byTrack[k][0]); for (const m of byTrack[k]) { if (m.gap2) m.mid2 = X; else m.mid = X; } }
      // A23: a straight member's corner is wherever its track's trunk turns (its own mid is free: s = t)
      for (const k in bundles) for (const m of bundles[k]) if (m.straight && byTrack[m.track]) m.mid = finalX(byTrack[m.track][0]); };
    // A8 aligned slot: a strand whose two faces overlap takes the one line that
    // makes it straight, if that line is a pitch clear of the other pinned lines
    // on both faces; the remaining strands of each face fan around the pinned ones.
    if (P.fanAlign) {
      const usedS = {}, usedT = {};
      const use = (m, v) => { (usedS[kS(m)] = usedS[kS(m)] || []).push(v); (usedT[kT(m)] = usedT[kT(m)] || []).push(v); };
      for (const m of list) if (m.straight) use(m, m.s);
      const cand = [];
      for (const m of list) {
        if (Math.abs(m.dir) !== 1 || m.straight || m.detour) continue;
        const A = pos[m.a], B = pos[m.b], ax = m.H ? 'y' : 'x', as = m.H ? 'h' : 'w';
        const o0 = Math.max(A[ax], B[ax]) + 4, o1 = Math.min(A[ax] + A[as], B[ax] + B[as]) - 4;
        if (o1 < o0) continue;
        // A23: a bundled strand has no line of its own — only the pin's, if its
        // source face reaches it (the target face holds the pin there already)
        if (m.bundle) { const r = bundles[m.bundle][0]; if (!r.straight || r.s < o0 || r.s > o1) continue; cand.push({ m, v: r.s, len: o1 - o0, pinned: true }); continue; }
        cand.push({ m, v: Math.max(o0, Math.min(o1, (m.s + m.t) / 2)), len: o1 - o0 });
      }
      cand.sort((p, q) => q.m.count - p.m.count || q.len - p.len);
      const clash = (u, v) => (u || []).some(x => Math.abs(x - v) < P.pitch + 4);   // A20: 4 ≈ two half-strokes
      for (const { m, v, pinned } of cand) {
        if (clash(usedS[kS(m)], v) || (!pinned && clash(usedT[kT(m)], v))) continue;
        m.s = m.t = v; m.straight = true; if (!pinned) use(m, v); else (usedS[kS(m)] = usedS[kS(m)] || []).push(v);
      }
      const refan = (groups, prop, endOf) => {
        for (const k in groups) {
          const ms = groups[k], n = ms.length, N = pos[endOf(ms[0])], ax = ms[0].H ? 'y' : 'x', as = ms[0].H ? 'h' : 'w';
          if (!ms.some(m => m.straight) || ms.every(m => m.straight)) continue;
          let slots = ms.map((_, i) => N[ax] + N[as] * ((i + 1) / (n + 1)));
          for (const m of ms) if (m.straight) { let j = 0; for (let i = 1; i < slots.length; i++) if (Math.abs(slots[i] - m[prop]) < Math.abs(slots[j] - m[prop])) j = i; slots.splice(j, 1); }
          let i = 0;
          for (const m of ms) if (!m.straight) m[prop] = slots[i++];
        }
      };
      refan(bySrc, 's', m => m.a); refan(byTgt, 't', m => m.b);
    }
    syncT();
    // A11 detour geometry: the strand leaves through the gutter next to its own
    // card (channel 1, slotted with the others), runs along a line D clear of
    // every card between the two ends (with lanes: clockwise side, A16; else
    // the shorter side that stays inside the common box), and comes back
    // through the gutter before the target (channel 2). Strands sharing a D
    // line or a channel 2 spread by pitch. Inside a unit (A17) the D line stays
    // within the unit's margin, which grows to hold the stack (`sideNeed`).
    const sideNeed = {}, bandNeed = {};
    if (P.routed) {
      const PAD = 10; let dGroups = {}, c2Groups = {};
      const dirRects = Object.keys(pos).filter(id => this.T.type[id] === 'dir').map(id => pos[id]);
      for (const m of list) {
        if (!m.detour) continue;
        const cards = cardsOf(m.box), bl = this.blockers(m, pos, cards), ln = dirRule(m) ? this.laners(m, pos, cards) : [];
        if (!bl.length && !ln.length) { delete m.detour; continue; }
        const H = m.H, ax = H ? 'y' : 'x', as = H ? 'h' : 'w', px = H ? 'x' : 'y', ps = H ? 'w' : 'h';
        const A = pos[m.a], B = pos[m.b], cA = this.cardOf(m.a, m.box) || A, cB = this.cardOf(m.b, m.box) || B;
        const fwd = m.dir === 1, unitBox = this.T.type[m.box] === 'unit';
        // the span D runs along: between the two end cards
        const lo = Math.min(cA[px] + cA[ps], cB[px] + cB[ps]), hi = Math.max(cA[px], cB[px]);
        const between = cards.filter(c => c !== cA && c !== cB && c[px] < hi + 1 && c[px] + c[ps] > lo - 1);
        // D clears every card between the ends, and stays 8px off any directory
        // border it would otherwise run along.
        const dirs = dirRects.filter(d => d[px] < hi && d[px] + d[ps] > lo);
        const clear = (D, up) => {
          for (let i = 0; i < 30; i++) {
            const c = between.find(c => c[ax] < D && c[ax] + c[as] > D);
            if (c) { D = up ? c[ax] - PAD : c[ax] + c[as] + PAD; continue; }
            const d = dirs.find(d => Math.abs(d[ax] - D) < 8 || Math.abs(d[ax] + d[as] - D) < 8);
            if (!d) break;
            const e = Math.abs(d[ax] - D) < 8 ? d[ax] : d[ax] + d[as];
            D = up ? e - 8 : e + 8;
          }
          return D;
        };
        const minT = this.headLen(m.count) + P.minLeg, minS = Math.max(8, Math.round(P.minLeg / 3));
        const seed = bl.concat(ln), box = pos[m.box];
        let Dt = clear(Math.min(...seed.map(c => c[ax])) - PAD, true), Db = clear(Math.max(...seed.map(c => c[ax] + c[as])) + PAD, false);
        // A17: inside a unit the D line never leaves the unit (its margin grows instead)
        if (unitBox && box) { Dt = Math.max(Dt, box[ax] + (H ? UNIT_HEAD + this.ruleExtra() : 0) + 8); Db = Math.min(Db, box[ax] + box[as] - 8); }
        // A16 clockwise: forward over the top (H) / right of the cards (V),
        // backward under / left — the vertical layout is the horizontal one
        // rotated, not transposed, so the low-x side is the backward side.
        // A14b: only for an arrow ending at a whole unit; else the side where
        // the D line strays least from the two ends.
        const up0 = dirRule(m) ? (H ? fwd : !fwd) : Math.abs(m.s - Dt) + Math.abs(m.t - Dt) <= Math.abs(m.s - Db) + Math.abs(m.t - Db);
        // `_place(up)`: D line and channel ranges for one side (A25 may flip it)
        m._between = between; m._span = [lo, hi]; m._clear = clear;
        m._place = (up, base) => {
        m.D = base !== undefined ? base : up ? Dt : Db; m.up = up;
        // channel ranges: the gutter after the source card, the gutter before the target card
        const span = [Math.min(m.s, m.t, m.D), Math.max(m.s, m.t, m.D)];
        const inPath = c => c !== cA && c !== cB && c[ax] < span[1] && c[ax] + c[as] > span[0];
        const path = between.filter(inPath);
        const sRight = fwd;   // channel 1 sits right of the source card
        const sEdge = sRight ? cA[px] + cA[ps] : cA[px], tEdge = fwd ? cB[px] : cB[px] + cB[ps];
        let g1, g2 = null;
        if (sRight) {
          const wall = path.filter(c => c[px] >= sEdge - 1).map(c => c[px]);
          const far = wall.length ? Math.min(...wall) - PAD : tEdge - PAD;
          g1 = [Math.max(m.sp + minS, sEdge + 4), far];
        } else {
          const wall = path.filter(c => c[px] + c[ps] <= sEdge + 1).map(c => c[px] + c[ps]);
          g1 = [(wall.length ? Math.max(...wall) : tEdge) + PAD, Math.min(m.sp - minS, sEdge - 4)];
        }
        if (fwd) { const wall = path.filter(c => c[px] + c[ps] <= tEdge + 1).map(c => c[px] + c[ps]); g2 = [(wall.length ? Math.max(...wall) : sEdge) + PAD, Math.min(m.tp - minT, tEdge - 4)]; }
        else { const wall = path.filter(c => c[px] >= tEdge - 1).map(c => c[px]); g2 = [Math.max(m.tp + minT, tEdge + 4), (wall.length ? Math.min(...wall) : sEdge) - PAD]; }
        // a gutter too narrow for its channel collapses to its centre (A1's rule);
        // the A4 need then widens it for the second pass instead of dropping the detour
        const squeeze = g => { if (g && g[1] < g[0]) { const c = (g[0] + g[1]) / 2; g[0] = g[1] = c; m.tight = true; } };
        squeeze(g1); squeeze(g2);
        m.gap = g1; m.gap2 = g2;
        };
        m._place(up0);
      }
      const group = () => {
        dGroups = {}; c2Groups = {};
        for (const m of list) {
          if (!m.detour || !m._place) continue;
          const dk = m.box + '/' + (m.H ? 1 : 0) + '/' + (m.up ? 't' : 'b') + '/' + Math.round(m.D);
          (dGroups[dk] = dGroups[dk] || []).push(m);
          if (m.gap2) { const ck = m.box + '/' + (m.H ? 1 : 0) + '/' + m.dir + '/' + Math.round((m.gap2[0] + m.gap2[1]) / 2); (c2Groups[ck] = c2Groups[ck] || []).push(m); }
        }
      };
      const stack = sideNeed => {
      const G = [];
      for (const k in dGroups) {
        const ms = dGroups[k];
        // A13: on a D line, arrows going the same way stack by horizontal length,
        // the longest furthest outside (rightward above leftward when mixed); else by cost
        // tie (same columns): the arrow starting higher stays higher overall — for an
        // up-stack the last index is the highest, for a down-stack the lowest
        // A13 v3: a D line is a stack of nested brackets. Each strand spans the
        // wells it uses (channel 1 → channel 2); a bracket containing another
        // goes outside it, so neither has to cut the other's horizontal. Same
        // wells: the strand whose far end is deepest goes outside (it plunges
        // rightmost per v2 and nothing turns across it). Partial overlaps cross
        // whatever the order; they fall to length. Index 0 is the innermost.
        {
          const len = m => Math.abs(m.tp - m.sp), ws = m => (m.gap[0] + m.gap[1]) / 2, wt = m => m.gap2 ? (m.gap2[0] + m.gap2[1]) / 2 : m.tp;
          const depth = m => m.up ? Math.max(m.s, m.t) : -Math.min(m.s, m.t);
          const xs = [].concat(...ms.map(m => [ws(m), wt(m)])).sort((p, q) => p - q), ids = [];
          for (const x of xs) { const c = ids[ids.length - 1]; if (c && x - c.hi < 24) c.hi = x; else ids.push({ lo: x, hi: x }); }
          const wid = x => ids.findIndex(c => x >= c.lo - 1 && x <= c.hi + 1);
          for (const m of ms) { const a = wid(ws(m)), b = wid(wt(m)); m._lo = Math.min(a, b); m._hi = Math.max(a, b); }
          ms.sort((p, q) => (q.dir - p.dir) || (p.dir > 0 ? (p._hi - q._hi) || (q._lo - p._lo) : (q._lo - p._lo) || (p._hi - q._hi)) || (depth(p) - depth(q)) || (len(p) - len(q)));
        }
        let acc = 0;
        ms.forEach((m, i) => { if (i) acc += P.pitch + (ms[i - 1].w + m.w) / 2; m.D += (m.up ? -1 : 1) * acc; });
        G.push({ ms, acc });
      }
      // A13c (Session 39): the stacks of one box on one side keep pitch between
      // them. Each D line starts from its own blocking cards; card tops align,
      // bottoms do not, so under-stacks started at different depths and overlapped.
      // Stacks whose spans overlap are taken inner first; a later one whose band
      // comes within pitch of a placed one moves outward past it, whole.
      const bySide = {};
      for (const g of G) {
        const m0 = g.ms[0], s = m0.up ? -1 : 1;
        g.s = s; g.lo = Math.min(...g.ms.map(m => m._span[0])); g.hi = Math.max(...g.ms.map(m => m._span[1]));
        g.inner = Math.min(...g.ms.map(m => s * m.D - m.w / 2)); g.outer = Math.max(...g.ms.map(m => s * m.D + m.w / 2));
        const k = m0.box + '/' + (m0.H ? 1 : 0) + '/' + (m0.up ? 't' : 'b');
        (bySide[k] = bySide[k] || []).push(g);
      }
      for (const k in bySide) {
        const placed = [];
        for (const g of bySide[k].sort((p, q) => p.inner - q.inner)) {
          let sh = 0;
          for (;;) {
            let need = sh;
            for (const p of placed) if (p.lo < g.hi && g.lo < p.hi && g.inner + sh < p.outer + P.pitch && g.outer + sh > p.inner - P.pitch) need = Math.max(need, p.outer + P.pitch - g.inner);
            if (need <= sh) break;
            sh = need;
          }
          if (sh) { for (const m of g.ms) m.D += g.s * sh; g.inner += sh; g.outer += sh; g.acc += sh; }
          placed.push(g);
        }
      }
      // A17 side need: a unit's margin must hold PAD + the stack + 8px to its border
      for (const { ms, acc } of G) {
        const b0 = ms[0].box;
        if (this.T.type[b0] === 'unit') { const side = ms[0].up ? 'lo' : 'hi', w = Math.max(0, PAD + acc + 8 - UNIT_PAD); sideNeed[b0] = sideNeed[b0] || {}; sideNeed[b0][side] = Math.max(sideNeed[b0][side] || 0, w); }
      }
      };
      group();
      // A25 split stack (`router: split`; Session 29, user's rule). The detours
      // over a box's cards form one stack; its outer half is routed under the
      // cards instead, keeping its order projected symmetrically (outermost over
      // → outermost under, A13 v3 nesting re-sorted on the new side). The cut
      // falls between two bundles (A19), the one nearest the middle, so a
      // bundle's strands stay on one side.
      if (this.props.router === 'split') {
        stack({});
        const tops = {};
        for (const m of list) if (m.detour && m._place && m.up) (tops[m.box + '/' + (m.H ? 1 : 0)] = tops[m.box + '/' + (m.H ? 1 : 0)] || []).push(m);
        const flip = new Set();
        for (const k in tops) {
          const ms = tops[k].sort((p, q) => p.D - q.D), n = ms.length;   // outermost first
          if (n < 2) continue;
          const key = m => m.bundle || m.id;
          let cut = -1;
          for (let i = 1; i < n; i++) if (key(ms[i - 1]) !== key(ms[i]) && (cut < 0 || Math.abs(i - n / 2) < Math.abs(cut - n / 2))) cut = i;
          // a bundle split across the cut by the stack order moves whole
          if (cut > 0) { const keys = new Set(ms.slice(0, cut).map(key)); for (const m of ms) if (keys.has(key(m))) flip.add(m); }
        }
        for (const m of list) if (m._place) m._place(flip.has(m) ? false : m.up);
        group();
      }
      stack(sideNeed);
      // A11b: a D stack clears cards as a band. Its origin gap reports the band
      // as its need (second pass widens it); a band still hitting a card moves
      // past it and restacks. Directory-level stacks only (units: sideNeed).
      {
        const kidsOf = {}; for (const id in pos) { const p = this.T.parent[id] || '#root'; (kidsOf[p] = kidsOf[p] || []).push(id); }
        const gf = this.gapFinder(pos, kidsOf);
        for (let round = 0; round < 6; round++) {
          let moved = false;
          for (const k in dGroups) {
            const ms = dGroups[k], m0 = ms[0];
            if (this.T.type[m0.box] === 'unit' || !m0._span) continue;
            const H = m0.H, ax = H ? 'y' : 'x', as = H ? 'h' : 'w', px = H ? 'x' : 'y', ps = H ? 'w' : 'h';
            const b0 = Math.min(...ms.map(m => m.D - m.w / 2)) - 3, b1 = Math.max(...ms.map(m => m.D + m.w / 2)) + 3;
            const lo = Math.min(...ms.map(m => m._span[0])), hi = Math.max(...ms.map(m => m._span[1]));
            const cards = [...new Set([].concat(...ms.map(m => m._between)))];
            const hit = cards.filter(c => c[px] < hi && c[px] + c[ps] > lo && c[ax] < b1 && c[ax] + c[as] > b0);
            if (!hit.length) continue;
            if (round === 0) {
              const o = m0.up ? Math.max(...ms.map(m => m.D)) : Math.min(...ms.map(m => m.D)), need = Math.ceil(b1 - b0 + 2 * PAD);
              for (const c of hit) {
                const g = gf(H ? 'h' : 'v', o, c[px] + c[ps] / 2);
                if (!g || g.kind !== 'r') continue;
                const R = (bandNeed[g.box] = bandNeed[g.box] || {}), row = (R[g.i] = R[g.i] || {});
                row[g.j] = Math.max(row[g.j] || 0, need);
              }
            }
            const base = m0.up ? Math.min(...hit.map(c => c[ax])) - PAD : Math.max(...hit.map(c => c[ax] + c[as])) + PAD;
            for (const m of ms) m._base = m._clear(base, m.up);
            moved = true;
          }
          if (!moved) break;
          for (const m of list) if (m._place) m._place(m.up, m._base);
          group(); stack(sideNeed);
        }
      }
      // A19b on corner gaps (Session 32): a detour's trunk corner is its
      // channel 2, set only here, so the first A19b pass (on channel 1) could
      // not see it. Recluster each track on the gap its corner uses and clamp
      // those gaps to the cluster's intersection before any slotting.
      {
        const cg = m => m.detour && m.gap2 ? m.gap2 : m.gap, byT = {};
        for (const m of list) if (m.track && !m.straight && cg(m)) (byT[m.track] = byT[m.track] || []).push(m);
        for (const t in byT) {
          const ms = byT[t]; if (ms.length < 2) continue;
          const rest = ms.slice().sort((p, q) => cg(p)[1] - cg(q)[1]); let ci = 0;
          while (rest.length) {
            const x = cg(rest[0])[1], cl = rest.filter(m => cg(m)[0] <= x + 0.6 && cg(m)[1] >= x - 0.6);
            const lo = Math.max(...cl.map(m => cg(m)[0])), hi = Math.min(...cl.map(m => cg(m)[1]));
            for (const m of cl) { if (m.detour && m.gap2) m.gap2 = [lo, hi]; else m.gap = [lo, hi]; if (ci) m.track = t + '|k' + ci; rest.splice(rest.indexOf(m), 1); }
            ci++;
          }
        }
      }
      for (const k in c2Groups) {
        const all = c2Groups[k], seen = new Set(), ms = all.filter(m => !m.track || (seen.has(m.track) ? false : (seen.add(m.track), true))), n = ms.length;
        // channel 2 travels D → t: up-going strands left, down-going right (A13); else by D
        if (ms[0].H) ms.sort((p, q) => ((q.t < q.D ? 1 : 0) - (p.t < p.D ? 1 : 0)) || (p.D - q.D));
        else ms.sort((p, q) => p.D - q.D);
        const xs = this.spread(ms.map(m => m.wFinal), ms[0].gap2[0], ms[0].gap2[1], P.pitch);
        ms.forEach((m, i) => { m.mid2 = xs[i]; });
        for (const m of all) if (!ms.includes(m)) m.mid2 = ms.find(x => x.track === m.track).mid2;
      }
    }
    // Channel slots: arrows whose gaps overlap (same box, axis and direction)
    // share one channel group and take distinct, evenly spaced channels,
    // ordered to minimise crossings among themselves. Straight strands need no
    // channel: their mid is the gap centre and they take no track.
    const byKey = {};
    for (const m of list) {
      if (m.straight) { m.mid = (m.gap[0] + m.gap[1]) / 2; continue; }
      const k = m.box + '/' + (m.H ? 1 : 0) + '/' + m.dir; (byKey[k] = byKey[k] || []).push(m);
    }
    for (const k in byKey) {
      const ms = byKey[k].sort((p, q) => p.gap[0] - q.gap[0]);
      let cur = null;
      const grs = [];
      for (const m of ms) {
        if (cur && m.gap[0] < cur.hi - 12) { cur.list.push(m); cur.lo = Math.max(cur.lo, m.gap[0]); cur.hi = Math.min(cur.hi, m.gap[1]); }
        else { cur = { lo: m.gap[0], hi: m.gap[1], list: [m] }; grs.push(cur); }
      }
      for (const g of grs) {
        const all = g.list, seen = new Set();
        g.list = all.filter(m => !m.track || m.detour || (seen.has(m.track) ? false : (seen.add(m.track), true)));
        this.slotChannels(g, P.pitch, P.channels === 'shared');
        for (const m of all) if (!g.list.includes(m)) m.mid = g.list.find(x => x.track === m.track && !x.detour).mid;
        g.list = all;
      }
    }
    if (P.routed) { this.wellOrder(list, pos, P.pitch); this.faceOrder(list, bySrc, byTgt); syncT(); }
    this.noSwap(bySrc);
    syncX();
    // A4 gutter need: for every through-gutter channel group, the width its
    // tracks want at full pitch plus the two leg minima. Read by computeScene.
    // Directory gutters always; unit-internal layer gaps only with A10.
    const need = {};
    for (const k in byKey) {
      const ms = byKey[k].filter(m => !m.inCard); if (!ms.length) continue;   // A26 in-card U-turns need no margin
      const H = ms[0].H, c = ms[0].box, px = H ? 'x' : 'y', ps = H ? 'w' : 'h';
      const ct = this.T.type[c];
      // A17/A18: U-turn channels in a unit's margin — the margin grows to hold them
      if (Math.abs(ms[0].dir) === 2) {
        if (ct !== 'unit' || !this.openBox(c)) continue;
        // first pass: the margin is still bare, the gap collapsed to one line and every
        // strand shares the same mid — count strands, so the second pass has a track each
        const side = ms[0].dir < 0 ? 'lo' : 'hi', collapsed = ms[0].gap[1] - ms[0].gap[0] < 8, n = collapsed ? ms.length : new Set(ms.map(m => m.mid.toFixed(1))).size, hl = Math.max(...ms.map(m => this.headLen(m.count)));
        const sw = ms.reduce((a, m) => a + m.w, 0);
        const w = Math.max(0, 8 + P.pitch * (n + 1) + sw + hl + P.minLeg - UNIT_PAD);
        sideNeed[c] = sideNeed[c] || {}; sideNeed[c][side] = Math.max(sideNeed[c][side] || 0, w);
        continue;
      }
      if (Math.abs(ms[0].dir) !== 1) continue;
      if (!(c === '#root' || ct === 'dir' || ct === 'root' || (ct === 'unit' && this.openBox(c)))) continue;
      const kids = Object.keys(pos).filter(id => (this.T.parent[id] || '#root') === c);
      const cols = [];
      for (const id of kids.sort((p, q) => pos[p][px] - pos[q][px])) {
        const r = pos[id], last = cols[cols.length - 1];
        if (last && Math.abs(last.x0 - r[px]) < 2) last.x1 = Math.max(last.x1, r[px] + r[ps]);
        else cols.push({ x0: r[px], x1: r[px] + r[ps] });
      }
      const byGut = {};
      for (const m of ms) for (const mid of m.detour && m.gap2 ? [(m.gap[0] + m.gap[1]) / 2, (m.gap2[0] + m.gap2[1]) / 2] : [(m.gap[0] + m.gap[1]) / 2]) { const i = cols.findIndex((col, j) => j < cols.length - 1 && mid >= col.x1 - 1 && mid <= cols[j + 1].x0 + 1); if (i >= 0) (byGut[i] = byGut[i] || []).push(m); }
      for (const i in byGut) {
        const hl = Math.max(...byGut[i].map(m => this.headLen(m.count)));
        // A20: the tracks' own widths join the need (a track: its widest strand)
        const byMid = {}; for (const m of byGut[i]) { const k = m.mid.toFixed(1); byMid[k] = Math.max(byMid[k] || 0, m.detour ? m.w : m.wFinal); }
        const n = Object.keys(byMid).length, sw = Object.values(byMid).reduce((a, b) => a + b, 0);
        const w = P.pitch * (n + 1) + sw + hl + P.minLeg + Math.max(8, Math.round(P.minLeg / 3)) + 8;
        need[c] = need[c] || {}; need[c][i] = Math.max(need[c][i] || 0, w);
      }
    }
    this.gutterNeed = need; this.sideNeed = sideNeed; this.rowNeed = Object.keys(bandNeed).length ? bandNeed : null;
    root.__mapEdges = list; root.__map = this;   // debug hooks for routing analysis
    for (const m of list) {
      const { s, t, sp, tp, mid, mid2, D } = m;
      if (m.detour) m.pts = m.H ? [[sp, s], [mid, s], [mid, D], [mid2, D], [mid2, t], [tp, t]] : [[s, sp], [s, mid], [D, mid], [D, mid2], [t, mid2], [t, tp]];
      else m.pts = m.H ? [[sp, s], [mid, s], [mid, t], [tp, t]] : [[s, sp], [s, mid], [t, mid], [t, tp]];
    }
    return list;
  },
  // A11 helpers. An *open box* is a container whose top-level kids are routed
  // as cards: the root and every open directory; with A17 (`insideUnits`)
  // every open, unfused unit too (its cards are its layers and nested units).
  // A *card* is a top-level kid of an open box: what the user reads as a box.
  // Graph router (knob `router: graph`, docs/graph-router.md G1–G5). Builds each
  // strand's obstacle set — the cards at every level of its path, from its
  // common box down to both ends — and hands everything to graph-router.js.
  // G5: corridors that are directory gaps (column gutters, gaps between boxes
  // in a column) report their need; the second layout pass sizes them.
  graphRoute(list, pos, P) {
    const H = this.dirH(), par = id => this.T.parent[id] || '#root';
    const kids = {}; for (const id in pos) (kids[par(id)] = kids[par(id)] || []).push(id);
    const up = id => { const out = []; let p = this.T.parent[id]; while (p) { out.push(p); p = this.T.parent[p]; } out.push('#root'); return out; };
    const bbox = ids => { const rs = ids.map(i => pos[i]).filter(Boolean); if (!rs.length) return null; const x0 = Math.min(...rs.map(r => r.x)), y0 = Math.min(...rs.map(r => r.y)), x1 = Math.max(...rs.map(r => r.x + r.w)), y1 = Math.max(...rs.map(r => r.y + r.h)); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; };
    const boundCache = {};
    const boundOf = box => boundCache[box] || (boundCache[box] = (() => {
      const kb = bbox(kids[box] || []) || { x: 0, y: 0, w: 1, h: 1 }, m = box === '#root' ? 48 : 12;
      const b = { x: kb.x - m, y: kb.y - m, w: kb.w + 2 * m, h: kb.h + 2 * m }, r = pos[box];
      if (!r) return b;
      const x0 = Math.max(b.x, r.x + 2), y0 = Math.max(b.y, r.y + 2), x1 = Math.min(b.x + b.w, r.x + r.w - 2), y1 = Math.min(b.y + b.h, r.y + r.h - 2);
      return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
    })());
    const gaps = this.gapFinder(pos, kids);
    const pen = H ? { src: { r: 0, t: 25, b: 25, l: 45 }, tgt: { l: 0, t: 25, b: 25, r: 45 } } : { src: { b: 0, l: 25, r: 25, t: 45 }, tgt: { t: 0, l: 25, r: 25, b: 45 } };
    const strands = [];
    for (const m of list) {
      const box0 = m.box || '#root', ua = up(m.a), ub = up(m.b);
      const allowed = new Set([...ua, ...ub, m.a, m.b]);
      // the strand's problem inside `box`: its bound and the cards at every level of its path
      const at = box => {
        const below = u => { const i = u.indexOf(box); return i < 0 ? u : u.slice(0, i); };
        const ob = new Set();
        for (const X of [box, ...below(ua), ...below(ub)]) for (const k of kids[X] || []) if (!allowed.has(k)) ob.add(k);
        const ids = [...ob].sort();
        return { obst: ids.map(i => pos[i]), bound: boundOf(box), sig: box + '::' + ids.join(',') };
      };
      // fallbacks: a box too tight to route in (a band's 9px gaps) hands the strand to its parent
      const alts = []; for (let b = box0, n = 0; b !== '#root' && n < 3; n++) { b = par(b); alts.push(at(b)); }
      const rowFaces = f => this.T.type[f] === 'member' ? ['r', 'l'] : ['r', 'l', 't', 'b'];
      strands.push({
        id: m.id, A: pos[m.a], B: pos[m.b], ...at(box0), alts,
        srcFaces: rowFaces(m.a), tgtFaces: rowFaces(m.b), facePen: pen,
        sw: Math.min(4, 1.3 + Math.log2(m.count)), minS: Math.max(8, Math.round(P.minLeg / 3)), minT: this.headLen(m.count) + P.minLeg,
      });
    }
    // the sizing pass only needs uncontested routes; negotiation runs on the final layout
    const out = root.GraphRouter.route(strands, { pitch: P.pitch, iters: this.routePass === 1 ? 1 : 3, resizable: (o, c, along) => !!gaps(o, c, along) });
    this.graphMs = out.ms; root.__graph = { strands, out };
    const need = {}, rowNeed = {};
    for (const g of out.groups) {
      const k = gaps(g.orient, (g.L + g.R) / 2, (g.lo + g.hi) / 2);
      if (!k) continue;
      if (k.kind === 'g') { const w = g.need + P.minLeg + 20; need[k.box] = need[k.box] || {}; need[k.box][k.i] = Math.max(need[k.box][k.i] || 0, w); }
      else { rowNeed[k.box] = rowNeed[k.box] || {}; const r = rowNeed[k.box][k.i] = rowNeed[k.box][k.i] || {}; r[k.j] = Math.max(r[k.j] || 0, g.need + P.minLeg + 12); }
    }
    this.gutterNeed = need; this.sideNeed = {}; this.rowNeed = rowNeed;
    const ax = H ? 'x' : 'y', as = H ? 'w' : 'h';
    for (const m of list) {
      const r = out.res.get(m.id), A = pos[m.a], B = pos[m.b];
      m.pts = r && r.out ? r.out : (H ? [[A.x + A.w, A.y + A.h / 2], [B.x, B.y + B.h / 2]] : [[A.x + A.w / 2, A.y + A.h], [B.x + B.w / 2, B.y]]);
      m.straight = m.pts.length === 2; m.bundle = null; m.track = null; m.H = H;
      m.dir = B[ax] + B[as] / 2 < A[ax] + A[as] / 2 - 8 ? -1 : 1;
    }
    root.__mapEdges = list;
    return list;
  },
  // The directory gaps a layout pass can widen: per open dir/root box, the
  // gutters between its rank columns (kind 'g', index i) and the gaps between
  // boxes of one column (kind 'r', column i, slot j). Deepest box wins.
  gapFinder(pos, kids) {
    const H = this.dirH(), px = H ? 'x' : 'y', ps = H ? 'w' : 'h', qx = H ? 'y' : 'x', qs = H ? 'h' : 'w';
    const boxes = [];
    const rowBoxes = [];
    for (const c in kids) {
      const t = c === '#root' ? 'root' : this.T.type[c];
      // G5b: a unit (stacked), hexagon, band or group lays its kids in rows:
      // gaps between rows (kind 'g', row i) and between kids of a row ('r', i, j)
      if (t !== 'root' && t !== 'dir' && pos[c] && kids[c].length > 1 && (t !== 'unit' || H)) {
        const ks = kids[c].map(id => pos[id]).filter(Boolean).sort((p, q) => p.y - q.y || p.x - q.x), rows = [];
        for (const r of ks) { const l = rows[rows.length - 1]; if (l && Math.abs(l.y0 - r.y) < 2) { l.ks.push(r); l.y1 = Math.max(l.y1, r.y + r.h); } else rows.push({ y0: r.y, y1: r.y + r.h, ks: [r] }); }
        for (const row of rows) row.ks.sort((p, q) => p.x - q.x);
        let d = 0; for (let p = this.T.parent[c]; p; p = this.T.parent[p]) d++;
        rowBoxes.push({ c, R: pos[c], rows, d });
        continue;
      }
      if (!(t === 'root' || t === 'dir') || !this.openBox(c)) continue;
      // Shelves (fit to view): kids clustered by their extent across the flow;
      // columns per shelf, concatenated in shelf order (= rank order).
      const byQ = kids[c].map(id => pos[id]).filter(Boolean).sort((p, q) => p[qx] - q[qx]), shelves = [];
      for (const r of byQ) { const l = shelves[shelves.length - 1]; if (l && r[qx] <= l.q1 + 1) { l.q1 = Math.max(l.q1, r[qx] + r[qs]); l.ks.push(r); } else shelves.push({ q0: r[qx], q1: r[qx] + r[qs], ks: [r] }); }
      const cols = [];
      shelves.forEach((sh, si) => {
        const ks = sh.ks.sort((p, q) => p[px] - q[px]), n0 = cols.length;
        for (const r of ks) { const l = cols.length > n0 ? cols[cols.length - 1] : null; if (l && Math.abs(l.x0 - r[px]) < 2) { l.x1 = Math.max(l.x1, r[px] + r[ps]); l.ks.push(r); } else cols.push({ x0: r[px], x1: r[px] + r[ps], ks: [r], sh: si, q0: sh.q0, q1: sh.q1 }); }
      });
      for (const col of cols) col.ks.sort((p, q) => p[qx] - q[qx]);
      let d = 0; for (let p = this.T.parent[c]; p; p = this.T.parent[p]) d++;
      boxes.push({ c, R: pos[c], cols, d: c === '#root' ? -1 : d });
    }
    boxes.sort((a, b) => b.d - a.d); rowBoxes.sort((a, b) => b.d - a.d);
    const inR = (R, x, y) => !R || (x >= R.x && x <= R.x + R.w && y >= R.y && y <= R.y + R.h);
    const inRows = (o, c, along) => {
      const x = o === 'v' ? c : along, y = o === 'v' ? along : c;
      for (const b of rowBoxes) {
        if (!inR(b.R, x, y)) continue;
        if (o === 'h') { for (let i = 0; i + 1 < b.rows.length; i++) if (y >= b.rows[i].y1 - 1 && y <= b.rows[i + 1].y0 + 1) return { box: b.c, kind: 'g', i }; }
        else for (let i = 0; i < b.rows.length; i++) { const row = b.rows[i]; if (y < row.y0 - 1 || y > row.y1 + 1) continue; for (let j = 0; j + 1 < row.ks.length; j++) if (x >= row.ks[j].x + row.ks[j].w - 1 && x <= row.ks[j + 1].x + 1) return { box: b.c, kind: 'r', i, j }; }
      }
      return null;
    };
    // o: corridor orientation ('v' runs along y); c: its centre line; along: a point on it
    return (o, c, along) => {
      const inner = inRows(o, c, along); if (inner) return inner;
      const across = (o === 'v') === H;   // a corridor running across the flow sits between columns
      const x = H ? (o === 'v' ? c : along) : (o === 'v' ? c : along), y = H ? (o === 'v' ? along : c) : (o === 'v' ? along : c);
      for (const b of boxes) {
        if (!inR(b.R, x, y)) continue;
        const f = H ? x : y, q = H ? y : x;
        if (across) { for (let i = 0; i + 1 < b.cols.length; i++) { const A = b.cols[i]; if (A.sh === b.cols[i + 1].sh && q >= A.q0 - 1 && q <= A.q1 + 1 && f >= A.x1 - 1 && f <= b.cols[i + 1].x0 + 1) return { box: b.c, kind: 'g', i }; } }
        else for (let i = 0; i < b.cols.length; i++) { const col = b.cols[i]; if (f < col.x0 - 1 || f > col.x1 + 1 || q < col.q0 - 1 || q > col.q1 + 1) continue; for (let j = 0; j + 1 < col.ks.length; j++) if (q >= col.ks[j][qx] + col.ks[j][qs] - 1 && q <= col.ks[j + 1][qx] + 1) return { box: b.c, kind: 'r', i, j }; }
      }
      return null;
    };
  },
  openBox(id) {
    if (id === '#root') return true;
    const t = this.T.type[id], p = this.paint[id];
    if (p && p.type === 'fold') return false;
    if (t === 'dir' || t === 'root') return true;
    return !!this.routeUnits && this.activeUnits.has(id) && t === 'unit' && !!p && (p.type === 'unit' || p.type === 'driver') && !p.fused;
  },
  // the card of `id` at the level of `box`: the ancestor of id whose parent is box
  // the id of that card (A19b): same walk, the id instead of the rect
  cardIdOf(id, box) {
    let cur = id;
    while (cur) { const p = this.T.parent[cur] || '#root'; if (p === box) return cur; if (p === '#root') return null; cur = p; }
    return null;
  },
  cardOf(id, box) {
    let cur = id;
    while (cur) { const p = this.T.parent[cur] || '#root'; if (p === box) return this.frameRects ? this.frameRects[cur] : null; if (p === '#root') return null; cur = p; }
    return null;
  },
  // Cards (not the two the strand ends in) that intersect the strand's Z bounding
  // box: between the two end cards along the axis (a leg inside an end card is
  // inside its own card), within the band of its two lines.
  // A card in the band is a blocker only if no channel position within the Z's
  // gap dodges it: a card crossing the source line forbids every channel past
  // it, a card crossing the target line every channel before it, a card between
  // the lines its own width (8px clear each side). When a free stretch of the
  // gap survives, the gap shrinks to it (the stretch holding the old centre,
  // else the widest) and the strand stays a Z — a column-mate wider than the
  // source card used to force a detour (Session 19).
  blockers(m, pos, cards) {
    const H = m.H, ax = H ? 'y' : 'x', as = H ? 'h' : 'w', px = H ? 'x' : 'y', ps = H ? 'w' : 'h';
    const cA = this.cardOf(m.a, m.box) || pos[m.a], cB = this.cardOf(m.b, m.box) || pos[m.b];
    const lo = Math.min(cA[px] + cA[ps], cB[px] + cB[ps]), hi = Math.max(cA[px], cB[px]), ylo = Math.min(m.s, m.t) - 4, yhi = Math.max(m.s, m.t) + 4;
    const band = cards.filter(c => c !== cA && c !== cB && c[px] < hi - 1 && c[px] + c[ps] > lo + 1 && c[ax] < yhi && c[ax] + c[as] > ylo);
    if (!band.length || !m.gap) return band;
    const fwd = m.dir === 1, INF = 1e9, forbid = [];
    for (const c of band) {
      const onS = c[ax] < m.s + 4 && c[ax] + c[as] > m.s - 4, onT = c[ax] < m.t + 4 && c[ax] + c[as] > m.t - 4;
      const l = c[px] - 8, r = c[px] + c[ps] + 8;
      if (onS) forbid.push(fwd ? [l, INF] : [-INF, r]);
      if (onT) forbid.push(fwd ? [-INF, r] : [l, INF]);
      if (!onS && !onT) forbid.push([l, r]);
    }
    let free = [[m.gap[0], m.gap[1]]];
    for (const [a, b] of forbid) free = free.flatMap(([x, y]) => (b <= x || a >= y) ? [[x, y]] : [[x, Math.min(y, a)], [Math.max(x, b), y]].filter(([p, q]) => q >= p));
    if (!free.length) return band;
    const c0 = (m.gap[0] + m.gap[1]) / 2;
    m.gap = free.find(([x, y]) => x <= c0 && c0 <= y) || free.reduce((w, f) => f[1] - f[0] > w[1] - w[0] ? f : w);
    return [];
  },
  // A14 lanes: horizontal travel carries direction — a line under a card is
  // leftward, a line over a card rightward. For a Z, a card between the end
  // cards that the strand would pass on the wrong side (forward: card fully
  // above the run; backward: fully below) forbids the channel positions that
  // make that run pass it (the target run when the channel is before the card,
  // the source run when after). Like A11, the gap shrinks to a surviving free
  // stretch; when none survives the cards are returned and the strand detours
  // on its own side (over for forward, under for backward).
  laners(m, pos, cards) {
    const H = m.H, ax = H ? 'y' : 'x', as = H ? 'h' : 'w', px = H ? 'x' : 'y', ps = H ? 'w' : 'h';
    const cA = this.cardOf(m.a, m.box) || pos[m.a], cB = this.cardOf(m.b, m.box) || pos[m.b];
    const lo = Math.min(cA[px] + cA[ps], cB[px] + cB[ps]), hi = Math.max(cA[px], cB[px]);
    const fwd = m.dir === 1, INF = 1e9, forbid = [], out = [], cw = H ? fwd : !fwd;   // A16: V is H rotated
    const wrong = (c, y) => cw ? c[ax] + c[as] <= y - 4 : c[ax] >= y + 4;
    // a column-mate of an end card (overlapping it along the axis) is exempt:
    // the stub leaving or entering its own column cannot avoid it, and a line
    // emerging from the neighbour card carries no lane meaning
    const mate = c => (c[px] < cA[px] + cA[ps] && c[px] + c[ps] > cA[px]) || (c[px] < cB[px] + cB[ps] && c[px] + c[ps] > cB[px]);
    for (const c of cards) {
      if (c === cA || c === cB || c[px] >= hi - 1 || c[px] + c[ps] <= lo + 1 || mate(c)) continue;
      const onT = wrong(c, m.t), onS = wrong(c, m.s);
      if (!onT && !onS) continue;
      out.push(c);
      const l = c[px] - 8, r = c[px] + c[ps] + 8;
      if (onT) forbid.push(fwd ? [-INF, r] : [l, INF]);
      if (onS) forbid.push(fwd ? [l, INF] : [-INF, r]);
    }
    if (!out.length || !m.gap) return out;
    let free = [[m.gap[0], m.gap[1]]];
    for (const [a, b] of forbid) free = free.flatMap(([x, y]) => (b <= x || a >= y) ? [[x, y]] : [[x, Math.min(y, a)], [Math.max(x, b), y]].filter(([p, q]) => q >= p));
    if (!free.length) return out;
    const c0 = (m.gap[0] + m.gap[1]) / 2;
    m.gap = free.find(([x, y]) => x <= c0 && c0 <= y) || free.reduce((w, f) => f[1] - f[0] > w[1] - w[0] ? f : w);
    return [];
  },
  // A13 v3 face order: once channels are placed, the slots on a face are
  // permuted so no line turning into (or out of) the face cuts a neighbour's
  // vertical. Entering from the left: lines coming down take the top slots,
  // the furthest channel highest; lines coming up take the bottom slots, the
  // nearest channel highest. Leaving to the right: lines going up take the
  // top slots, nearest highest; lines going down the bottom, furthest highest.
  // Mirrored for the other side. Straight strands keep their pinned slot;
  // only the movable strands' existing slots are redistributed.
  faceOrder(list, bySrc, byTgt) {
    const perm = (ms, prop, key) => {
      const mv = ms.filter(m => !m.straight && Math.abs(m.dir) === 1);
      if (mv.length < 2) return;
      const V = !mv[0].H, slots = mv.map(m => m[prop]).sort((a, b) => V ? b - a : a - b);   // A16: V mirrors the along-face axis
      mv.sort((p, q) => { const a = key(p), b = key(q); return a[0] - b[0] || a[1] - b[1]; });
      mv.forEach((m, i) => { m[prop] = slots[i]; });
    };
    for (const k in byTgt) perm(byTgt[k], 't', m => {
      const x = m.detour && m.gap2 ? m.mid2 : m.mid, from = m.detour ? m.D : m.s, down = m.H ? from < m.t : from > m.t, left = m.dir === 1;
      return down ? [0, left ? -x : x] : [1, left ? x : -x];
    });
    for (const k in bySrc) perm(bySrc[k], 's', m => {
      const x = m.mid, to = m.detour ? m.D : m.t, up = m.H ? to < m.s : to > m.s, right = m.dir === 1;
      return up ? [0, right ? x : -x] : [1, right ? -x : x];
    });
  },
  // A22 no swap between two faces: strands of one source face that reach one
  // target face keep, among themselves, the order of their target slots. The
  // faceOrder perms sort each face by channel position independently; two
  // same-pair strands of different families run in channels a few px apart
  // and can come out inverted — an X in the gutter. Runs after the bundle
  // sync (a member's final `t` is its representative's). Source slots are
  // reassigned in `t` order; the set of slots the group holds is unchanged.
  noSwap(bySrc) {
    for (const k in bySrc) {
      const byT = {};
      for (const m of bySrc[k]) if (!m.straight && Math.abs(m.dir) === 1 && !m.detour) (byT[m.b] = byT[m.b] || []).push(m);
      for (const b in byT) {
        const ms = byT[b]; if (ms.length < 2) continue;
        const slots = ms.map(m => m.s).sort((p, q) => p - q);
        ms.sort((p, q) => p.t - q.t).forEach((m, i) => { m.s = slots[i]; });
      }
    }
  },
  // A13 v2 (`trackOrderV2`): every channel segment running through one well
  // (the gutter between two columns of a box) is one sort group, whatever
  // strand it belongs to and whichever channel of a detour it is. Only the
  // segment itself counts: up-going segments sort left, the one climbing
  // highest leftmost; down-going right, the one plunging from highest
  // rightmost; backward strands flip both (length breaks ties). Tracks are then spread evenly
  // across the intersection of the segments' own gaps. A segment outside any
  // well keeps its v1 track.
  wellOrder(list, pos, pitch) {
    const cols = {};
    const columns = (c, px, ps) => {
      if (cols[c]) return cols[c];
      const kids = Object.keys(pos).filter(id => (this.T.parent[id] || '#root') === c).sort((p, q) => pos[p][px] - pos[q][px]);
      const out = [];
      for (const id of kids) {
        const r = pos[id], last = out[out.length - 1];
        if (last && Math.abs(last.x0 - r[px]) < 2) last.x1 = Math.max(last.x1, r[px] + r[ps]);
        else out.push({ x0: r[px], x1: r[px] + r[ps] });
      }
      return (cols[c] = out);
    };
    const wells = {};
    const add = (m, key, x, a, b, gap) => {
      const px = m.H ? 'x' : 'y', ps = m.H ? 'w' : 'h', cs = columns(m.box, px, ps);
      const i = cs.findIndex((col, j) => j < cs.length - 1 && x >= col.x1 - 1 && x <= cs[j + 1].x0 + 1);
      if (i < 0) return;
      const k = m.box + '/' + (m.H ? 1 : 0) + '/' + i;
      // A16: in the vertical layout the along-axis is mirrored (rotation, not transposition)
      (wells[k] = wells[k] || []).push({ m, key, gap, up: m.H ? b < a : b > a, len: Math.abs(b - a), top: m.H ? Math.min(a, b) : -Math.max(a, b), dir: m.dir || 1 });
    };
    for (const m of list) {
      if (m.straight) continue;
      if (m.detour) {
        add(m, 'mid', m.mid, m.s, m.D, m.gap);
        if (m.gap2) add(m, 'mid2', m.mid2, m.D, m.t, m.gap2);
      } else add(m, 'mid', m.mid, m.s, m.t, m.gap);
    }
    for (const k in wells) {
      // A19: a bundle's final segments are one segment (union of their spans)
      const seen = {}, extra = [];
      const segs = wells[k].filter(sg => {
        if (!sg.m.track || sg.key !== (sg.m.gap2 ? 'mid2' : 'mid')) return true;
        const r = seen[sg.m.track];
        if (r) { extra.push([sg, r]); r.top = Math.min(r.top, sg.top); r.len = Math.max(r.len, sg.len); return false; }
        seen[sg.m.track] = sg; return true;
      });
      const n = segs.length, finish = () => { for (const [sg, r] of extra) sg.m[sg.key] = r.m[r.key]; };
      if (n < 2) { finish(); continue; }
      const lo = Math.max(...segs.map(s => s.gap[0])), hi = Math.min(...segs.map(s => s.gap[1]));
      if (hi - lo < 8) { finish(); continue; }
      // by the height a segment reaches or comes from: up-going, the one
      // climbing highest leftmost; down-going, the one plunging from highest
      // rightmost (it must not be crossed by the lower lines still travelling).
      // Backward strands flip both.
      segs.sort((p, q) => ((q.up ? 1 : 0) - (p.up ? 1 : 0)) || (p.up ? p.dir * (p.top - q.top) : p.dir * (q.top - p.top)) || (p.up ? q.len - p.len : p.len - q.len));
      const xs = this.spread(segs.map(sg => sg.key === (sg.m.gap2 ? 'mid2' : 'mid') ? sg.m.wFinal : sg.m.w), lo, hi, pitch);
      segs.forEach((s, i) => { s.m[s.key] = xs[i]; });
      finish();
    }
  },
  slotChannels(g, pitch, shared) {
    const n = g.list.length;
    if (g.hi - g.lo < 8) { for (const m of g.list) m.mid = (m.gap[0] + m.gap[1]) / 2; return; }
    if (n === 1) { g.list[0].mid = (g.lo + g.hi) / 2; return; }
    const pts = (m, mid) => m.H ? [[m.sp, m.s], [mid, m.s], [mid, m.t], [m.tp, m.t]] : [[m.s, m.sp], [m.s, mid], [m.t, mid], [m.t, m.tp]];
    const segX = (p1, p2, q1, q2) => {
      const d = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      const d1 = d(q1, q2, p1), d2 = d(q1, q2, p2), d3 = d(p1, p2, q1), d4 = d(p1, p2, q2);
      return d1 * d2 < 0 && d3 * d4 < 0;
    };
    const cross = (a, b) => {   // crossings when a takes the lower channel and b the upper
      const P = pts(a, g.lo + 1), Q = pts(b, g.hi - 1);
      let n = 0;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (segX(P[i], P[i + 1], Q[j], Q[j + 1])) n++;
      return n;
    };
    g.list.sort((p, q) => (cross(p, q) - cross(q, p)) || (p.s - q.s));
    // A13 trackOrder: in a vertical gutter, strands whose channel travels up
    // sort left, strands travelling down sort right (crossing order within).
    if (g.list[0].H) { const up = m => (m.detour ? m.D : m.t) < m.s; g.list.sort((p, q) => (up(q) ? 1 : 0) - (up(p) ? 1 : 0)); }
    // A13, U-turn channels (dir ±2, the strand's far side): the longer the run
    // between the two ends, the further outside its track.
    if (Math.abs(g.list[0].dir) === 2) { const len = m => Math.abs(m.t - m.s), out = g.list[0].dir > 0 ? 1 : -1; g.list.sort((p, q) => out * (len(p) - len(q))); }
    // A9 shared tracks: in crossing order, each strand takes the lowest track
    // whose spans along the gutter stay 16px clear of its own (first-fit
    // interval colouring, the left-edge idea). Off: one track per strand.
    let tracks = n, at = g.list.map((_, i) => i);
    if (shared) {
      const spans = [];
      at = g.list.map(m => {
        const lo = Math.min(m.s, m.t) - 16, hi = Math.max(m.s, m.t) + 16;
        let j = spans.findIndex(sp => !sp.some(([a, b]) => lo < b && hi > a));
        if (j < 0) { j = spans.length; spans.push([]); }
        spans[j].push([lo, hi]);
        return j;
      });
      tracks = spans.length;
    }
    // A20: a track is as wide as its widest strand (a bundled Z's mid is its trunk)
    const tw = Array.from({ length: tracks }, () => 0);
    g.list.forEach((m, i) => { tw[at[i]] = Math.max(tw[at[i]], m.detour ? m.w : m.wFinal); });
    const xs = this.spread(tw, g.lo, g.hi, pitch);
    g.list.forEach((m, i) => { m.mid = xs[at[i]]; });
  },
  // A20: centres for strokes of the given widths laid side by side in [lo, hi],
  // `pitch` clear between neighbours, the run centred; a run too wide for the
  // range squeezes its gaps evenly (never below 1px).
  spread(ws, lo, hi, pitch) {
    const n = ws.length; if (!n) return [];
    const sum = ws.reduce((a, b) => a + b, 0), room = hi - lo;
    const gap = n > 1 ? Math.max(1, Math.min(pitch, (room - sum) / (n + 1))) : 0;
    const total = sum + gap * (n - 1);
    let x = (lo + hi) / 2 - total / 2;
    return ws.map(w => { const c = x + w / 2; x += w + gap; return c; });
  },
  };
  root.MapRouter = { methods, bind(C) { ({ UNIT_PAD, UNIT_HEAD } = C); } };
})(typeof window !== 'undefined' ? window : globalThis);
