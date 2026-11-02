/**
 * Wedding cast — original vector characters (no external art).
 * Every character is an inline SVG rig (viewBox 0 0 200 460, feet at y≈450) with named
 * parts that CSS animates: .arm-l/.arm-r (shoulder pivots), .head, .eyes-*, .mouth-*, .prop-*.
 * Expressions: root class expr-{happy|joy|kiss|nervous|surprised|love}
 * Poses:       root class pose-{idle|hold|wave|cheer|kiss|toast|cut|throw|clap|dance|heart|present|mic}
 */
import { safeUrl, escapeHtml } from '../core/util.js';

// ------------------------------------------------------------------ shared defs
export function characterDefs() {
  return `
  <radialGradient id="g-skin" cx="45%" cy="38%" r="70%"><stop offset="0" stop-color="#fde6d6"/><stop offset=".7" stop-color="#f6d2bd"/><stop offset="1" stop-color="#ebb9a0"/></radialGradient>
  <linearGradient id="g-dress" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffdf8"/><stop offset=".55" stop-color="#fbf4ea"/><stop offset="1" stop-color="#eadccb"/></linearGradient>
  <linearGradient id="g-skirt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ecdfcf"/><stop offset=".25" stop-color="#fffdf9"/><stop offset=".6" stop-color="#fbf3e9"/><stop offset="1" stop-color="#e3d3bf"/></linearGradient>
  <linearGradient id="g-veil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity=".18"/></linearGradient>
  <linearGradient id="g-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1c1"/><stop offset=".45" stop-color="#e2be72"/><stop offset="1" stop-color="#a97d34"/></linearGradient>
  <linearGradient id="g-tux" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1a1823"/><stop offset=".5" stop-color="#2e2b3c"/><stop offset="1" stop-color="#16141e"/></linearGradient>
  <linearGradient id="g-satin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a4660"/><stop offset="1" stop-color="#15131c"/></linearGradient>
  <linearGradient id="g-blush" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#eeb3c0"/><stop offset=".4" stop-color="#f9d3db"/><stop offset="1" stop-color="#e2a0b0"/></linearGradient>
  <linearGradient id="g-sage" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c9b8d8"/><stop offset=".4" stop-color="#e6dbef"/><stop offset="1" stop-color="#b9a5cb"/></linearGradient>
  <linearGradient id="g-grey" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5b5868"/><stop offset=".5" stop-color="#7a7688"/><stop offset="1" stop-color="#4e4b5a"/></linearGradient>
  <linearGradient id="g-navy" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1f2a48"/><stop offset=".5" stop-color="#34436d"/><stop offset="1" stop-color="#1a2440"/></linearGradient>
  <radialGradient id="g-rose" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#ffd3df"/><stop offset=".6" stop-color="#f08aa6"/><stop offset="1" stop-color="#c95a7a"/></radialGradient>
  <radialGradient id="g-rose-white" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fffefa"/><stop offset="1" stop-color="#ead9c4"/></radialGradient>
  <radialGradient id="g-shadow"><stop offset="0" stop-color="#3b2430" stop-opacity=".38"/><stop offset="1" stop-color="#3b2430" stop-opacity="0"/></radialGradient>
  <linearGradient id="g-hair-brown" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a42"/><stop offset="1" stop-color="#5a3527"/></linearGradient>
  <linearGradient id="g-hair-dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d302e"/><stop offset="1" stop-color="#1c1515"/></linearGradient>
  <linearGradient id="g-hair-blonde" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0d29c"/><stop offset="1" stop-color="#c79a5c"/></linearGradient>
  <linearGradient id="g-hair-auburn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b0573c"/><stop offset="1" stop-color="#6e2f22"/></linearGradient>
  <linearGradient id="g-champagne" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6d5"/><stop offset="1" stop-color="#f1c96a"/></linearGradient>
  <radialGradient id="g-rose-red" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#ff8a9c"/><stop offset=".6" stop-color="#d61f3c"/><stop offset="1" stop-color="#8f0a1f"/></radialGradient>
  <radialGradient id="g-rose-gold" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff3c4"/><stop offset=".6" stop-color="#f1c24e"/><stop offset="1" stop-color="#b8860b"/></radialGradient>
  <radialGradient id="g-rose-lilac" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#f4eeff"/><stop offset=".6" stop-color="#c3a8ff"/><stop offset="1" stop-color="#8a6ad6"/></radialGradient>
  <radialGradient id="g-rose-ice" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#f2fdff"/><stop offset=".6" stop-color="#a8ecff"/><stop offset="1" stop-color="#5bb8de"/></radialGradient>
  <clipPath id="clip-face" clipPathUnits="objectBoundingBox"><circle cx=".5" cy=".5" r=".5"/></clipPath>`;
}

// ------------------------------------------------------------------ building blocks
const SKIN = 'url(#g-skin)';
const SKIN_SHADE = '#e8b79c';

