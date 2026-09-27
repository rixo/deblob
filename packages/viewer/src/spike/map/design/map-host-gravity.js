// Deblob Map Host × Map (Session 49, the part was Map - Gravity until Session 52): the glue between the shell
// and the gravity engine part. Bound onto the page class by engineReady
// (methods read `this` as the page). Host contract: module pattern, no React.
(function (root) {
  const methods = {
    // A one-shot command to the part (fit, zoom, step…): a fresh object per call.
    gcmd(op) { this.setState({ gCmd: { n: (this._gn = (this._gn || 0) + 1), op } }); },
    // Engine picker: two named states, the current one lit (a toggle whose
    // label could read as either the state or the destination was ambiguous).
    setEngine(engine) { if (engine === (this.state.engine || 'gravity')) return; this.setState({ engine }, () => { if (engine === 'nested' && this.frame) this.relayout(null, true); }); },
    toggleEngine() { this.setEngine(this.gravityOn() ? 'nested' : 'gravity'); },
    toggleCentre() { this.setState({ centre: !this.state.centre }); },
    onGSelect(arr) { this.clearPanel(); const id = arr[0] || null; if (id) this.dockFit(id, { sel: id, selMore: arr.slice(1) }); this.setState({ sel: id, selMore: arr.slice(1), callSel: null, seqSel: null }); },
    // Part → host controls. depth null = the part's selection-scoped fold: the stop stays.
    onGControls(o) {
      const p = {};
      if ('depth' in o && o.depth != null) p.depth = o.depth;
      if ('focus' in o) p.zoomSel = o.focus;
      if ('centre' in o) p.centre = o.centre;
      if ('chain' in o) p.chain = o.chain;
      if ('dirs' in o) p.dirs = o.dirs;
      if ('flow' in o) p.gflow = o.flow;
      if ('arrows' in o) { const z = { none: 0, under: 1, auto: 2, lit: 2, over: 3 }[o.arrows]; if (z != null) p.arrowZ = z; }
      if (Object.keys(p).length) this.setState(p);
    },
    // The zoom readout follows the part's camera (direct DOM write, as applyCam does).
    onGCamera(k) { const z = document.querySelector('[data-map="zoompct"]'); if (z) { const w = document.createTreeWalker(z, NodeFilter.SHOW_TEXT).nextNode(); if (w) w.nodeValue = Math.round(k * 100) + '%'; } },
    // View store for the part (FROM-DEBLOB 2026-09-26 §2): the host names the
    // state by the project shown (else the graph path); the part shapes it.
    gStore() {
      // Under a host `view-store` (data contract) the part's view is the `map` field of the host's one object per project.
      const VS = this.props.viewStore;
      if (VS) { if (this._gStore && this._gStore.vs === VS) return this._gStore; return this._gStore = { vs: VS, load: () => (this.vs() || {}).map || null, save: v => this.vsPut('map', v) }; }
      const key = 'deblob-gravity.view.v1:' + (this.state.project || this.graphSrc());
      if (this._gStore && this._gStore.key === key) return this._gStore;
      return this._gStore = { key, load: () => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } }, save: v => { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} } };
    },
    // The bar's and the mount's values under gravity (renderVals spreads them).
    gVals(s) {
      const on = this.gravityOn();
      return {
        gravityOn: on, nestedDisp: on ? 'none' : 'block', nestedOnlyOff: on,
        gSrc: this.graphSrc(), gSel: this.selGroup(s), gDepth: s.depth, gFocus: !!s.zoomSel, gCentre: !!s.centre, gChain: !!s.chain, gDirs: this.dirsOn(), gFlow: !!s.gflow,
        gArrows: ['none', 'under', 'auto', 'over'][s.arrowZ ?? 2], gKinds: s.kinds || null, gTypes: s.types || null, gCmd: s.gCmd || null, gStore: this.gStore(),
        onGSelect: a => this.onGSelect(a), onGControls: o => this.onGControls(o), onGCamera: k => this.onGCamera(k),
        setNested: () => this.setEngine('nested'), setGravity: () => this.setEngine('gravity'),
        nestedBg: on ? 'transparent' : '#2b2d33', nestedFg: on ? '#7d7f86' : '#f4f2ec', gravityBg: on ? '#2b2d33' : 'transparent', gravityFg: on ? '#f4f2ec' : '#7d7f86',
        toggleCentre: () => this.toggleCentre(), centreBg: s.centre ? '#2b2d33' : 'transparent', centreFg: s.centre ? '#f4f2ec' : '#c4c2bc',
      };
    },
  };
  root.MapHostGravity = { methods };
})(typeof window !== 'undefined' ? window : globalThis);
