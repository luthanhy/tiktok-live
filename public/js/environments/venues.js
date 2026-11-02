/**
 * Venue architectures for the visual variants. Every venue shares the same stage
 * geometry (arch at x 960 / y 700, aisle, chair rows) so choreography works everywhere,
 * but the architecture, materials and props are different.
 *
 * In preparation mode (`prep: true`) decorations are tagged `decor d1…d4`; they appear as the
 * community fills the Preparation meter (#stage[data-prep] level, see stage.css).
 */
import { W, H, roseCluster, stringLights, floralArch, candle, chandelier, cypress } from './decor.js';

const ARCH_BASE = 700;

function aisle({ fill, edge, petals = [], rnd, prepRolled = false }) {
  const far = 905;
  const farR = 1015;
  const full = `<path d="M${far} ${ARCH_BASE} L${farR} ${ARCH_BASE} L1230 ${H} L690 ${H} Z" fill="${fill}"/>
       <path d="M${far} ${ARCH_BASE} L690 ${H} M${farR} ${ARCH_BASE} L1230 ${H}" stroke="${edge}" stroke-width="5"/>`;
  // During preparation the runner lies rolled up and unrolls as the last decoration stage.
  const runner = prepRolled
    ? `<g class="prep-only"><path d="M${far} ${ARCH_BASE} L${farR} ${ARCH_BASE} L1040 790 L880 790 Z" fill="${fill}"/><ellipse cx="960" cy="792" rx="84" ry="10" fill="${fill}" stroke="${edge}" stroke-width="3"/></g><g class="decor d4 unroll">${full}</g>`
    : full;
  const dots = prepRolled
    ? ''
    : Array.from({ length: 36 }, () => {
        const t = rnd();
        const side = rnd() < 0.5 ? -1 : 1;
        const y = ARCH_BASE + t * (H - ARCH_BASE);
        const half = 55 + t * 215;
        const x = 960 + side * (half + rnd() * 24 - 6);
        return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(3 + t * 6).toFixed(1)}" ry="${(2 + t * 3).toFixed(1)}" fill="${petals[Math.floor(rnd() * petals.length)] || '#fff'}"/>`;
      }).join('');
  return runner + dots;
}

/** Positions along both sides of the aisle, near → far scale. */
function aisleSides(ts = [0.12, 0.3, 0.52, 0.78]) {
  return ts.map((t) => ({ y: ARCH_BASE + 20 + t * (H - ARCH_BASE - 60), half: 80 + t * 260, s: 0.6 + t * 0.9 }));
}

function perspectiveTiles(color, top = 640) {
  let out = '';
  for (let r = 0; r < 9; r++) {
    const y0 = top + Math.pow(r / 9, 1.6) * (H - top);
    out += `<path d="M0 ${y0.toFixed(1)} L${W} ${y0.toFixed(1)}" stroke="${color}" stroke-width="${1 + r * 0.3}"/>`;
  }
  for (let c = -12; c <= 12; c++) out += `<path d="M${960 + c * 40} ${top} L${960 + c * 190} ${H}" stroke="${color}" stroke-width="1.3"/>`;
  return out;
}

export function lantern(x, y, s = 1, { color = '#d42a2a', gold = '#ffd36a', cls = '' } = {}) {
  return `<g class="lantern ${cls}" transform="translate(${x} ${y}) scale(${s})">
    <line x1="0" y1="-60" x2="0" y2="-26" stroke="${gold}" stroke-width="2"/>
    <ellipse cx="0" cy="0" rx="34" ry="44" fill="url(#warm-glow)" opacity=".55"/>
    <rect x="-14" y="-30" width="28" height="7" rx="2" fill="${gold}"/>
    <ellipse cx="0" cy="0" rx="24" ry="27" fill="${color}"/>
    <path d="M-12 -24 Q-20 0 -12 24 M0 -27 L0 27 M12 -24 Q20 0 12 24" stroke="#000" stroke-opacity=".18" stroke-width="2" fill="none"/>
    <rect x="-14" y="23" width="28" height="7" rx="2" fill="${gold}"/>
    <path d="M-4 30 L-6 52 M0 30 L0 56 M4 30 L6 52" stroke="${gold}" stroke-width="2"/>
  </g>`;
}