function face({ lashes = false, avatar = '', blush = true } = {}) {
  const url = safeUrl(avatar);
  if (url) {
    return `
      <ellipse cx="100" cy="92" rx="34" ry="36" fill="${SKIN}"/>
      <image href="${escapeHtml(url)}" x="66" y="56" width="68" height="72" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-face)" referrerpolicy="no-referrer"/>
      <ellipse cx="100" cy="92" rx="34" ry="36" fill="none" stroke="url(#g-gold)" stroke-width="3.5"/>`;
  }
  const lash = lashes
    ? `<path d="M80.5 92.5 l-3 -2.5 M93 92 l2.6 -2.6 M107 92 l-2.6 -2.6 M119.5 92.5 l3 -2.5" stroke="#2c1d1d" stroke-width="1.6" stroke-linecap="round"/>`
    : '';
  return `
    <ellipse class="ear" cx="66.5" cy="97" rx="5" ry="7" fill="${SKIN_SHADE}"/>
    <ellipse class="ear" cx="133.5" cy="97" rx="5" ry="7" fill="${SKIN_SHADE}"/>
    <ellipse cx="100" cy="92" rx="34" ry="37" fill="${SKIN}"/>
    <path d="M80 84 Q87 79.5 94 83" class="brow" stroke="#5b3b30" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M106 83 Q113 79.5 120 84" class="brow" stroke="#5b3b30" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <g class="eyes eyes-open">
      <ellipse cx="87" cy="97" rx="4.4" ry="5.8" fill="#2f2224"/><circle cx="88.6" cy="95" r="1.7" fill="#fff"/>
      <ellipse cx="113" cy="97" rx="4.4" ry="5.8" fill="#2f2224"/><circle cx="114.6" cy="95" r="1.7" fill="#fff"/>
      ${lash}
    </g>
    <g class="eyes eyes-closed" stroke="#2f2224" stroke-width="2.3" fill="none" stroke-linecap="round">
      <path d="M81.5 98 Q87 92.5 92.5 98"/><path d="M107.5 98 Q113 92.5 118.5 98"/>
    </g>
    <g class="eyes eyes-love" fill="#e9557a">
      <path d="M87 101 l-4.5 -4.4 a2.7 2.7 0 0 1 4.5 -2.9 a2.7 2.7 0 0 1 4.5 2.9 z"/>
      <path d="M113 101 l-4.5 -4.4 a2.7 2.7 0 0 1 4.5 -2.9 a2.7 2.7 0 0 1 4.5 2.9 z"/>
    </g>
    <path d="M100 100 q2.4 4.6 -1.2 5.6" stroke="${SKIN_SHADE}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    ${blush ? `<ellipse class="blush" cx="79" cy="108" rx="6.5" ry="3.6" fill="#f39aa6" opacity=".55"/><ellipse class="blush" cx="121" cy="108" rx="6.5" ry="3.6" fill="#f39aa6" opacity=".55"/>` : ''}
    <path class="mouth mouth-smile" d="M92.5 111.5 Q100 118.5 107.5 111.5" stroke="#b4515d" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path class="mouth mouth-open" d="M91.5 110.5 Q100 124 108.5 110.5 Z" fill="#a8424f"/>
    <ellipse class="mouth mouth-kiss" cx="102" cy="113" rx="3.2" ry="3.8" fill="#d25d6c"/>
    <path class="mouth mouth-nervous" d="M93 114 q3.5 -3.2 7 0 t7 0" stroke="#b4515d" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <ellipse class="mouth mouth-o" cx="100" cy="114" rx="4" ry="5" fill="#a8424f"/>`;
}

function rose(cx, cy, r, fill = 'url(#g-rose)') {
  return `<g><circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/><path d="M${cx - r * 0.5} ${cy} q${r * 0.5} ${-r * 0.7} ${r} 0 q${-r * 0.45} ${r * 0.55} ${-r * 0.75} ${r * 0.1}" stroke="#b44c6a" stroke-opacity=".45" stroke-width="${Math.max(0.8, r * 0.16)}" fill="none"/></g>`;
}

function bouquet(cx, cy, scale = 1, palette = ['url(#g-rose)', 'url(#g-rose-white)', 'url(#g-rose)']) {
  const s = scale;
  return `
  <g class="prop prop-bouquet" transform="translate(${cx} ${cy}) scale(${s})">
    <path d="M-4 8 L-10 40 M4 8 L10 40" stroke="#f3e6c8" stroke-width="3" stroke-linecap="round"/>
    <path d="M0 6 C-8 26 -4 42 -14 56 M0 6 C8 26 6 40 15 54" stroke="#f6c6d3" stroke-width="2.4" fill="none" stroke-linecap="round" class="ribbon"/>
    <ellipse cx="-17" cy="-2" rx="9" ry="4.5" fill="#86a77f" transform="rotate(-30 -17 -2)"/>
    <ellipse cx="17" cy="-2" rx="9" ry="4.5" fill="#7c9d76" transform="rotate(30 17 -2)"/>
    <ellipse cx="0" cy="-17" rx="8" ry="4" fill="#94b48c" transform="rotate(80 0 -17)"/>
    ${rose(-9, -6, 8.5, palette[0])}${rose(9, -7, 8.5, palette[1])}${rose(0, -14, 8, palette[2])}${rose(0, 2, 8.5, palette[1])}
    <circle cx="-15" cy="-14" r="2" fill="#fff6e0"/><circle cx="14" cy="-17" r="2" fill="#fff6e0"/><circle cx="-2" cy="-25" r="1.8" fill="#fff6e0"/>
  </g>`;
}

function arm(side, { sleeve, sleeveWidth = 0, cuff = '', length = 84, glove = '' } = {}, held = '') {
  const x = side === 'l' ? 78 : 122;
  const bend = side === 'l' ? -5 : 5;
  const skinStroke = `<path d="M${x} 152 C${x + bend} 180 ${x + bend * 0.6} 208 ${x} ${152 + length}" stroke="${glove || SKIN}" stroke-width="10.5" fill="none" stroke-linecap="round"/>`;
  const sleevePath = sleeve
    ? `<path d="M${x} 150 C${x + bend} 178 ${x + bend * 0.6} 204 ${x} ${150 + length - 10}" stroke="${sleeve}" stroke-width="${sleeveWidth}" fill="none" stroke-linecap="round"/>`
    : '';
  const cuffMark = cuff ? `<circle cx="${x}" cy="${150 + length - 10}" r="${sleeveWidth / 2 - 0.5}" fill="${cuff}"/>` : '';
  return `<g class="arm arm-${side}">${held}${skinStroke}${sleevePath}${cuffMark}<circle class="hand" cx="${x}" cy="${152 + length}" r="6.4" fill="${glove || SKIN}"/></g>`;
}

