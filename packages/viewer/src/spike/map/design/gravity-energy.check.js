// Headless comparison of the gravity energies on deblob-seq, layers stop.
// Run from run_script: new Function('readFile','log', await readFile('gravity-energy.check.js'))(readFile, log)
// (returns a promise). Prints per energy: ms, overlaps between non-nested
// boxes, extent, cluster ratio (docs/gravity-model.md "Energies").
return (async () => {
  const root = {};
  for (const f of ['place-sandbox.js', 'gravity-layout.js']) { let src = await readFile(f); const i = src.lastIndexOf('})('); src = src.slice(0, i) + '})(root);'; new Function('root', src)(root); }
  const gs = (await readFile('data/deblob-seq-graph.js')).replace(/^export const /gm, 'var ');
  const g = new Function(gs + '; return { meta, initialCollapsed, containers, items, edges };')();
  const M = root.PlaceSandbox.prepare(g);
  const opts = { spread: 110, cohesion: 0.6, gap: 28, stability: 0, orbit: 0.5, flow: false };
  const T = root.PlaceSandbox.ideal(M, opts);
  const folded = new Set([...M.nodes.values()].filter(n => n.type === 'layer').map(n => n.id));
  const clusters = new Set(); for (const n of M.nodes.values()) if (n.type === 'dir' && (M.leafIdx.get(n.id) || []).length < M.leaves.length) clusters.add(n.id);
  const anc = id => { const a = []; for (let p = id; p && M.nodes.has(p); p = M.nodes.get(p).parent) a.push(p); return a; };
  const out = {};
  for (const [energy, K, dg, lam, mass] of [['stress', 1], ['metric', 1], ['linlog', 1, 'all', 1, 0], ['linlog', 1, 'all', 1, 0.5], ['linlog', 1, 'all', 1, 1], ['linlog', 1, 'all', 0.5, 1]]) {
    let rep; const t0 = performance.now();
    const L = root.GravityLayout.layout(M, T, folded, { ...opts, dirs: false, clusters, showStars: true, galaxy: K, groupGap: lam ?? 1, energy, llDegree: dg, llMass: mass ?? 0, report: r => rep = r });
    const ms = performance.now() - t0;
    const ids = [...L.keys()], R = ids.map(id => L.get(id)); let ov = 0;
    for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const a = R[i], b = R[j]; if (anc(ids[i]).includes(ids[j]) || anc(ids[j]).includes(ids[i])) continue; if (a.w && b.w && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) ov++; }
    const xs = R.map(r => r.x), ys = R.map(r => r.y), xe = R.map(r => r.x + r.w), ye = R.map(r => r.y + r.h);
    log(`${energy} K=${K} ${dg || ''} λ=${lam ?? 1} mass=${mass ?? 0}: ${Math.round(ms)} ms, ${R.length} nodes, ${ov} overlaps, extent ${Math.round(Math.max(...xe) - Math.min(...xs))}x${Math.round(Math.max(...ye) - Math.min(...ys))}, ratio mean ${rep.mean.toFixed(2)}, proj move ${Math.round(rep.proj)} px · ` + rep.rows.map(x => `${x.id.split('/').pop()} ${x.ratio.toFixed(2)} (${x.n}, own ${Math.round(x.own)}, foreign ${Math.round(x.foreign)})`).join(' · '));
    out[energy + K + (dg || '') + (mass ?? 0)] = L;
  }
  return out;
})();