/** 囍 (Song Hỷ — double happiness) medallion. */
export function doubleHappiness(x, y, r, { fill = '#ffd36a', ring = '#ffd36a', bg = 'none' } = {}) {
  return `<g class="song-hy" transform="translate(${x} ${y})">
    <circle r="${r}" fill="${bg}" stroke="${ring}" stroke-width="${r * 0.05}"/>
    <circle r="${r * 0.86}" fill="none" stroke="${ring}" stroke-width="${r * 0.015}" stroke-dasharray="${r * 0.06} ${r * 0.05}"/>
    <text y="${r * 0.36}" text-anchor="middle" font-size="${r * 1.05}" font-weight="700" fill="${fill}" font-family="'Noto Serif SC','Songti SC','SimSun','Microsoft YaHei',serif">囍</text>
  </g>`;
}

function cloudMotif(x, y, s, color) {
  return `<path transform="translate(${x} ${y}) scale(${s})" d="M0 0 q10 -16 24 -6 q8 -14 22 -2 q14 -6 16 10 q-8 -4 -14 2 q-10 -8 -18 2 q-14 -6 -30 -6 z" fill="none" stroke="${color}" stroke-width="2.4"/>`;
}

function peachBranch(x, y, s, flip = 1, rnd) {
  let blossoms = '';
  for (let i = 0; i < 26; i++) {
    const t = rnd();
    const bx = x + flip * (t * 160 + (rnd() - 0.5) * 50) * s;
    const by = y - (t * 300 + (rnd() - 0.5) * 60) * s;
    blossoms += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="${(5 + rnd() * 5) * s}" fill="${rnd() < 0.5 ? '#ffb7c5' : '#ffd3dc'}"/><circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="${2 * s}" fill="#e2334f"/>`;
  }
  return `<g class="peach"><path d="M${x} ${y} C${x + flip * 40 * s} ${y - 120 * s} ${x + flip * 90 * s} ${y - 200 * s} ${x + flip * 160 * s} ${y - 300 * s} M${x + flip * 50 * s} ${y - 140 * s} C${x + flip * 10 * s} ${y - 210 * s} ${x - flip * 10 * s} ${y - 250 * s} ${x - flip * 20 * s} ${y - 300 * s}" stroke="#5a3a2a" stroke-width="${5 * s}" fill="none" stroke-linecap="round"/>${blossoms}</g>`;
}

function maMQua(x, y, s, cls = '') {
  return `<g class="mam-qua ${cls}" transform="translate(${x} ${y}) scale(${s})">
    <rect x="-70" y="0" width="140" height="56" rx="6" fill="#7a0f1d"/><rect x="-74" y="-6" width="148" height="10" rx="3" fill="#ffd36a"/>
    ${[-40, 0, 40].map((dx) => `<ellipse cx="${dx}" cy="-8" rx="20" ry="6" fill="#ffd36a"/><path d="M${dx - 18} -10 Q${dx} -44 ${dx + 18} -10 Z" fill="#c8102e"/><path d="M${dx - 18} -10 Q${dx} -44 ${dx + 18} -10" stroke="#ffd36a" stroke-width="1.6" fill="none"/><circle cx="${dx}" cy="-30" r="3" fill="#ffd36a"/>`).join('')}
  </g>`;
}

// ------------------------------------------------------------------ A. luxury ballroom
export function ballroomBack(rnd, { prep = false } = {}) {
  const pilasters = [0, 240, 480, 1440, 1680, 1920].map((x) => `<g><rect x="${x - 26}" y="70" width="52" height="570" fill="#000" fill-opacity=".04"/><rect x="${x - 22}" y="70" width="44" height="570" fill="url(#hall-wall)"/><rect x="${x - 30}" y="70" width="60" height="16" fill="url(#stage-gold)" opacity=".8"/><rect x="${x - 30}" y="616" width="60" height="24" fill="url(#stage-gold)" opacity=".6"/></g>`).join('');
  const windows = [120, 360, 1560, 1800]
    .map((x) => `<g transform="translate(${x} 110)"><path d="M-80 470 L-80 110 A80 80 0 0 1 80 110 L80 470 Z" fill="url(#window-eve)"/><path d="M-80 470 L-80 110 A80 80 0 0 1 80 110 L80 470 Z M0 30 L0 470 M-80 250 L80 250" stroke="url(#stage-gold)" stroke-width="6" fill="none"/><ellipse cx="0" cy="300" rx="120" ry="200" fill="url(#warm-glow)" opacity=".35"/></g>`)
    .join('');
  const sides = aisleSides();
  const candelabra = (x, y, s, cls) => `<g class="${cls}" transform="translate(${x} ${y}) scale(${s})">
      <path d="M-4 0 L-4 -120 M4 0 L4 -120" stroke="url(#stage-gold)" stroke-width="4"/><path d="M-30 -120 Q0 -100 30 -120" stroke="url(#stage-gold)" stroke-width="4" fill="none"/>
      ${[-30, 0, 30].map((dx) => candle(dx, dx === 0 ? -132 : -120, 0.5)).join('')}
      <ellipse cx="0" cy="2" rx="22" ry="6" fill="url(#stage-gold)"/></g>`;
  return `<svg class="scene-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
    <g class="L-far">
      <rect width="${W}" height="660" fill="url(#hall-wall)"/>
      <rect x="0" y="54" width="${W}" height="18" fill="url(#stage-gold)" opacity=".85"/>
      ${windows}${pilasters}
      <g transform="translate(960 360)">
        <path d="M-300 300 L-300 -40 A300 300 0 0 1 300 -40 L300 300 Z" fill="#fff" opacity=".35"/>
        <path d="M-300 300 L-300 -40 A300 300 0 0 1 300 -40 L300 300" stroke="url(#stage-gold)" stroke-width="10" fill="none"/>
        <ellipse cx="0" cy="40" rx="280" ry="260" fill="url(#warm-glow)" opacity=".55"/>
      </g>
      <path d="M-20 60 Q240 160 480 60 Q720 160 960 60 Q1200 160 1440 60 Q1680 160 1940 60 L1940 30 L-20 30 Z" fill="url(#drape)"/>
    </g>
    <g class="L-floor">
      <rect x="0" y="640" width="${W}" height="${H - 640}" fill="url(#marble)"/>${perspectiveTiles('#d9c7ad')}
      <path d="M700 700 L1220 700 L1260 740 L660 740 Z" fill="#fffaf2"/><path d="M660 740 L1260 740 L1290 770 L630 770 Z" fill="#f2e8da"/>
      ${aisle({ fill: '#f2e3c4', edge: 'url(#stage-gold)', petals: ['#fff', '#f3dfe3', '#efd9b8'], rnd, prepRolled: prep })}
    </g>
    <g class="L-props">
      ${chandelier(560, 130, 1, rnd).replace('class="chandelier"', `class="chandelier${prep ? ' decor d3' : ''}"`)}${chandelier(960, 110, 1.3, rnd).replace('class="chandelier"', `class="chandelier${prep ? ' decor d3' : ''}"`)}${chandelier(1360, 130, 1, rnd).replace('class="chandelier"', `class="chandelier${prep ? ' decor d3' : ''}"`)}
      ${floralArch(960, ARCH_BASE, 330, 470, rnd, { frame: '#e8d3a2', trim: '#b8913f', flowerClass: prep ? 'decor d4' : '' })}
      ${sides.map((p) => candelabra(960 - p.half - 20, p.y, p.s * 0.9, prep ? 'decor d2' : '') + candelabra(960 + p.half + 20, p.y, p.s * 0.9, prep ? 'decor d2' : '')).join('')}
      ${[640, 1280].map((x) => `<g class="${prep ? 'decor d1' : ''}" transform="translate(${x} 700)"><path d="M-14 0 L-10 -150 L10 -150 L14 0 Z" fill="#fffaf2"/><path d="M-34 -150 Q0 -120 34 -150 Z" fill="url(#stage-gold)"/>${roseCluster(0, -190, 54, 22, rnd)}${Array.from({ length: 7 }, (_, k) => `<path d="M${-40 + k * 13} -170 Q${-44 + k * 13} -120 ${-40 + k * 13} -70" stroke="#fff" stroke-width="2" opacity=".75"/><circle cx="${-40 + k * 13}" cy="-70" r="3" fill="#fff"/>`).join('')}</g>`).join('')}
      ${prep ? `<g class="prep-only"><g transform="translate(470 820)"><rect x="-90" y="-8" width="180" height="70" rx="6" fill="url(#cloth)"/><ellipse cx="0" cy="-8" rx="90" ry="12" fill="#fffdf9"/>${[-50, -20, 10, 40].map((dx, k) => `<rect x="${dx}" y="${-34 - k * 4}" width="34" height="24" rx="2" fill="#fffaf2" stroke="#d8b56a" transform="rotate(${-8 + k * 5} ${dx} -20)"/>`).join('')}<path d="M-60 -40 l10 -6 l10 6 l-10 6 z" fill="#c9a24f"/></g>
        <g transform="translate(1450 830)">${[0, 1, 2].map((k) => `<rect x="${-60 + k * 40}" y="${-40 - k * 10}" width="50" height="40" rx="3" fill="${['#fff6ee', '#f3e3d0', '#fffaf2'][k]}" stroke="#d8b56a"/><path d="M${-35 + k * 40} ${-40 - k * 10} v40" stroke="#c9a24f" stroke-width="4"/>`).join('')}</g></g>` : ''}
    </g>
  </svg>`;
}

export function ballroomFront(rnd) {
  return `<svg class="scene-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
    <g filter="url(#soft-blur)">
      <path d="M-40 -20 C40 200 0 600 50 1100 L-40 1100 Z" fill="url(#drape)"/>
      <path d="M1960 -20 C1880 200 1920 600 1870 1100 L1960 1100 Z" fill="url(#drape)"/>
      ${roseCluster(90, 1060, 130, 34, rnd)}${roseCluster(1830, 1060, 130, 34, rnd)}
    </g>
  </svg>`;
}

// ------------------------------------------------------------------ C. modern minimal
export function modernBack(rnd, { prep = false } = {}) {
  let skyline = '';
  let x = 560;
  while (x < 1360) {
    const w = 30 + rnd() * 60;
    const h = 80 + rnd() * 200;
    skyline += `<rect x="${x.toFixed(0)}" y="${(560 - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="${rnd() < 0.5 ? '#2a2c34' : '#363944'}"/>`;
    for (let wy = 560 - h + 10; wy < 550; wy += 18) for (let wx = x + 6; wx < x + w - 6; wx += 12) if (rnd() < 0.35) skyline += `<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="5" height="7" fill="#f0d79a" opacity=".8"/>`;
    x += w + 4;
  }
  const sides = aisleSides();
  const tubeCandle = (cx, y, s, cls) => `<g class="${cls}" transform="translate(${cx} ${y}) scale(${s})"><rect x="-12" y="-110" width="24" height="110" fill="#fff" fill-opacity=".3" stroke="#c8a45a" stroke-width="2"/>${candle(0, -6, 0.45)}<rect x="-16" y="-4" width="32" height="6" fill="#c8a45a"/></g>`;
  const pampas = (cx, cy, s, flip = 1) => Array.from({ length: 9 }, (_, k) => `<path d="M${cx} ${cy} q${flip * (20 + k * 12) * s} ${-(60 + k * 10) * s} ${flip * (40 + k * 16) * s} ${-(120 + k * 6) * s}" stroke="#e7dcc6" stroke-width="${7 * s}" stroke-linecap="round" fill="none" opacity=".9"/>`).join('');
  return `<svg class="scene-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
    <g class="L-far">
      <rect width="${W}" height="660" fill="url(#hall-wall)"/>
      <rect x="520" y="180" width="880" height="400" fill="url(#window-eve)"/>${skyline}
      <rect x="520" y="180" width="880" height="400" fill="none" stroke="#111" stroke-width="10"/>
      <path d="M813 180 L813 580 M1106 180 L1106 580" stroke="#111" stroke-width="5"/>
      ${[80, 300, 1620, 1840].map((px) => `<rect x="${px - 90}" y="110" width="180" height="520" fill="none" stroke="#111" stroke-width="2.5"/>`).join('')}
      <rect x="0" y="626" width="${W}" height="14" fill="#111"/>
    </g>
    <g class="L-floor">
      <rect x="0" y="640" width="${W}" height="${H - 640}" fill="url(#marble)"/>${perspectiveTiles('#d0cec9')}
      <ellipse cx="960" cy="720" rx="420" ry="40" fill="#fff" opacity=".6"/>
      ${aisle({ fill: '#121215', edge: '#c8a45a', petals: ['#ffffff', '#e8e2d4'], rnd, prepRolled: prep })}
    </g>
    <g class="L-props">
      <g class="${prep ? 'decor d3' : ''}">${[420, 700, 1220, 1500].map((lx) => `<rect x="${lx - 110}" y="96" width="220" height="5" rx="2" fill="#f7e8c0"/><rect x="${lx - 110}" y="92" width="220" height="14" rx="4" fill="url(#warm-glow)" opacity=".9"/><line x1="${lx - 90}" y1="0" x2="${lx - 90}" y2="94" stroke="#111"/><line x1="${lx + 90}" y1="0" x2="${lx + 90}" y2="94" stroke="#111"/>`).join('')}</g>
      <g class="modern-arch">
        <circle cx="960" cy="470" r="232" fill="none" stroke="#111" stroke-width="14"/>
        <circle cx="960" cy="470" r="232" fill="none" stroke="#c8a45a" stroke-width="2" transform="translate(0 -4)"/>
        <rect x="900" y="${ARCH_BASE - 6}" width="120" height="14" fill="#111"/>
        <g class="${prep ? 'decor d1' : ''}">${pampas(775, 620, 1, -1)}${roseCluster(790, 600, 70, 26, rnd)}</g>
        <g class="${prep ? 'decor d4' : ''}">${pampas(1140, 300, 0.8, 1)}${roseCluster(1140, 330, 60, 22, rnd)}</g>
      </g>
      ${sides.map((p) => tubeCandle(960 - p.half - 10, p.y, p.s * 0.85, prep ? 'decor d2' : '') + tubeCandle(960 + p.half + 10, p.y, p.s * 0.85, prep ? 'decor d2' : '')).join('')}
      ${prep ? `<g class="prep-only"><g transform="translate(1450 820)"><rect x="-80" y="-60" width="160" height="60" fill="#111"/><rect x="-80" y="-64" width="160" height="6" fill="#c8a45a"/>${[-50, -10, 30].map((dx) => `<rect x="${dx}" y="-90" width="26" height="30" fill="#fff" stroke="#111"/>`).join('')}</g></g>` : ''}
    </g>
  </svg>`;
}