const PROPS = `
  <g class="prop prop-glass" transform="translate(122 236)">
    <path d="M-6 -30 L6 -30 L4 -12 Q0 -8 -4 -12 Z" fill="url(#g-champagne)" stroke="#fff" stroke-width="1" opacity=".95"/>
    <path d="M0 -10 L0 0 M-5 0 L5 0" stroke="#fff" stroke-width="1.6"/>
    <circle cx="-1" cy="-22" r="1" fill="#fff"/><circle cx="2" cy="-17" r=".8" fill="#fff"/>
  </g>
  <g class="prop prop-ringbox" transform="translate(124 238)">
    <rect x="-11" y="-4" width="22" height="13" rx="2.5" fill="#b0345a"/>
    <path d="M-11 -4 L-9 -16 L9 -16 L11 -4 Z" fill="#c9446c"/>
    <circle cx="0" cy="-3" r="5" fill="none" stroke="url(#g-gold)" stroke-width="2.4"/>
    <circle cx="0" cy="-8" r="1.8" fill="#eaf6ff"/>
  </g>
  <g class="prop prop-mic" transform="translate(124 226) rotate(-25)">
    <rect x="-2.5" y="0" width="5" height="22" rx="2" fill="#2a2a33"/>
    <circle cx="0" cy="-2" r="6" fill="#4a4a58"/><circle cx="-1.6" cy="-3.6" r="1.6" fill="#9a9aae"/>
  </g>
  <g class="prop prop-knife" transform="translate(112 232) rotate(30)">
    <path d="M0 0 L3 -34 L6 0 Z" fill="#e8eef5" stroke="#b8c2cf" stroke-width=".8"/>
    <rect x="1" y="0" width="4" height="10" rx="1" fill="url(#g-gold)"/>
  </g>`;

function rootSvg(cls, inner, { width = 200, height = 460 } = {}) {
  return `<svg class="rig ${cls}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" overflow="visible">
    <ellipse class="shadow" cx="100" cy="450" rx="70" ry="13" fill="url(#g-shadow)"/>
    <g class="body">${inner}</g>
  </svg>`;
}

// ------------------------------------------------------------------ outfit helpers
const BOUQUET_FILLS = {
  ivory: 'url(#g-rose-white)',
  blush: 'url(#g-rose)',
  pink: 'url(#g-rose)',
  red: 'url(#g-rose-red)',
  gold: 'url(#g-rose-gold)',
  lilac: 'url(#g-rose-lilac)',
  ice: 'url(#g-rose-ice)'
};
const bouquetPalette = (names = ['pink', 'ivory', 'pink']) => names.map((n) => BOUQUET_FILLS[n] || BOUQUET_FILLS.blush);

function glints(points, fill = '#fff6d6', r = 1.8) {
  return points.map(([x, y], i) => `<circle class="glint glint-${i % 3}" cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`).join('');
}

/** Áo dài: long tunic panels over silk trousers, mandarin collar, embroidered front panel. */
function aodaiBody({ fill, accent, pants = '#fffaf2', narrow = false }) {
  const w = narrow ? 0 : 3;
  return `
    <path d="M84 232 L76 446 L98 446 L100 250 L102 446 L124 446 L116 232 Z" fill="${pants}"/>
    <path d="M86 446 L98 446 M102 446 L114 446" stroke="#000" stroke-opacity=".08" stroke-width="3"/>
    <path class="aodai-back" d="M${76 - w} 214 C${72 - w} 300 ${66 - w} 380 ${62 - w} 440 L${84 - w} 446 L100 230 L${116 + w} 446 L${138 + w} 440 C${134 + w} 380 ${128 + w} 300 ${124 + w} 214 Z" fill="${fill}" opacity=".88"/>
    <path class="aodai-front" d="M78 212 L122 212 L${118 + w} 444 Q100 450 ${82 - w} 444 Z" fill="${fill}"/>
    <path d="M100 216 L100 444" stroke="#000" stroke-opacity=".06" stroke-width="2"/>
    <g class="embroidery" fill="none" stroke="${accent}" stroke-width="2.4" stroke-linecap="round">
      <path d="M90 260 q10 -14 20 0 q-10 14 -20 0 M86 300 c8 -18 26 -18 30 2 M92 330 q8 10 16 0 M84 372 c10 -16 22 -16 32 0 M90 410 q10 -12 20 0"/>
      <circle cx="100" cy="285" r="4" fill="${accent}"/><circle cx="100" cy="352" r="3" fill="${accent}"/><circle cx="100" cy="394" r="3" fill="${accent}"/>
    </g>
    <path d="M73 150 Q100 140 127 150 L124 214 Q100 220 76 214 Z" fill="${fill}"/>
    <path d="M86 156 Q100 150 114 156 L113 186 Q100 190 87 186 Z" stroke="${accent}" stroke-width="1.6" fill="none" opacity=".75"/>
    <rect x="89" y="132" width="22" height="16" rx="4" fill="${fill}"/>
    <path d="M89 135 L111 135 M89 145 L111 145" stroke="${accent}" stroke-width="1.8"/>`;
}

function suitedLegs(pants = '#1d1b27') {
  return `
    <path d="M84 290 L79 440 L98 440 L100 298 Z" fill="${pants}"/>
    <path d="M116 290 L121 440 L102 440 L100 298 Z" fill="${pants}"/>
    <path d="M84 290 L79 440 L98 440 L100 298 Z M116 290 L121 440 L102 440 L100 298 Z" fill="#000" fill-opacity=".12"/>
    <ellipse cx="87" cy="444" rx="13" ry="6" fill="#0d0c12"/><ellipse cx="113" cy="444" rx="13" ry="6" fill="#0d0c12"/>
    <ellipse cx="83" cy="442" rx="4" ry="1.6" fill="#55536a"/><ellipse cx="117" cy="442" rx="4" ry="1.6" fill="#55536a"/>`;
}

