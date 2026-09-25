// Geometry and vocabulary constants of the map, shared by the page
// (Deblob Map Host.dc.html) and the engine files (map-layout.js, map-router.js,
// map-paint.js, map-tween.js). Verbatim from the page; the comments are the
// rulings. Host contract (CLAUDE.md, ask 1).
(function (root) {
// Arrow detail scale, coarse to fine. Static: the same stops whatever the nesting.
// A fourth stop, member (use cases, symbols), appends when the data carries them.
const LEVELS = ['unit', 'layer', 'box', 'member'];
const LEVEL_LABEL = { unit: 'units', layer: 'layers', box: 'boxes', member: 'members' };
// Hexagon first, then the outside groups, one container per kind.
const HEX_BANDS = ['ports', 'service', 'model'];
const OUT_GROUPS = ['driver', 'adapters', 'blob', 'assembly', 'externals'];
const WRAP = { ports: 3, service: 2, model: 5, adapters: 1, assembly: 2, driver: 1, blob: 1, externals: 2 };
// Bands of chips wrap on width, as the artboard does, not on a fixed count.
const WRAPW = { ports: 430, model: 450, externals: 300 };
// Head height is derived, never a magic number: space above the title, the title
// line itself, then the same 9px the item grids use as their gap. Nothing else —
// a hand-picked head height is what made the space under a title read as double.
const GUT = 9;
// Every container reserves 3px for the selected border at all times (bw + sl), so
// the head band starts 3px below the layout box top. Count it, or the reserve
// silently eats the gap under the title.
const BWR = 3;
const UNIT_PAD = 13, DIR_PAD = 13;
// *_TOP is measured from the layout box top, border reserve included, so it can be
// read against the bottom pad directly: 10 + BWR = 13 = UNIT_PAD. The title line
// is pinned just above the font's own height, so leading doesn't add stray space.
// Session 17 head rule, every tier: the title line sits centred in a HEAD_Y · line ·
// HEAD_Y band (HEAD_Y from the layout box top, reserve included), then the tier's
// own pad to the content. Folded, the card is that band alone.
const HEAD_Y = 10;
const UNIT_TOP = HEAD_Y - BWR, UNIT_TITLE = 17;   // 13.5px title
const DIR_TOP = HEAD_Y - BWR, DIR_TITLE = 16;     // 12.5px title
const UNIT_HEAD = HEAD_Y + UNIT_TITLE + HEAD_Y + UNIT_PAD, DIR_HEAD = HEAD_Y + DIR_TITLE + HEAD_Y + DIR_PAD;
// A fused (single-concern) node folded is all head: the title band.
const FUSED_FOLDED_H = HEAD_Y + UNIT_TITLE + HEAD_Y;
// Chevron plus one chevron-width of clear space on its left (a comfortable fold target).
const CHEV_W = 17 + 16;
// Hairline under unit and dir titles (decided, Session 16): closes the title band
// (HEAD_Y below the line), then the pad before content; the head grows by the line.
const RULE_GAP = HEAD_Y, RULE_EXTRA = 1;
// Width flows down. A row shares its slack out equally when no box would grow past
// FILL_MAX of the row's narrowest box; past that the row keeps its natural widths,
// left-aligned. Single-column groups always fill (they read as lists).
const FILL_MAX = 0.75;
// Hexagon / kind-group: same band (HEAD_Y · 16px line · HEAD_Y), pad 10 to content.
const GRP_TITLE = 16, HEX_PAD = 10, GRP_PAD = 10;
// Hexagon bands (Box Styles Board 1a): title centre → first band label centre 24,
// label → cards 16 from centre, cards → rule 9, rule → label 9 (row 16, gap 8).
// The first band has no rule: its head is the row and the gap.
const HEX_HEAD = HEAD_Y + GRP_TITLE + 8, GRP_HEAD = HEAD_Y + GRP_TITLE + GRP_PAD, GRP_FOLDED_H = HEAD_Y + GRP_TITLE + HEAD_Y;
const BAND_ROW = 16, BAND_GAP = 8, BAND_HEAD = 1 + BAND_GAP + BAND_ROW + BAND_GAP, BAND_HEAD_FIRST = BAND_ROW + BAND_GAP, BAND_SEP = 9;
// One source of truth for every item box. sizeItem() derives heights from these
// and the paint reads the same values back, so the two can never drift.
// `bw` is the selected border width, reserved at all times (see DECISIONS).
const BOX = { padY: 8, padX: 12, bw: 3, labelH: 18, rowH: 17, gap: 7, dot: 5 };
const boxH = rows => BOX.padY * 2 + BOX.bw * 2 + BOX.labelH + (rows ? BOX.gap + rows * BOX.rowH : 0);
const boxW = text => Math.round(BOX.padX * 2 + BOX.bw * 2 + text);
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const lerp = (a, b, t) => a + (b - a) * t;
root.MapConsts = { BAND_ROW, BAND_GAP, BAND_HEAD_FIRST, BAND_SEP, LEVELS, LEVEL_LABEL, HEX_BANDS, OUT_GROUPS, WRAP, WRAPW, GUT, BWR, UNIT_PAD, DIR_PAD, HEAD_Y, UNIT_TOP, UNIT_TITLE, DIR_TOP, DIR_TITLE, UNIT_HEAD, DIR_HEAD, FUSED_FOLDED_H, CHEV_W, RULE_GAP, RULE_EXTRA, FILL_MAX, GRP_TITLE, HEX_PAD, GRP_PAD, HEX_HEAD, GRP_HEAD, GRP_FOLDED_H, BAND_HEAD, BOX, boxH, boxW, ease, lerp };
})(typeof window !== 'undefined' ? window : globalThis);