export function modernFront(rnd) {
  return `<svg class="scene-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
    <g filter="url(#soft-blur)" opacity=".95">${roseCluster(70, 1060, 120, 30, rnd)}${roseCluster(1850, 1060, 120, 30, rnd)}
      <rect x="-20" y="0" width="60" height="${H}" fill="#111"/><rect x="${W - 40}" y="0" width="60" height="${H}" fill="#111"/></g>
  </svg>`;
}

// ------------------------------------------------------------------ D. fairytale castle garden
export function castleBack(rnd, { prep = false } = {}) {
  let stars = '';
  for (let i = 0; i < 180; i++) stars += `<circle class="bulb tw${i % 4}" cx="${(rnd() * W).toFixed(0)}" cy="${(rnd() * 420).toFixed(0)}" r="${(0.8 + rnd() * 2).toFixed(1)}" fill="#fff8e6"/>`;
  const tower = (x, base, w, h, roof) => `<rect x="${x - w / 2}" y="${base - h}" width="${w}" height="${h}" fill="#3a3270"/><path d="M${x - w / 2 - 8} ${base - h} L${x} ${base - h - roof} L${x + w / 2 + 8} ${base - h} Z" fill="#2a2458"/><line x1="${x}" y1="${base - h - roof}" x2="${x}" y2="${base - h - roof - 26}" stroke="#e9e2ff" stroke-width="2"/><path d="M${x} ${base - h - roof - 26} l18 6 l-18 6 z" fill="#ff9fd8"/>${Array.from({ length: Math.floor(h / 40) }, (_, k) => `<rect x="${x - 5}" y="${base - h + 20 + k * 40}" width="10" height="16" rx="5" fill="#ffe7a8" class="bulb tw${k % 4}"/>`).join('')}`;
  const glowFlower = (gx, gy, s, cls = '') => `<g class="${cls}" transform="translate(${gx} ${gy}) scale(${s})"><ellipse cx="0" cy="-20" rx="60" ry="40" fill="url(#pink-glow)" opacity=".5"/>${Array.from({ length: 9 }, (_, k) => { const a = (k / 9) * Math.PI - Math.PI; return `<path d="M0 0 Q${Math.cos(a) * 20} ${-30 + Math.sin(a) * 10} ${Math.cos(a) * 34} ${-44 + Math.sin(a) * 18}" stroke="#7fd8b8" stroke-width="3" fill="none"/><circle class="glow-bud" cx="${Math.cos(a) * 34}" cy="${-44 + Math.sin(a) * 18}" r="7" fill="${k % 2 ? '#a8ecff' : '#d9c9ff'}"/>`; }).join('')}</g>`;
  const sides = aisleSides();
  const lamp = (lx, ly, s, cls) => `<g class="${cls}" transform="translate(${lx} ${ly}) scale(${s})"><rect x="-3" y="-120" width="6" height="120" fill="#cfc6f5"/><path d="M-16 -120 L16 -120 L10 -150 L-10 -150 Z" fill="#e9e2ff" opacity=".6"/><circle cx="0" cy="-135" r="9" fill="#bff3ff" class="glow-bud"/><ellipse cx="0" cy="-135" rx="40" ry="40" fill="url(#pink-glow)" opacity=".45"/></g>`;
  return `<svg class="scene-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
    <g class="L-far">
      <rect width="${W}" height="${H}" fill="url(#sky-golden)"/>${stars}
      <circle cx="380" cy="160" r="52" fill="#fff6e0"/><circle cx="400" cy="148" r="52" fill="#2a2458" opacity=".9"/>
      <g filter="url(#far-blur)" opacity=".95">
        <path d="M0 560 Q300 420 620 520 T1300 480 T1920 520 L1920 660 L0 660 Z" fill="#4a3f86"/>
        <g transform="translate(1440 0)">${tower(-120, 560, 60, 230, 90)}${tower(0, 560, 90, 300, 120)}${tower(110, 560, 60, 200, 80)}<rect x="-150" y="420" width="290" height="140" fill="#3a3270"/>${Array.from({ length: 7 }, (_, k) => `<rect x="${-140 + k * 40}" y="404" width="22" height="18" fill="#3a3270"/>`).join('')}<path d="M-20 560 L-20 500 A20 20 0 0 1 20 500 L20 560 Z" fill="#ffe7a8"/></g>
      </g>
    </g>
    <g class="L-mid">
      <path d="M0 600 Q480 560 960 590 T1920 600 L1920 700 L0 700 Z" fill="#3c3478"/>
      ${[150, 330, 1600, 1780].map((tx) => `<g><rect x="${tx - 8}" y="440" width="16" height="200" fill="#2a2458"/>${Array.from({ length: 10 }, () => `<circle cx="${(tx + (rnd() - 0.5) * 160).toFixed(0)}" cy="${(380 + rnd() * 160).toFixed(0)}" r="${(30 + rnd() * 34).toFixed(0)}" fill="#4b3f8f" opacity=".95"/>`).join('')}${Array.from({ length: 14 }, (_, k) => `<circle class="bulb tw${k % 4}" cx="${(tx + (rnd() - 0.5) * 170).toFixed(0)}" cy="${(370 + rnd() * 180).toFixed(0)}" r="3" fill="#bff3ff"/>`).join('')}</g>`).join('')}
    </g>
    <g class="L-floor">
      <rect x="0" y="640" width="${W}" height="${H - 640}" fill="url(#marble)"/>
      ${prep ? '' : Array.from({ length: 30 }, (_, k) => { const t = k / 30; const y = ARCH_BASE + t * (H - ARCH_BASE); const half = 40 + t * 180; return `<ellipse cx="${(960 + (k % 2 ? 1 : -1) * half * rnd()).toFixed(0)}" cy="${y.toFixed(0)}" rx="${(10 + t * 30).toFixed(0)}" ry="${(4 + t * 10).toFixed(0)}" fill="#bff3ff" opacity=".55" class="glow-bud"/>`; }).join('')}
      <path d="M905 ${ARCH_BASE} L1015 ${ARCH_BASE} L1230 ${H} L690 ${H} Z" fill="#e9e2ff" opacity="${prep ? 0.2 : 0.28}"/>
    </g>
    <g class="L-props">
      <g class="${prep ? 'decor d3' : ''} lights">${stringLights(-40, 760, 120, 60, 22, rnd)}${stringLights(1160, 1960, 120, 60, 22, rnd)}</g>
      ${floralArch(960, ARCH_BASE, 330, 470, rnd, { frame: '#e9e2ff', trim: '#a8ecff', flowerClass: prep ? 'decor d4' : '' })}
      <g class="${prep ? 'decor d1' : ''}">${[620, 1300, 480, 1440].map((fx, k) => glowFlower(fx, 720 + (k > 1 ? 60 : 0), 1 + (k > 1 ? 0.3 : 0))).join('')}</g>
      ${sides.map((p) => lamp(960 - p.half - 16, p.y, p.s * 0.85, prep ? 'decor d2' : '') + lamp(960 + p.half + 16, p.y, p.s * 0.85, prep ? 'decor d2' : '')).join('')}
    </g>
  </svg>`;
}