// ------------------------------------------------------------------ the bride
export function brideSvg(o = {}) {
  const style = o.style || 'gown';
  const DRESS = 'url(#th-bride-dress)';
  const SKIRT = 'url(#th-bride-skirt)';
  const ACCENT = 'url(#th-bride-accent)';
  const HAIR = 'url(#th-bride-hair)';
  const bouquetFills = bouquetPalette(o.bouquet);
  const neck = `<rect x="91" y="118" width="18" height="28" rx="7" fill="${SKIN_SHADE}"/>`;
  const shoulders = `<path d="M74 149 Q100 139 126 149 L127 166 L73 166 Z" fill="${SKIN}"/>`;
  const veil = (len = 446, wide = 186) => `<path class="veil veil-back" d="M100 52 C150 70 ${wide - 10} 210 ${wide} ${len} L${200 - wide} ${len} C${210 - wide} 210 50 70 100 52 Z" fill="url(#g-veil)" stroke="#fff" stroke-opacity=".6" stroke-width="1.2"/>`;
  const tiara = (glow = false) => `<g class="tiara${glow ? ' tiara-glow' : ''}">
        <path d="M78 62 L84 52 L90 59 L100 46 L110 59 L116 52 L122 62 Q100 56 78 62 Z" fill="${ACCENT}"/>
        <circle cx="100" cy="51" r="3.2" fill="#f5fbff"/><circle cx="84" cy="56" r="1.8" fill="#ffd9e4"/><circle cx="116" cy="56" r="1.8" fill="#ffd9e4"/></g>`;
  const updo = `<ellipse cx="100" cy="84" rx="38" ry="39" fill="${HAIR}"/><circle class="bun" cx="100" cy="47" r="18" fill="${HAIR}"/>`;
  const fringe = `<path d="M66 92 C66 60 88 50 104 53 C124 56 136 70 134 94 C129 77 117 68 101 69 C92 76 80 81 66 92 Z" fill="${HAIR}"/>`;

  let body;
  let headBack = updo;
  let headFront = `${fringe}
      <path d="M67 92 C62 106 64 120 70 128" stroke="${HAIR}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M133 92 C138 106 136 120 130 128" stroke="${HAIR}" stroke-width="5" fill="none" stroke-linecap="round"/>
      ${tiara()}
      <path class="veil veil-front" d="M84 46 C70 60 64 84 62 112" stroke="#fff" stroke-opacity=".7" stroke-width="3" fill="none"/>`;
  let behind = '';
  let armOpts = {};

  if (style === 'aodai') {
    behind = `<path d="M70 92 C60 160 66 220 78 262 L122 262 C134 220 140 160 130 92 Z" fill="${HAIR}"/>`;
    body = aodaiBody({ fill: DRESS, accent: ACCENT, pants: o.pants || '#fffaf2' });
    armOpts = { sleeve: DRESS, sleeveWidth: 13 };
    headBack = `<ellipse cx="100" cy="86" rx="37" ry="38" fill="${HAIR}"/>`;
    headFront = `<path d="M66 94 C64 64 86 54 104 56 C124 58 136 72 134 96 C126 76 112 70 98 72 C86 78 76 84 66 94 Z" fill="${HAIR}"/>
      <g class="khan-van">
        <ellipse cx="100" cy="60" rx="43" ry="18" fill="url(#th-bride-head)"/>
        <ellipse cx="100" cy="58" rx="34" ry="11" fill="none" stroke="#fff3c4" stroke-width="2" opacity=".75"/>
        <path d="M62 62 Q100 76 138 62 M66 52 Q100 64 134 52" stroke="#8f0a1f" stroke-width="2" fill="none" opacity=".5"/>
        <circle cx="100" cy="50" r="4" fill="#fff3c4"/>
      </g>`;
  } else if (style === 'sleek') {
    behind = veil(452, 178);
    body = `${shoulders}
      <g class="skirt">
        <path d="M80 214 C76 290 86 352 84 396 C70 418 48 438 34 452 Q100 464 166 452 C152 438 130 418 116 396 C114 352 124 290 120 214 Q100 222 80 214 Z" fill="${SKIRT}"/>
        <path d="M96 222 C94 300 98 360 92 410 M106 222 C108 300 102 360 110 410" stroke="#fff" stroke-opacity=".6" stroke-width="2" fill="none"/>
        <path d="M44 446 Q100 430 156 446" stroke="#000" stroke-opacity=".06" stroke-width="3" fill="none"/>
        ${glints([[92, 300], [108, 340], [70, 440], [130, 438]])}
      </g>
      <path class="bodice" d="M75 158 L125 158 L122 214 Q100 220 78 214 Z" fill="${DRESS}"/>
      <path d="M78 212 Q100 217 122 212" stroke="${ACCENT}" stroke-width="2.5" fill="none"/>`;
    headBack = `<ellipse cx="100" cy="86" rx="37" ry="38" fill="${HAIR}"/><ellipse cx="128" cy="108" rx="12" ry="11" fill="${HAIR}"/>`;
    headFront = `<path d="M66 92 C64 62 86 50 104 52 C124 55 136 70 134 94 C120 70 96 64 66 92 Z" fill="${HAIR}"/>
      <circle cx="128" cy="100" r="3" fill="${ACCENT}"/><circle cx="133" cy="106" r="2.4" fill="#fff"/>
      <path class="veil veil-front" d="M120 70 C138 90 140 120 136 150" stroke="#fff" stroke-opacity=".7" stroke-width="3" fill="none"/>`;
  } else {
    const princess = style === 'princess';
    const lace = Array.from({ length: 14 }, (_, k) => {
      const x = (princess ? 8 : 18) + k * (princess ? 13.4 : 12);
      const y = 449 + Math.sin(((x - 18) / 164) * Math.PI) * 9;
      return `<path d="M${x} ${y} q6 9 12 0" stroke="#000" stroke-opacity=".07" stroke-width="2" fill="#fff" fill-opacity=".85"/>`;
    }).join('');
    const w = princess ? 8 : 0;
    behind = veil(446, princess ? 190 : 186) + `<path class="train" d="M30 430 Q100 470 170 430 L196 452 Q100 476 4 452 Z" fill="#000" fill-opacity=".06"/>`;
    body = `<g class="skirt">
        <path d="M76 216 C${60 - w} 290 ${34 - w} 370 ${16 - w} 447 Q100 467 ${184 + w} 447 C${166 + w} 370 140 290 124 216 Q100 226 76 216 Z" fill="${SKIRT}"/>
        <path d="M90 226 C82 300 66 380 54 452 M110 226 C118 300 134 380 146 452 M100 228 L100 459 M80 224 C66 300 46 380 34 450 M120 224 C134 300 154 380 166 450" stroke="#000" stroke-opacity=".07" stroke-width="2" fill="none"/>
        <path d="M70 260 Q100 280 130 260 M58 320 Q100 344 142 320" stroke="#fff" stroke-width="2.4" fill="none" opacity=".55"/>
        ${princess ? `<path d="M74 222 C50 300 30 380 12 446 Q100 470 188 446 C170 380 150 300 126 222 Q100 232 74 222 Z" fill="#fff" fill-opacity=".22"/>` : ''}
        ${lace}
        ${glints(princess ? [[60, 330], [132, 300], [90, 390], [150, 400], [110, 270], [48, 410], [80, 280], [140, 350], [70, 420], [120, 430], [30, 440], [170, 436]] : [[60, 330], [132, 300], [90, 390], [150, 400], [110, 270], [48, 410], [80, 280], [140, 350]], princess ? '#ffffff' : '#fff6d6', princess ? 2.4 : 1.8)}
      </g>
      ${shoulders}
      <path class="bodice" d="M71 160 Q85 150 100 160 Q115 150 129 160 L124 214 Q100 221 76 214 Z" fill="${DRESS}"/>
      <path d="M78 176 Q100 186 122 176 M80 194 Q100 202 120 194" stroke="#000" stroke-opacity=".07" stroke-width="1.4" fill="none"/>
      <path d="M74 210 Q100 218 126 210 L126 221 Q100 229 74 221 Z" fill="${ACCENT}"/>
      <circle cx="100" cy="220" r="4" fill="#fff8e4" stroke="#d7b061" stroke-width="1.4"/>
      ${princess ? `<ellipse cx="74" cy="160" rx="10" ry="7" fill="${DRESS}"/><ellipse cx="126" cy="160" rx="10" ry="7" fill="${DRESS}"/>` : ''}`;
    if (princess) {
      headBack = `<path d="M64 88 C56 150 64 200 74 232 L126 232 C136 200 144 150 136 88 Z" fill="${HAIR}"/><ellipse cx="100" cy="84" rx="38" ry="39" fill="${HAIR}"/>`;
      headFront = `${fringe}${tiara(true)}`;
    }
  }

  return rootSvg(
    `bride bride-${style}`,
    `${behind}${body}
    ${neck}
    ${style === 'aodai' ? '' : `<path d="M86 144 Q100 156 114 144" stroke="#f3ecdf" stroke-width="2.4" fill="none"/><circle cx="100" cy="153" r="2.6" fill="#f8f1ff"/>`}
    ${arm('l', armOpts)}${arm('r', armOpts, PROPS)}
    <g class="head">
      ${headBack}
      ${face({ lashes: true })}
      ${headFront}
    </g>
    ${bouquet(100, 232, 1.05, bouquetFills)}`
  );
}

