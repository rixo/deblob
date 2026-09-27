// Palette of Deblob Map Host (the artboard palette, verbatim), bound into
// the page by engineReady. Host contract: module pattern, no React.
(function (root) {
  // Accent: title dot, band label, single-kind container title. Never a box title.
  const KIND = {
    ports: '#b9a0dc', service: '#7ab8ea', model: '#93c294', adapters: '#d99a7a',
    driver: '#7cc0b8', assembly: '#8d8b85', blob: '#8d8b85', externals: '#8d8b85',
  };
  // Band labels: the accent's 9px variant.
  const LABEL = {
    ports: '#9a86b8', service: '#6f9fc8', model: '#6f8f75', adapters: '#d9a88f',
    driver: '#7cc0b8', assembly: '#8d8b85', blob: '#8d8b85', externals: '#8d8b85',
  };
  const LIT = {
    ports: '#6a5a85', service: '#4a6d92', model: '#4d6a53', adapters: '#7a5a48',
    driver: '#2c4745', assembly: '#3b3e45', blob: '#3b3e45', externals: '#3b3e45',
  };
  const BORDER = {
    ports: '#3a3346', service: '#334a66', model: '#2f3a30', adapters: '#45352d',
    driver: '#26383a', assembly: '#2c2f35', blob: '#3b3e45', externals: '#2c2f35',
  };
  const FILL = {
    ports: '#1b1a1f', service: '#1a1d22', model: '#1a1f1b', adapters: '#1d1a18',
    driver: '#18191d', assembly: '#17181b', blob: 'transparent', externals: '#17181b',
  };
  // Single-kind container: accent at 36% when lit, a quiet muted tone otherwise.
  const GQUIET = {
    ports: '#3f3a4c', service: '#394a5c', model: '#354036', adapters: '#4a3a31',
    driver: '#2f4a47', assembly: '#33363d', blob: '#3b3e45', externals: '#33363d',
  };
  // Edge types: rest colour, lit colour, dash, legend label.
  const ET = {
    import: { c: '#3b3e45', lit: '#f1efe9', dash: '', label: 'import' },
    type: { c: '#3b3e45', lit: '#f1efe9', dash: '3 2', label: 'type' },
    implements: { c: '#7a5e4c', lit: '#d99a7a', dash: '2 2', label: 'implements' },
    external: { c: '#43474e', lit: '#c4c2bc', dash: '2 5', label: 'externals' },
  };
  root.MapPalette = { KIND, LABEL, LIT, BORDER, FILL, GQUIET, ET };
})(typeof window !== 'undefined' ? window : globalThis);