export function castleFront(rnd) {
  return `<svg class="scene-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
    <g filter="url(#soft-blur)">${roseCluster(80, 1060, 140, 36, rnd)}${roseCluster(1840, 1060, 140, 36, rnd)}
      ${Array.from({ length: 8 }, (_, i) => `<path d="M${20 + i * 24} -10 C${30 + i * 24} 90 ${10 + i * 24} 170 ${26 + i * 24} ${200 + (i % 3) * 40}" stroke="#8a7ad6" stroke-width="9" stroke-linecap="round" fill="none" opacity=".8"/><circle cx="${26 + i * 24}" cy="${200 + (i % 3) * 40}" r="6" fill="#bff3ff"/>`).join('')}
      ${Array.from({ length: 8 }, (_, i) => `<path d="M${1900 - i * 24} -10 C${1890 - i * 24} 90 ${1910 - i * 24} 170 ${1894 - i * 24} ${200 + (i % 3) * 40}" stroke="#8a7ad6" stroke-width="9" stroke-linecap="round" fill="none" opacity=".8"/><circle cx="${1894 - i * 24}" cy="${200 + (i % 3) * 40}" r="6" fill="#ffd6f4"/>`).join('')}</g>
  </svg>`;
}

// ------------------------------------------------------------------ E. Vietnamese modern
export function vietBack(rnd, { prep = false } = {}) {
  const sides = aisleSides();
  let clouds = '';
  for (let i = 0; i < 14; i++) clouds += cloudMotif(560 + (i % 7) * 120 + (i > 6 ? 60 : 0), 150 + (i > 6 ? 300 : 0) + (i % 2) * 30, 1.2, '#ffd36a');
  const gate = `<g class="viet-gate">
      <rect x="770" y="300" width="26" height="${ARCH_BASE - 300}" fill="#c8102e"/><rect x="1124" y="300" width="26" height="${ARCH_BASE - 300}" fill="#c8102e"/>
      <rect x="770" y="300" width="26" height="${ARCH_BASE - 300}" fill="none" stroke="#ffd36a" stroke-width="3"/><rect x="1124" y="300" width="26" height="${ARCH_BASE - 300}" fill="none" stroke="#ffd36a" stroke-width="3"/>
      <path d="M730 300 Q960 220 1190 300 L1170 330 Q960 262 750 330 Z" fill="#c8102e" stroke="#ffd36a" stroke-width="3"/>
      ${doubleHappiness(960, 296, 46, { bg: '#c8102e' })}
      <g class="${prep ? 'decor d4' : ''}">${Array.from({ length: 16 }, (_, k) => roseCluster(783, 320 + k * 24, 22, 3, rnd) + roseCluster(1137, 320 + k * 24, 22, 3, rnd)).join('')}${Array.from({ length: 12 }, (_, k) => roseCluster(760 + k * 36, 300 - Math.sin((k / 11) * Math.PI) * 60, 24, 4, rnd)).join('')}</g>
    </g>`;
  return `<svg class="scene-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
    <g class="L-far">
      <rect width="${W}" height="660" fill="#fbeee2"/>
      <rect x="440" y="60" width="1040" height="580" fill="url(#hall-wall)"/>
      <rect x="440" y="60" width="1040" height="580" fill="none" stroke="#ffd36a" stroke-width="8"/>
      <rect x="462" y="82" width="996" height="536" fill="none" stroke="#ffd36a" stroke-width="2"/>
      ${clouds}
      ${[180, 1740].map((px) => `<g><rect x="${px - 34}" y="40" width="68" height="600" fill="#a00d24"/><rect x="${px - 34}" y="40" width="68" height="600" fill="none" stroke="#ffd36a" stroke-width="4"/><rect x="${px - 46}" y="30" width="92" height="20" fill="#ffd36a"/></g>`).join('')}
    </g>
    <g class="L-floor">
      <rect x="0" y="640" width="${W}" height="${H - 640}" fill="url(#marble)"/>${perspectiveTiles('#c9a07a')}
      ${aisle({ fill: '#c8102e', edge: '#ffd36a', petals: ['#ffd6dc', '#ffd36a', '#fff'], rnd, prepRolled: prep })}
    </g>
    <g class="L-props">
      <g class="${prep ? 'decor d1' : ''}">${[340, 560, 1360, 1580].map((lx, k) => lantern(lx, 150 + (k % 2) * 40, 1.15)).join('')}${[760, 960, 1160].map((lx) => lantern(lx, 40, 0.8)).join('')}</g>
      <g class="${prep ? 'decor d2' : ''}">${peachBranch(560, 700, 1, -1, rnd)}${peachBranch(1360, 700, 1, 1, rnd)}<g transform="translate(560 700)"><path d="M-30 0 L-22 -70 L22 -70 L30 0 Z" fill="#c8102e" stroke="#ffd36a" stroke-width="3"/></g><g transform="translate(1360 700)"><path d="M-30 0 L-22 -70 L22 -70 L30 0 Z" fill="#c8102e" stroke="#ffd36a" stroke-width="3"/></g></g>
      ${gate}
      <g class="${prep ? 'decor d3' : ''}">${maMQua(640, 760, 0.9)}${maMQua(1280, 760, 0.9)}</g>
      ${sides.map((p) => candle(960 - p.half - 10, p.y, p.s * 0.8) + candle(960 + p.half + 10, p.y, p.s * 0.8)).join('').replace(/class="candle"/g, `class="candle${prep ? ' decor d2' : ''}"`)}
    </g>
  </svg>`;
}