// ------------------------------------------------------------------ the groom
export function groomSvg(o = {}) {
  const style = o.style || 'tux';
  const SUIT = 'url(#th-groom-suit)';
  const LAPEL = 'url(#th-groom-lapel)';
  const TIE = 'url(#th-groom-tie)';
  const shirt = o.shirt || '#fbfaf7';
  const sleeve = SUIT;
  const hair = `<path d="M65 94 C60 58 84 44 104 47 C128 50 140 68 135 96 C131 80 124 70 112 69 C101 77 84 73 73 82 C70 86 67 90 65 94 Z" fill="url(#g-hair-dark)"/>
      <path d="M84 52 C96 42 116 42 124 54 C114 50 100 50 90 58 Z" fill="#4c3d3a"/>`;
  let body;
  let headExtra = hair;
  if (style === 'aodai') {
    body = aodaiBody({ fill: SUIT, accent: LAPEL, pants: o.pants || '#fffaf2', narrow: true }) + `<ellipse cx="88" cy="448" rx="12" ry="5" fill="#1a1a1a"/><ellipse cx="112" cy="448" rx="12" ry="5" fill="#1a1a1a"/>`;
    headExtra = `<path d="M65 96 C62 70 80 62 100 62 C120 62 138 70 135 96 C128 82 116 78 100 78 C84 78 72 82 65 96 Z" fill="url(#g-hair-dark)"/>
      <g class="khan-dong">
        <path d="M60 70 Q100 40 140 70 L136 84 Q100 70 64 84 Z" fill="url(#th-groom-head)"/>
        <path d="M66 76 Q100 60 134 76 M68 70 Q100 54 132 70" stroke="#000" stroke-opacity=".25" stroke-width="1.6" fill="none"/>
        <path d="M64 82 Q100 68 136 82" stroke="${LAPEL}" stroke-width="2" fill="none"/>
      </g>`;
  } else {
    const prince = style === 'prince';
    body = `${suitedLegs(o.pants || '#1d1b27')}
      ${prince ? '<path d="M83 292 L79 438 M117 292 L121 438" stroke="#e9c46a" stroke-width="3"/>' : ''}
      <path class="jacket" d="M70 150 Q100 139 130 150 L135 252 L129 ${prince ? 280 : 304} L104 ${prince ? 284 : 298} L100 250 L96 ${prince ? 284 : 298} L71 ${prince ? 280 : 304} L65 252 Z" fill="${SUIT}"/>
      <path d="M90 147 L100 206 L110 147 Z" fill="${shirt}"/>
      <path d="M89 146 L100 206 L84 194 L77 158 Z" fill="${LAPEL}"/>
      <path d="M111 146 L100 206 L116 194 L123 158 Z" fill="${LAPEL}"/>
      <path d="M92 152 L100 156.5 L108 152 L108 163 L100 158.5 L92 163 Z" fill="${TIE}"/>
      ${prince
        ? `<path d="M74 150 L126 250" stroke="#c8102e" stroke-width="9" opacity=".9"/><path d="M74 150 L126 250" stroke="#fff" stroke-width="2" opacity=".6"/>
           <g fill="#f6e3a6">${[200, 216, 232, 248].map((y) => `<circle cx="92" cy="${y}" r="2.6"/><circle cx="108" cy="${y}" r="2.6"/>`).join('')}</g>
           <path d="M66 148 h20 v8 h-20 z M114 148 h20 v8 h-20 z" fill="#f6e3a6"/><path d="M68 156 v8 M74 156 v8 M80 156 v8 M120 156 v8 M126 156 v8 M132 156 v8" stroke="#f6e3a6" stroke-width="2"/>`
        : `<circle cx="100" cy="214" r="2.6" fill="#0c0b10"/><circle cx="100" cy="230" r="2.6" fill="#0c0b10"/>
           <path d="M78 182 L90 182 L88 188 L80 188 Z" fill="#fff4f6"/>
           <g class="boutonniere">${rose(119, 172, 6.2)}<ellipse cx="124" cy="179" rx="5" ry="2.2" fill="#86a77f" transform="rotate(35 124 179)"/></g>`}`;
  }
  return rootSvg(
    `groom groom-${style}`,
    `${body}
    <rect x="91" y="118" width="18" height="30" rx="7" fill="${SKIN_SHADE}"/>
    ${arm('l', { sleeve, sleeveWidth: style === 'aodai' ? 14 : 16, cuff: style === 'prince' ? '#f6e3a6' : shirt })}${arm('r', { sleeve, sleeveWidth: style === 'aodai' ? 14 : 16, cuff: style === 'prince' ? '#f6e3a6' : shirt, glove: style === 'prince' ? '#ffffff' : '' }, PROPS)}
    <g class="head">
      ${face()}
      ${headExtra}
    </g>`
  );
}

