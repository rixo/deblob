// Map theme: schemes (one object each) + the derivation of every node colour
// from a scheme and a node's state. Spec: `Box Styles Board.dc.html` 1a/1b.
// Pure; no DOM. Consumed by `Deblob Map (themed).dc.html`.
(function (root) {
  const mix = (c, pct, base) => `color-mix(in oklab, ${c} ${pct}%, ${base})`;
  const SCHEMES = {
    calm: { id: 'calm', name: 'Calm+', bg: '#141518', sf: '#16171a', sf2: '#18191d', ink: '#e6e4df', ink2: '#c4c2bc', mute: '#8d8b85', line: '#2c2f35', hex: '#d8c58f', glow: 0,
      kind: { ports: '#c3a4ef', service: '#74bdf7', model: '#92d29b', adapters: '#f2a078', driver: '#6ed2c8', assembly: '#a3a19b', blob: '#8d8b85', externals: '#8d8b85' },
      diff: { add: '#6fcf97', chg: '#e2b04e', rm: '#ef6f7b' }, viol: '#ff5c5c' },
    vivid: { id: 'vivid', name: 'Vivid', bg: '#111216', sf: '#15161a', sf2: '#191a1f', ink: '#ecebe6', ink2: '#cfcdc7', mute: '#8f8d87', line: '#2e3138', hex: '#ffd36e', glow: 0,
      kind: { ports: '#d69bff', service: '#3fb0ff', model: '#6fe58a', adapters: '#ff8f4d', driver: '#2ee6d2', assembly: '#b0aea8', blob: '#8d8b85', externals: '#8d8b85' },
      diff: { add: '#5fe08f', chg: '#ffc043', rm: '#ff5d6e' }, viol: '#ff4d4d' },
    neon: { id: 'neon', name: 'Neon', bg: '#050806', sf: '#080d09', sf2: '#0a110c', ink: '#d9ffe3', ink2: '#8fe3a6', mute: '#4f8a5f', line: '#153a21', hex: '#35ff7f', glow: 1,
      kind: { ports: '#ff4fe0', service: '#19d9ff', model: '#b4ff2e', adapters: '#ff9a00', driver: '#ffe600', assembly: '#59c47a', blob: '#4f8a5f', externals: '#4f8a5f' },
      diff: { add: '#35ff7f', chg: '#ffe600', rm: '#ff3b5c' }, viol: '#ff2f4f' },
  };
  // Accent of a node: hexagon has its own colour; neutral nodes (unit, dir,
  // folded unit) use ink2.
  const accent = (S, kind) => kind === 'hex' ? S.hex : kind ? S.kind[kind] : null;
  // paint(S, o): o = { kind, neutral, frame, tier: 'rest'|'lit'|'dim', sel, hov, aff, treat, labelKind, dotRow }
  // Frame: rest = kind at 38% over bg, participant = 70%, selected = full + 2px ring.
  // Label: hover treatment only (halo | pill | bar); selection never touches the label.
  // Chevron: own halo when the card body is hovered (aff).
  function paint(S, o) {
    const kc = accent(S, o.kind), ac = kc || S.ink2, neutral = o.neutral || !kc;
    const lit = o.tier === 'lit' || o.sel || o.hov;
    const glowSh = c => S.glow ? `, 0 0 16px ${mix(c, 55, 'transparent')}` : '';
    let bc = 'transparent', bg = 'transparent', sh = 'none';
    if (o.frame) {
      bc = neutral ? (o.sel ? S.ink2 : lit ? mix(S.ink2, 45, S.bg) : S.line) : (o.sel ? kc : lit ? mix(kc, 70, S.bg) : mix(kc, 38, S.bg));
      bg = kc && !neutral ? mix(kc, 7, S.sf) : S.sf;
      if (o.sel) sh = `0 0 0 2px ${neutral ? S.ink2 : kc}` + glowSh(neutral ? S.ink2 : kc);
      else if (lit && S.glow) sh = `0 0 10px ${mix(kc || S.ink2, 30, 'transparent')}`;
    }
    const restLc = o.labelKind ? mix(kc, 78, S.bg) : o.dotRow ? S.mute : S.ink;
    const lc = lit ? (o.labelKind ? kc : S.ink) : restLc;
    let lbg = 'transparent', lsh = 'none', tsh = 'none';
    const T = o.treat || 'halo';
    if (o.hov) {
      if (T === 'pill') lbg = mix(ac, 13, 'transparent');
      else if (T === 'bar') lsh = `inset 0 -2px 0 ${mix(ac, 55, S.bg)}`;
      else tsh = `0 0 6px ${mix(ac, 70, 'transparent')}, 0 0 14px ${mix(ac, 35, 'transparent')}`;
    }
    if (o.sel && !o.frame) lsh = `0 0 0 1px ${ac}`;
    const cc = o.aff ? S.ink : lit ? S.ink2 : S.mute;
    const csh = o.aff ? `drop-shadow(0 0 3px ${mix(ac, 80, 'transparent')}) drop-shadow(0 0 7px ${mix(ac, 40, 'transparent')})` : 'none';
    const ic = kc ? (o.labelKind ? lc : lit ? kc : mix(kc, 78, S.bg)) : S.mute;
    return { kc, ac, bc, bg, sh, lc, lbg, lsh, tsh, cc, csh, ic, rule: o.sel || lit ? mix(S.ink2, 40, S.bg) : S.line, op: o.tier === 'dim' ? 0.34 : 1 };
  }
  root.MapTheme = { SCHEMES, mix, accent, paint };
})(typeof window !== 'undefined' ? window : globalThis);