export function vietFront(rnd) {
  return `<svg class="scene-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
    <g filter="url(#soft-blur)">${lantern(60, 120, 1.8)}${lantern(1860, 120, 1.8)}${peachBranch(-20, 1100, 1.6, 1, rnd)}${peachBranch(1940, 1100, 1.6, -1, rnd)}</g>
  </svg>`;
}

/** Variant-specific extras layered onto the shared reception / dance / grand builders. */
export function venueExtras(variantId, scene) {
  if (variantId === 'vietnamese') {
    if (scene === 'reception') return [300, 620, 1300, 1620].map((x, k) => lantern(x, 120 + (k % 2) * 30, 1)).join('');
    if (scene === 'dance') return [200, 520, 1400, 1720].map((x) => lantern(x, 140, 1.1)).join('');
    if (scene === 'grand') return [240, 420, 1500, 1680].map((x, k) => lantern(x, 180 + (k % 2) * 40, 1.2)).join('');
  }
  if (variantId === 'fairytale' && scene === 'grand') {
    return `<g filter="url(#far-blur)" opacity=".8" transform="translate(960 0)"><rect x="-500" y="380" width="1000" height="200" fill="#2a2458"/>${[-420, -240, 240, 420].map((tx) => `<rect x="${tx - 30}" y="250" width="60" height="330" fill="#2a2458"/><path d="M${tx - 40} 250 L${tx} 150 L${tx + 40} 250 Z" fill="#1d1846"/>`).join('')}</g>`;
  }
  if (variantId === 'modern' && (scene === 'reception' || scene === 'grand')) {
    return [360, 960, 1560].map((x) => `<rect x="${x - 160}" y="${scene === 'grand' ? 60 : 210}" width="320" height="6" rx="3" fill="#f7e8c0"/><rect x="${x - 160}" y="${scene === 'grand' ? 54 : 204}" width="320" height="18" rx="6" fill="url(#warm-glow)" opacity=".8"/>`).join('');
  }
  return '';
}

export { cypress };