// ------------------------------------------------------------------ supporting cast
export function bridesmaidSvg(index = 0, { avatar = '', style = 'gown' } = {}) {
  const fill = `url(#th-bm-${index})`;
  const hair = `url(#th-bm-hair-${index})`;
  let body;
  if (style === 'aodai') {
    body = aodaiBody({ fill, accent: '#fff3c4', narrow: true });
  } else if (style === 'sleek') {
    body = `<path d="M82 212 C80 300 86 370 84 410 C76 426 66 440 60 450 Q100 458 140 450 C134 440 124 426 116 410 C114 370 120 300 118 212 Q100 220 82 212 Z" fill="${fill}"/>
      <path d="M76 149 Q100 140 124 149 L124 162 L76 162 Z" fill="${SKIN}"/>
      <path d="M77 158 L123 158 L120 214 Q100 220 80 214 Z" fill="${fill}"/>`;
  } else {
    body = `<path d="M80 212 C78 300 66 380 58 447 Q100 458 142 447 C134 380 122 300 120 212 Q100 220 80 212 Z" fill="${fill}"/>
      <path d="M92 222 C90 300 84 380 80 452 M108 222 C110 300 116 380 120 452" stroke="#fff" stroke-opacity=".35" stroke-width="2" fill="none"/>
      <path d="M76 149 Q100 140 124 149 L124 162 L76 162 Z" fill="${SKIN}"/>
      <path d="M74 158 Q100 150 126 158 L121 214 Q100 220 79 214 Z" fill="${fill}"/>
      <path d="M78 210 Q100 216 122 210" stroke="url(#g-gold)" stroke-width="3" fill="none"/>`;
  }
  return rootSvg(
    `bridesmaid v${index} bm-${style}`,
    `
    <path d="M70 90 C66 130 72 170 80 196 L120 196 C128 170 134 130 130 90 Z" fill="${hair}"/>
    ${body}
    <rect x="91" y="118" width="18" height="28" rx="7" fill="${SKIN_SHADE}"/>
    ${arm('l', style === 'aodai' ? { sleeve: fill, sleeveWidth: 13 } : {})}${arm('r', style === 'aodai' ? { sleeve: fill, sleeveWidth: 13 } : {}, PROPS)}
    <g class="head">
      <ellipse cx="100" cy="86" rx="37" ry="38" fill="${hair}"/>
      ${face({ lashes: true, avatar })}
      ${avatar ? '' : `<path d="M66 94 C64 62 86 50 104 52 C124 55 136 70 134 96 C126 74 110 66 96 70 C86 78 76 84 66 94 Z" fill="${hair}"/>`}
      <g transform="translate(124 66)">${rose(0, 0, 5)}${rose(-8, 3, 4, 'url(#g-rose-white)')}</g>
    </g>
    ${bouquet(100, 230, 0.72, ['url(#g-rose-white)', 'url(#g-rose)', 'url(#g-rose-white)'])}`
  );
}

function suitedBody({ suit, tie, longTie = true }) {
  return `
    <path d="M85 290 L81 440 L98 440 L100 298 Z" fill="#2f2c39"/>
    <path d="M115 290 L119 440 L102 440 L100 298 Z" fill="#35323f"/>
    <ellipse cx="88" cy="444" rx="12" ry="5.5" fill="#15131a"/><ellipse cx="112" cy="444" rx="12" ry="5.5" fill="#15131a"/>
    <path d="M71 150 Q100 140 129 150 L133 252 L128 300 L72 300 L67 252 Z" fill="${suit}"/>
    <path d="M90 147 L100 200 L110 147 Z" fill="#fbfaf7"/>
    ${longTie ? `<path d="M96 151 L104 151 L106 196 L100 205 L94 196 Z" fill="${tie}"/>` : `<path d="M92 152 L100 156 L108 152 L108 162 L100 158 L92 162 Z" fill="${tie}"/>`}
    <path d="M89 146 L100 200 L85 192 L78 158 Z" fill="#000" fill-opacity=".18"/>
    <path d="M111 146 L100 200 L115 192 L122 158 Z" fill="#000" fill-opacity=".18"/>
    <circle cx="100" cy="222" r="2.4" fill="#000" fill-opacity=".45"/>
    <rect x="91" y="118" width="18" height="30" rx="7" fill="${SKIN_SHADE}"/>`;
}

const GM_HAIR = ['url(#g-hair-dark)', 'url(#g-hair-brown)'];

export function groomsmanSvg(index = 0, { avatar = '', tie = '#f3a9bb' } = {}) {
  const suit = `url(#th-gm-${index})`;
  return rootSvg(
    `groomsman v${index}`,
    `
    ${suitedBody({ suit, tie })}
    <g transform="translate(119 172)">${rose(0, 0, 4.5, 'url(#g-rose-white)')}</g>
    ${arm('l', { sleeve: suit, sleeveWidth: 15, cuff: '#fbfaf7' })}${arm('r', { sleeve: suit, sleeveWidth: 15, cuff: '#fbfaf7' }, PROPS)}
    <g class="head">
      ${face({ avatar })}
      ${avatar ? '' : `<path d="M65 92 C62 58 86 46 104 48 C126 50 139 68 135 94 C130 78 120 68 108 70 C96 74 80 70 70 82 Z" fill="${GM_HAIR[index % 2]}"/>`}
    </g>`
  );
}

