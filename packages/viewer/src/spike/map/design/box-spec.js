// Box spec (pure): the one source of geometry and paint for every map node.
// Layout reads sizes from it, `Map - Box.dc.html` reads paint from it, so the
// two cannot drift. Plan: docs/box-components.md. Metrics from map-consts.js,
// colours from map-theme.js (both loaded first). Board: Box Styles Board 1a/1b.
//   spec(o) → { w, h, headH, padBottom, ...paint and type }
//   o = { tier, kind, title, sub, icon, rule, open, rows: [text], actions: [{ id, glyph, on }],
//         state: 'rest'|'lit'|'dim', sel, hov, aff (lit action id), scheme, bodyH }
(function (root) {
  // Tier presets. A tier is only values; the markup is the same for all.
  const TIERS = {
    unit:  { font: "600 13.5px 'IBM Plex Sans',sans-serif", line: 17, frame: true, neutral: true, r: 8, padX: 12, pad: 13, ruleDefault: true },
    // Directory = a path (Session 47i): mono, muted ink, trailing slash.
    dir:   { font: "400 12.5px 'IBM Plex Mono',monospace", path: true, line: 16, frame: true, neutral: true, r: 8, padX: 12, pad: 13, ruleDefault: false },   // no header line (user, Session 46v)
    // Galaxy star (Session 47j): a directory drawn as its label only, a dot
    // and the path; no frame, no body.
    // Readable over arrows: brighter ink than a path prefix, and a knockout
    // (canvas colour) so lines passing under it do not cross the text.
    star:  { font: "500 12.5px 'IBM Plex Mono',monospace", path: true, knock: 'rgba(18,19,22,.92)', ink: 'ink2', line: 16, frame: false, dotRow: true, r: 6, padX: 7, pad: 0, headY: 4 },
    group: { font: "600 11.5px 'IBM Plex Sans',sans-serif", line: 16, frame: true, labelKind: true, r: 7, padX: 10, pad: 10 },
    // A band is a box whose frame is hidden at rest (ghost): participant shows
    // the frame at the rest strength of a framed box, selected the full frame
    // and ring. Never a fill: it sits on its hexagon.
    band:  { font: "600 9.5px 'IBM Plex Sans',sans-serif", line: 16, frame: true, ghost: true, labelKind: true, r: 6, padX: 8, pad: 0, padB: 8, upper: true, ls: '.1em', headY: 4 },
    card:  { font: "500 12.5px 'IBM Plex Mono',monospace", line: 18, frame: true, r: 7, padX: 12, pad: 8, headY: 8 },
    row:   { font: "400 11.5px 'IBM Plex Mono',monospace", line: 17, frame: false, dotRow: true, r: 0, padX: 4, pad: 0, headY: 0 },
  };
  const ROW_FONT = "400 11.5px 'IBM Plex Mono',monospace", SUB_FONT = "600 11.5px 'IBM Plex Sans',sans-serif";
  const ICON_W = 12, ACT_W = 16, ACT_GAP = 2, GAP = 6;
  const ICON = {
    hex: { d: 'M6 .8 11 3.6v5.8L6 12.2 1 9.4V3.6z', vb: '0 0 12 13' },
    ports: { d: 'M9.3 3.1A4.4 4.4 0 1 0 9.3 8.9M7.6 6h4', vb: '0 0 12 12' },
    service: { d: 'M6 1.6a4.4 4.4 0 1 0 0 8.8a4.4 4.4 0 1 0 0-8.8M6 4.6a1.4 1.4 0 1 0 0 2.8a1.4 1.4 0 1 0 0-2.8', vb: '0 0 12 12' },
    model: { d: 'M6 1.5 10.5 6 6 10.5 1.5 6z', vb: '0 0 12 12' },
    adapters: { d: 'M4 1v3M8 1v3M2.5 4h7v2a3.5 3.5 0 0 1-7 0zM6 9.5v2', vb: '0 0 12 12' },
    driver: { d: 'M3 2l7 4-7 4z', vb: '0 0 12 12' },
    assembly: { d: 'M1.5 1.5h3.5v3.5H1.5zM7 1.5h3.5v3.5H7zM1.5 7h3.5v3.5H1.5zM7 7h3.5v3.5H7z', vb: '0 0 12 12' },
    blob: { d: 'M6 1.6a4.4 4.4 0 1 0 0 8.8a4.4 4.4 0 1 0 0-8.8', vb: '0 0 12 12', dash: '2 1.6' },
    externals: { d: 'M5 2H2v8h8V7M7 2h3v3M10 2 5.5 6.5', vb: '0 0 12 12' },
  };
  // Action glyphs (24-unit viewBox). Every head button behaves the same
  // (docs/box-components.md "Actions"); only the glyph differs.
  const GLYPH = {
    chev: { d: 'm9 18 6-6-6-6', fill: false, sw: 2.6, rotOn: 90 },
    deep: { d: 'm5 18 6-6-6-6M12 18l6-6-6-6', fill: false, sw: 2.4, rotOn: 90 },
    bolt: { d: 'M13 2 4.5 13.5H12L11 22l8.5-11.5H12z', fill: true, sw: 1.8, rotOn: 0 },
  };

  let ctx = null; const cache = new Map();
  function textW(t, font, upper, ls) {
    t = upper ? String(t).toUpperCase() : String(t);
    const k = font + '|' + t + '|' + (ls || '');
    if (cache.has(k)) return cache.get(k);
    let w;
    if (typeof document !== 'undefined') {
      ctx = ctx || document.createElement('canvas').getContext('2d');
      ctx.font = font; w = ctx.measureText(t).width;
    } else w = t.length * (parseFloat(font.split(' ')[1]) || 12) * (font.includes('Mono') ? 0.6 : 0.56);
    if (ls) w += t.length * parseFloat(ls) * (parseFloat(font.split(' ')[1]) || 12);
    w = Math.ceil(w); cache.set(k, w); return w;
  }

  function spec(o) {
    const C = root.MapConsts, TH = root.MapTheme, T = TIERS[o.tier] || TIERS.card;
    const S = TH.SCHEMES[o.scheme || 'vivid'];
    const rows = o.rows || [], acts = o.actions || [], open = !!o.open;
    const headY = T.headY ?? C.HEAD_Y;
    const rule = o.rule ?? !!T.ruleDefault;
    // Head band: headY · title line · headY (Session 17 rule, every tier).
    const band = headY * 2 + T.line;
    const hasRows = o.tier === 'card' && rows.length > 0;
    let headH = band, h = band, padBottom = 0;
    if (o.tier === 'card') {
      h = C.boxH(0) - 2 * C.BOX.bw;
      if (hasRows && open) h += C.BOX.gap + rows.length * C.BOX.rowH;
      headH = h;
    } else if (o.tier === 'row') { h = C.BOX.rowH; headH = h; }
    else if (open) {
      headH = band + (rule ? C.RULE_EXTRA : 0) + T.pad;
      padBottom = T.padB ?? T.pad;
      h = headH + (o.bodyH || 0) + padBottom;
    }
    const titleW = textW((o.title || '') + (T.path ? '/' : ''), T.font, T.upper, T.ls);
    const subW = o.sub ? GAP + textW(String(o.sub).toUpperCase(), "600 9.5px 'IBM Plex Sans',sans-serif", false, '.08em') : 0;
    const iconW = o.icon ? ICON_W + GAP : 0, dotW = T.dotRow ? 5 + GAP : 0;
    // Fusion (Session 46y): holder labels prepended, each in its own tier's type.
    const pre = (o.pre || []).map(p => { const PT = TIERS[p.tier] || T; return { t: p.t, PT, w: textW(p.t + (PT.path ? '/' : ''), PT.font, PT.upper, PT.ls) + GAP }; });
    const preW = pre.reduce((a, p) => a + p.w, 0);
    const actsW = acts.length ? 16 + acts.length * ACT_W + (acts.length - 1) * ACT_GAP : 0;
    let w = T.padX * 2 + preW + dotW + iconW + titleW + subW + actsW + (T.frame ? 2 : 0);
    if (hasRows && open) for (const r of rows) w = Math.max(w, T.padX * 2 + 5 + GAP + textW(r, ROW_FONT) + 2);
    const tier = o.state || 'rest', lit = tier === 'lit' || o.sel || o.hov;
    const P = TH.paint(S, { kind: o.kind || null, neutral: T.neutral && !o.sub, frame: T.frame, tier, sel: !!o.sel, hov: !!o.hov, aff: false, labelKind: T.labelKind, dotRow: T.dotRow });
    if (T.ghost) {
      P.bg = 'transparent';
      if (!o.sel) P.bc = tier === 'lit' ? TH.mix(P.kc || S.ink2, 38, S.bg) : 'transparent';
    }
    const act = acts.map(a => {
      const G = GLYPH[a.glyph] || GLYPH.chev, on = !!a.on, hot = o.aff === a.id;
      const c = hot ? S.ink : lit ? S.ink2 : S.mute;
      const ac = P.kc || S.ink2;
      return { id: a.id, d: G.d, sw: G.sw, fill: G.fill ? (on ? c : 'none') : 'none', stroke: c, rot: on ? G.rotOn : 0,
        sh: hot ? `drop-shadow(0 0 3px ${TH.mix(ac, 80, 'transparent')}) drop-shadow(0 0 7px ${TH.mix(ac, 40, 'transparent')})` : 'none',
        bg: hot ? TH.mix(ac, 12, 'transparent') : 'transparent', title: a.title || a.id };
    });
    const ic = o.icon && ICON[o.icon];
    const subC = o.sub && o.kind ? TH.mix(S.kind[o.kind] || S.ink2, 85, S.bg) : S.mute;
    return {
      w: Math.ceil(w), h: Math.ceil(h), headH, band, padBottom, padX: T.padX, r: T.r, frame: T.frame,
      font: T.font, upper: !!T.upper, ls: T.ls || 'normal', titleTop: o.tier === 'card' ? C.BOX.padY : headY, titleLine: T.line,
      rule: rule && open && o.tier !== 'card' && o.tier !== 'row' && o.tier !== 'band', ruleC: P.rule,
      dot: !!T.dotRow, dotC: P.kc || S.mute,
      icon: !!ic, iconD: ic ? ic.d : '', iconVb: ic ? ic.vb : '0 0 12 12', iconDash: ic && ic.dash ? ic.dash : 'none', iconC: P.ic,
      sub: o.sub ? String(o.sub).toUpperCase() : '', hasSub: !!o.sub, subC,
      rows: hasRows && open ? rows.map(t => ({ t, c: lit ? S.ink2 : S.mute, dotC: P.kc || S.mute })) : [], rowTop: C.BOX.padY + 18 + C.BOX.gap, rowH: C.BOX.rowH,
      bc: T.frame ? P.bc : 'transparent', bg: T.frame ? P.bg : T.knock || 'transparent', sh: P.sh, op: P.op,
      lc: T.path && !o.sel && !o.hov ? S[T.ink || 'mute'] : P.lc, lbg: P.lbg, lsh: P.lsh, tsh: P.tsh, actions: act, hasActions: act.length > 0,
      pre: pre.map(p => ({ t: p.t, font: p.PT.font, ls: p.PT.ls || 'normal', tt: p.PT.upper ? 'uppercase' : 'none',
        c: p.PT.path ? (o.sel || o.hov ? S.ink2 : S.mute) : TH.paint(S, { kind: null, neutral: true, frame: true, tier, sel: !!o.sel, hov: !!o.hov, aff: false }).lc,
        slash: p.PT.path ? '/' : '', sc: TH.mix(S.mute, 55, S.bg) })),
      slash: T.path ? '/' : '', slashC: TH.mix(S.mute, 55, S.bg),
    };
  }

  root.BoxSpec = { TIERS, ICON, GLYPH, spec, textW, clearCache: () => cache.clear() };
})(typeof window !== 'undefined' ? window : globalThis);
