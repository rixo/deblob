// Builds a sequence tree for one CLI hook, or one function (`module#Symbol`),
// from the sequence snapshot (rev. 2: every function traced).
// Each callable is expanded at its first call site only; later sites are refs.
(function (root) {
  const TAG = { if: 'opt', '?:': 'opt', '&&': 'opt', '||': 'opt', '??': 'opt', switch: 'alt', dispatch: 'alt', loop: 'loop', catch: 'catch', callback: 'later' };
  const cut = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  // one fetch per url (the embedded panel and a standalone one share it); a
  // project switch asks for another url and must get that snapshot
  const snaps = new Map();
  const load = url => { if (!snaps.has(url)) snaps.set(url, fetch(url).then(r => r.json())); return snaps.get(url); };

  function build(S, hookName, opts) {
    const hide = new Set((opts && opts.hide) || ['unbound']);
    // A function (member row `module#Symbol`, map Session 36): its own body and,
    // for a factory, each function it returns as a `ref` fragment.
    const fnMode = hookName.indexOf('#') > 0, fnMod = fnMode ? hookName.slice(0, hookName.indexOf('#')) : null, fnSym = fnMode ? hookName.slice(hookName.indexOf('#') + 1) : null;
    const fnKeys = fnMode ? Object.keys(S.callables).filter(k => S.callables[k].module === fnMod && S.callables[k].symbol === fnSym).sort((a, b) => (S.callables[a].member ? 1 : 0) - (S.callables[b].member ? 1 : 0)) : [];
    const d = S.drivers[0], hook = fnMode ? null : d.hooks.find(h => h.name === hookName);
    const PS = Object.fromEntries(S.participants.map(p => [p.id, p]));
    const root = 'm:' + (fnMode ? fnMod : d.module), used = [root], seen = new Set(fnKeys);
    const use = id => { if (!used.includes(id)) used.push(id); };
    const note = f => [
      f.kind === 'instantiate' ? 'new' : '', f.kind === 'port' ? 'port' : '', f.kind === 'recursion' ? '↻ recursion' : '',
      f.throws ? 'throws' : '',
    ].filter(Boolean).join(' · ');
    const call = f => {
      use(f.to);
      const ret = f.returns && f.returns !== 'void' ? cut(f.returns, 40) : null;
      const n = { fid: f.id, to: f.to, fn: f.callee, args: cut((f.args || []).join(', '), 48), ret, kind: f.kind, at: f.at, ref: f.ref || null, note: note(f), kids: [] };
      const c = f.ref && S.callables[f.ref];
      if (c && f.kind !== 'recursion') {
        if (seen.has(f.ref)) n.repeat = f.ref;
        else { seen.add(f.ref); n.kids = expand(c.frames); }
      }
      return n;
    };
    // a callback's registering call is kept even when it is a hidden kind
    const expand = frames => {
      const reg = new Set(frames.flatMap(f => f.guards.filter(g => g.registeredBy).map(g => g.registeredBy)));
      return group(frames.filter(f => !hide.has(f.kind) || reg.has(f.id)), 0);
    };
    // one fragment per guard id at this level, placed at its first arm's call;
    // a callback fragment goes right after the call that registers it
    const group = (frames, lv) => {
      const items = [], frag = {};
      frames.forEach(f => {
        const g = f.guards[lv];
        if (!g) { items.push({ f }); return; }
        let F = frag[g.id];
        if (!F) { F = frag[g.id] = { g, arms: [] }; items.push({ F }); }
        let A = F.arms.find(x => x.arm === g.arm && x.idx === g.armIndex);
        if (!A) F.arms.push(A = { idx: g.armIndex ?? F.arms.length, arm: g.arm, fs: [] });
        A.fs.push(f);
      });
      items.filter(it => it.F && it.F.g.kind === 'callback' && it.F.g.registeredBy).forEach(it => {
        items.splice(items.indexOf(it), 1);
        const k = items.findIndex(x => x.f && x.f.id === it.F.g.registeredBy);
        items.splice(k < 0 ? items.length : k + 1, 0, it);
      });
      const out = [];
      items.forEach(it => {
        if (it.f) { out.push(call(it.f)); return; }
        const g = it.F.g, base = TAG[g.kind] || g.kind;
        const live = it.F.arms.sort((x, y) => x.idx - y.idx).map(A => ({ arm: A.arm, kids: group(A.fs, lv + 1) })).filter(A => A.kids.length);
        const multi = live.length > 1;
        live.forEach((A, k) => out.push({
          frame: multi && base === 'opt' ? (k ? 'else' : 'alt') : base,
          guard: cut(A.arm, 44), at: g.at, kids: A.kids,
        }));
      });
      return out;
    };
    const entry = fnMode ? [] : expand(d.entry);
    const trace = fnMode ? fnKeys.flatMap(k => { const c = S.callables[k], kids = expand(c.frames); return c.member ? (kids.length ? [{ frame: 'ref', guard: fnSym + '.' + c.member, kids }] : []) : kids; }) : expand((hook && hook.trace) || []);
    const tree = [...(entry.length ? [{ frame: 'ref', guard: 'entry · before dispatch', kids: entry }] : []), ...trace];

    const unitOf = p => p.box || (p.kind === 'external' ? 'external' : 'drivers');
    const participants = used.map(id => {
      const p = PS[id] || { id, label: id.replace(/^\w+:/, ''), kind: 'external', box: null };
      return { id, label: p.label, kind: p.kind, unit: unitOf(p) };
    });
    const order = [];
    participants.forEach(p => { if (!order.includes(p.unit)) order.push(p.unit); });
    const rank = u => (u === 'drivers' ? -1 : u === 'external' ? 1e3 : order.indexOf(u));
    const units = order.slice().sort((a, b) => rank(a) - rank(b)).map(u => ({ id: u, label: u.replace(/^src\/lib\//, '') }));
    participants.sort((a, b) => rank(a.unit) - rank(b.unit));
    return { root, tree, participants, units, usage: fnMode ? fnSym : hook ? hook.usage : hookName };
  }

  root.DeblobSequence = { load, build, hooks: S => S.drivers[0].hooks.map(h => ({ name: h.name, usage: h.usage })) };
})(typeof window !== 'undefined' ? window : globalThis);