export function mcSvg({ tie = 'url(#g-gold)' } = {}) {
  const suit = 'url(#th-mc-suit)';
  return rootSvg(
    'mc',
    `
    ${suitedBody({ suit, tie })}
    <path d="M80 182 L92 182 L90 188 L82 188 Z" fill="url(#g-gold)"/>
    ${arm('l', { sleeve: suit, sleeveWidth: 15, cuff: '#fbfaf7' })}${arm('r', { sleeve: suit, sleeveWidth: 15, cuff: '#fbfaf7' }, PROPS)}
    <g class="head">
      ${face()}
      <path d="M65 90 C62 56 88 44 106 47 C128 51 138 68 134 92 C128 74 116 64 100 66 C88 68 76 74 65 90 Z" fill="#8c8a94"/>
      <g class="glasses" stroke="#3a3343" stroke-width="2" fill="#fff" fill-opacity=".12"><circle cx="87" cy="97" r="9"/><circle cx="113" cy="97" r="9"/><path d="M96 97 L104 97"/></g>
    </g>`
  );
}

// ------------------------------------------------------------------ viewers as guests
const GUEST_OUTFITS = ['#f6c7d2', '#f8e1b8', '#cfe3f3', '#d9cdee', '#cde8d4', '#f3d0b5', '#e9e1d4', '#f5b8c4'];
const GUEST_HAIR = ['url(#g-hair-dark)', 'url(#g-hair-brown)', 'url(#g-hair-blonde)', 'url(#g-hair-auburn)'];

