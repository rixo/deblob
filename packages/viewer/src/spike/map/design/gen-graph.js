// Snapshot → map graph module source. Rules: DECISIONS Session 3, 6, 28.
// Reproduces deblob-fine-graph.js exactly from deblob.fine.snapshot.json.
// Module pattern (host contract, FROM-DEBLOB ask 2 + 5): sets root.GenGraph =
// { buildGraph, genGraph }; the two globals stay for old run_script callers.
//   buildGraph(S, opts) → { meta, initialCollapsed, containers, items, edges }
//   genGraph(S, opts)   → the graph module's JS source (same bytes as before)
//   opts.initialCollapsed, opts.header (comment lines), opts.hooks (add driver hooks as items),
//   opts.breadcrumb (meta.breadcrumb; default S.project.name — code names no real project)
(function (root) {
function buildGraph(S, opts) {
  opts = opts || {};
  const dirname = p => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');
  const base = p => p.slice(p.lastIndexOf('/') + 1);
  // layers the map has no group for are drawn as assembly (tests were assembly in the fine snapshot)
  const groupOf = l => (l === 'test' ? 'assembly' : l);
  const plain = l => l === 'assembly' || l === 'test' || l === 'driver';
  const cOf = m => {
    if (m.serviceRoot) return m.serviceRoot;
    const d = m.path.match(/^(src\/drivers\/[^/]+)\//);
    return d && d[1].split('/').length === 3 && m.path.split('/').length > 3 ? d[1] : dirname(m.path);
  };
  const units = new Set(S.modules.map(m => m.serviceRoot).filter(Boolean));
  const drivers = new Set(S.modules.map(cOf).filter(c => /^src\/drivers\/[^/]+$/.test(c)));
  const cs = new Set(S.modules.map(cOf));
  [...cs].forEach(c => { for (let p = dirname(c); p; p = dirname(p)) { cs.add(p); if (!p.includes('/')) break; } });
  const count = c => S.modules.filter(m => cOf(m) === c).length;
  const parentOf = c => { for (let p = dirname(c); p; p = dirname(p)) { if (cs.has(p)) return p; if (!p.includes('/')) break; } return '.'; };
  const containers = [{ id: '.', label: S.project.name, type: 'dir' }, { id: 'externals', label: 'packages', type: 'externals' }];
  [...cs].sort().forEach(c => {
    const type = units.has(c) ? 'unit' : drivers.has(c) ? 'driver' : 'dir';
    const o = { id: c, label: base(c), type, parent: parentOf(c) };
    if (type !== 'dir') o.files = count(c);
    containers.push(o);
  });
  const sym = s => { const o = { name: s.name, form: s.form, typeOnly: s.typeOnly }; if (s.members) o.members = s.members; if (s.doc) o.doc = s.doc; return o; };
  const items = S.modules.map(m => {
    const syms = (m.symbols || []).map(sym), g = groupOf(m.layer);
    const o = { id: m.path, c: cOf(m), group: g, label: base(m.path) };
    if (!plain(m.layer)) {
      if (syms.length === 1) o.label = syms[0].name;
      else o.label = base(m.path).split('.')[0];
      if (syms.length > 1) o.rows = syms.map(s => s.name + (s.form === 'function' ? '()' : ''));
    }
    if (syms.length) o.syms = syms;
    o.internal = m.internalDeclarations; o.file = m.path;
    return o;
  });
  const layer = Object.fromEntries(S.modules.map(m => [m.path, m.layer]));
  const edges = [], ext = new Set();
  S.edges.forEach(e => {
    if (e.to.type === 'external') { ext.add(e.to.package); edges.push({ from: e.from, to: 'ext:' + e.to.package, type: 'external' }); return; }
    if (e.to.type !== 'module') return;
    const impl = e.kind === 'type' && layer[e.from] === 'adapters' && layer[e.to.path] === 'ports';
    e.symbols.forEach(s => edges.push({ from: e.from, to: e.to.path, type: impl ? 'implements' : e.kind === 'type' ? 'type' : 'import', sym: s.name }));
  });
  const extItems = [...ext].sort().map(p => ({ id: 'ext:' + p, c: 'externals', group: 'externals', label: p }));
  // driver hooks: one chip per hook, in the driver's container (DECISIONS Session 28)
  const hookItems = [];
  if (opts.hooks && S.drivers) S.drivers.forEach(d => {
    const c = cOf(S.modules.find(m => m.path === d.module) || { path: d.module });
    d.hooks.forEach(h => hookItems.push({ id: 'hook:' + h.name, c, group: 'driver', label: h.name, hook: h.name, driver: d.name, usage: h.usage }));
  });
  const all = [...items, ...hookItems, ...extItems];
  const meta = { project: S.project.name, breadcrumb: opts.breadcrumb ?? S.project.name, files: S.stats.files, services: S.stats.services, blobPercent: S.stats.blobPercent, provenance: S.project.provenance, generatedAt: S.generatedAt, fine: true };
  return { meta, initialCollapsed: opts.initialCollapsed || [], containers, items: all, edges };
}
function genGraph(S, opts) {
  opts = opts || {};
  const { meta, initialCollapsed, containers, items: all, edges } = buildGraph(S, opts);
  const js = o => '{ ' + Object.entries(o).map(([k, v]) => k + ': ' + lit(v)).join(', ') + ' }';
  const lit = v => Array.isArray(v) ? '[' + v.map(lit).join(', ') + ']' : v && typeof v === 'object' ? js(v) : typeof v === 'string' ? "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'" : String(v);
  return [
    ...(opts.header || []),
    '',
    'export const meta = ' + js(meta) + ';',
    '',
    'export const initialCollapsed = ' + lit(initialCollapsed).replace(/, /g, ',') + ';',
    '',
    'export const containers = [', ...containers.map(c => '  ' + js(c) + ','), '];',
    '',
    'export const items = [', ...all.map(c => '  ' + js(c) + ','), '];',
    '',
    'export const edges = [', ...edges.map(c => '  ' + js(c) + ','), '];',
    '',
  ].join('\n');
}
root.GenGraph = { buildGraph, genGraph };
root.buildGraph = buildGraph; root.genGraph = genGraph;
})(typeof window !== 'undefined' ? window : globalThis);