function hashCode(s) {
  let h = 0;
  for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

const CROWD_SUITS = ['#3a3f58', '#2f2a33', '#5b4a63', '#44546a', '#6d5a4c'];

/** Cheap standing background guest (head, hair, body, arms) for the crowd at the back of the venue. */
export function crowdSvg(seed) {
  const h = hashCode(seed);
  const dress = h % 3 !== 0;
  const cloth = dress ? GUEST_OUTFITS[h % GUEST_OUTFITS.length] : CROWD_SUITS[h % CROWD_SUITS.length];
  const hair = GUEST_HAIR[(h >> 3) % GUEST_HAIR.length];
  const body = dress
    ? `<path d="M30 70 C24 92 16 150 12 196 L88 196 C84 150 76 92 70 70 Z" fill="${cloth}"/>`
    : `<path d="M26 70 C22 100 22 130 26 150 L74 150 C78 130 78 100 74 70 Z" fill="${cloth}"/><path d="M44 70 L50 92 L56 70" fill="#fff"/><path d="M30 150 L32 198 L47 198 L49 150 M51 150 L53 198 L68 198 L70 150" fill="#2a2630"/>`;
  const hairBack = dress ? `<path d="M28 38 C26 64 30 80 36 86 L64 86 C70 80 74 64 72 38 Z" fill="${hair}"/>` : '';
  return `<svg class="crowd-rig" viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg">
    ${hairBack}
    <g class="c-arm c-arm-l"><path d="M30 76 C20 100 18 120 20 136" stroke="${cloth}" stroke-width="12" fill="none" stroke-linecap="round"/></g>
    <g class="c-arm c-arm-r"><path d="M70 76 C80 100 82 120 80 136" stroke="${cloth}" stroke-width="12" fill="none" stroke-linecap="round"/></g>
    ${body}
    <rect x="44" y="58" width="12" height="14" fill="${SKIN_SHADE}"/>
    <ellipse cx="50" cy="42" rx="19" ry="21" fill="${SKIN}"/>
    <path d="M30 42 C28 20 42 14 52 15 C66 16 72 28 70 42 C64 30 56 28 50 30 C42 32 36 34 30 42 Z" fill="${hair}"/>
  </svg>`;
}

/** Walking full-body guest (used for arrivals and gift deliveries). */
export function guestWalkerSvg(seed, { avatar = '', carry = '' } = {}) {
  const h = hashCode(seed);
  const outfit = GUEST_OUTFITS[h % GUEST_OUTFITS.length];
  const hair = GUEST_HAIR[(h >> 3) % GUEST_HAIR.length];
  const dress = h % 2 === 0;
  const body = dress
    ? `<path d="M80 212 C76 300 70 360 66 420 Q100 430 134 420 C130 360 124 300 120 212 Z" fill="${outfit}"/>
       <path d="M86 420 L86 444 M114 420 L114 444" stroke="${SKIN}" stroke-width="8" stroke-linecap="round"/>
       <path d="M74 158 Q100 150 126 158 L121 214 Q100 220 79 214 Z" fill="${outfit}"/>`
    : `<path d="M85 290 L81 440 L98 440 L100 298 Z" fill="#4a4656"/><path d="M115 290 L119 440 L102 440 L100 298 Z" fill="#524e5f"/>
       <path d="M71 150 Q100 140 129 150 L133 252 L128 300 L72 300 L67 252 Z" fill="${outfit}"/>
       <path d="M90 147 L100 196 L110 147 Z" fill="#fbfaf7"/>`;
  const carried =
    carry === 'rose'
      ? bouquet(100, 228, 0.85).replace('class="prop prop-bouquet"', 'class="carry carry-rose"')
      : carry === 'gift'
        ? `<g class="carry" transform="translate(100 226)"><rect x="-18" y="-16" width="36" height="30" rx="3" fill="#fff6ee" stroke="#e7c89a"/><path d="M0 -16 L0 14 M-18 -2 L18 -2" stroke="#e98aa2" stroke-width="4"/><path d="M0 -16 q-12 -12 -14 -2 q8 2 14 2 q12 -12 14 -2 q-8 2 -14 2" fill="#f2a7b8"/></g>`
        : carry === 'cake'
          ? `<g class="carry" transform="translate(100 222)"><rect x="-16" y="-6" width="32" height="16" rx="3" fill="#fff7ee"/><rect x="-11" y="-18" width="22" height="13" rx="3" fill="#ffeef2"/><circle cx="0" cy="-21" r="4" fill="#f08aa6"/><path d="M-20 12 L20 12" stroke="url(#g-gold)" stroke-width="3"/></g>`
          : '';
  return rootSvg(
    `guest-walker`,
    `
    ${body}
    <rect x="91" y="118" width="18" height="30" rx="7" fill="${SKIN_SHADE}"/>
    ${arm('l', dress ? {} : { sleeve: outfit, sleeveWidth: 14 })}${arm('r', dress ? {} : { sleeve: outfit, sleeveWidth: 14 })}
    <g class="head">
      ${avatar ? '' : `<ellipse cx="100" cy="86" rx="37" ry="38" fill="${hair}"/>`}
      ${face({ avatar, lashes: dress })}
      ${avatar ? '' : `<path d="M65 92 C62 58 86 46 104 48 C126 50 139 68 135 94 C130 78 120 68 108 70 C96 74 80 70 70 82 Z" fill="${hair}"/>`}
    </g>
    ${carried}`
  );
}

/** Seated guest bust (head + shoulders) shown in chair rows / at tables. */
export function guestSeatSvg(seed, { avatar = '' } = {}) {
  const h = hashCode(seed);
  const outfit = GUEST_OUTFITS[h % GUEST_OUTFITS.length];
  const hair = GUEST_HAIR[(h >> 3) % GUEST_HAIR.length];
  const url = safeUrl(avatar);
  const head = url
    ? `<circle cx="60" cy="52" r="27" fill="#f6d2bd"/><image href="${escapeHtml(url)}" x="33" y="25" width="54" height="54" clip-path="url(#clip-face)" preserveAspectRatio="xMidYMid slice" referrerpolicy="no-referrer"/><circle cx="60" cy="52" r="27" fill="none" stroke="url(#g-gold)" stroke-width="3"/>`
    : `<ellipse cx="60" cy="50" rx="29" ry="29" fill="${hair}"/><ellipse cx="60" cy="56" rx="24" ry="25" fill="${SKIN}"/>
       <path d="M36 54 C34 32 50 24 62 25 C78 26 88 38 85 56 C80 42 70 38 60 40 C50 44 42 46 36 54 Z" fill="${hair}"/>
       <circle cx="51" cy="60" r="2.8" fill="#2f2224"/><circle cx="69" cy="60" r="2.8" fill="#2f2224"/>
       <path d="M54 69 Q60 74 66 69" stroke="#b4515d" stroke-width="2" fill="none" stroke-linecap="round"/>
       <ellipse cx="46" cy="67" rx="4" ry="2.4" fill="#f39aa6" opacity=".5"/><ellipse cx="74" cy="67" rx="4" ry="2.4" fill="#f39aa6" opacity=".5"/>`;
  return `<svg class="seat-rig" viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 140 C18 104 34 88 60 88 C86 88 102 104 102 140 Z" fill="${outfit}"/>
    <path d="M50 88 L60 106 L70 88" fill="#fff" fill-opacity=".7"/>
    <g class="seat-head">${head}</g>
  </svg>`;
}

// ------------------------------------------------------------------ actor runtime
/**
 * An Actor is a positioned character on the 1920×1080 stage. Position and depth
 * scaling are handled here; *what* it does is decided by the choreography layer.
 */
export class Actor {
  constructor(layer, { id, svg, x = 960, y = 800, facing = 1, size = 1, name = '', depth }) {
    this.id = id;
    this.layer = layer;
    this.depth = depth;
    this.size = size;
    this.facing = facing;
    this.x = x;
    this.y = y;
    this.el = document.createElement('div');
    this.pose = 'idle';
    this.expr = 'happy';
    this.el.className = `actor actor-${id.replace(/[^a-z0-9_-]/gi, '')} pose-idle expr-happy`;
    this.el.innerHTML = `<div class="actor-flip">${svg}</div>${name ? `<div class="actor-tag">${escapeHtml(name)}</div>` : ''}`;
    layer.appendChild(this.el);
    this.place(x, y);
  }

  scaleAt(y) {
    return (this.depth ? this.depth(y) : 1) * this.size;
  }

  apply() {
    const s = this.scaleAt(this.y);
    this.el.style.transform = `translate3d(${this.x}px, ${this.y}px, 0) translate(-50%, -100%) scale(${s})`;
    this.el.style.zIndex = String(Math.round(this.y));
    this.el.querySelector('.actor-flip').style.transform = `scaleX(${this.facing})`;
  }

  place(x, y) {
    this.el.style.transition = 'none';
    this.x = x;
    this.y = y;
    this.apply();
    void this.el.offsetWidth;
  }

  /** Walk (or glide) to a point. Resolves when the move completes. */
  moveTo(x, y, { ms, speed = 220, walk = true, ease = 'linear' } = {}) {
    const dist = Math.hypot(x - this.x, y - this.y);
    const dur = ms ?? Math.max(300, (dist / speed) * 1000);
    if (Math.abs(x - this.x) > 4) this.face(x > this.x ? 1 : -1);
    this.el.style.transition = `transform ${dur}ms ${ease}`;
    this.el.classList.toggle('walking', walk);
    this.x = x;
    this.y = y;
    this.apply();
    return new Promise((resolve) =>
      setTimeout(() => {
        this.el.classList.remove('walking');
        resolve();
      }, dur)
    );
  }

  face(dir) {
    this.facing = dir >= 0 ? 1 : -1;
    const flip = this.el.querySelector('.actor-flip');
    if (flip) flip.style.transform = `scaleX(${this.facing})`;
  }

  setPose(pose) {
    this.pose = pose;
    this.el.className = this.el.className.replace(/\bpose-[a-z]+/g, '').trim() + ` pose-${pose}`;
  }

  setExpr(expr) {
    this.expr = expr;
    this.el.className = this.el.className.replace(/\bexpr-[a-z]+/g, '').trim() + ` expr-${expr}`;
  }

  /** Entity view of this character (used by the debug panel / CharacterManager). */
  snapshot() {
    const walking = this.el.classList.contains('walking');
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      position: { x: Math.round(this.x), y: Math.round(this.y) },
      animation: walking ? 'walk' : this.pose || 'idle',
      emotion: this.expr || 'happy',
      outfit: this.outfit,
      visibility: !this.el.classList.contains('hidden'),
      state: walking ? 'moving' : 'still'
    };
  }

  /** One-shot reaction class (e.g. 'hop', 'spin'); removed automatically. */
  react(cls, ms = 900) {
    this.el.classList.remove(`react-${cls}`);
    void this.el.offsetWidth;
    this.el.classList.add(`react-${cls}`);
    setTimeout(() => this.el.classList.remove(`react-${cls}`), ms);
  }

  show(on = true) {
    this.el.classList.toggle('hidden', !on);
  }

  remove() {
    this.el.remove();
  }
}
