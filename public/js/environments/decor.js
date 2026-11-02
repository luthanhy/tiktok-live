/**
 * Decorative SVG generators shared by every venue (flowers, arches, candles, lights, furniture).
 */
export const W = 1920;
export const H = 1080;

// Deterministic pseudo-random so scenes look identical on every reload / OBS refresh.
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}


// ------------------------------------------------------------------ decorative generators
let FLOWERS = ['#f6b6c8', '#fbe9ee', '#e98aa6', '#fff7ef', '#f4c7a1'];

/** The active visual variant sets the default flower colours for every arrangement. */
export function setFlowerPalette(colors) {
  if (Array.isArray(colors) && colors.length) FLOWERS = colors;
}

export function roseCluster(cx, cy, r, count, rnd, palette = FLOWERS) {
  let out = '';
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * r;
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d * 0.8;
    const rr = 5 + rnd() * 7;
    if (rnd() < 0.35) out += `<ellipse cx="${(x + rr).toFixed(1)}" cy="${(y + 2).toFixed(1)}" rx="${(rr * 1.1).toFixed(1)}" ry="${(rr * 0.45).toFixed(1)}" fill="#8fae86" transform="rotate(${Math.round(rnd() * 360)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    const c = palette[Math.floor(rnd() * palette.length)];
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr.toFixed(1)}" fill="${c}"/><circle cx="${(x - rr * 0.25).toFixed(1)}" cy="${(y - rr * 0.25).toFixed(1)}" r="${(rr * 0.45).toFixed(1)}" fill="#fff" fill-opacity=".35"/>`;
  }
  return out;
}

export function stringLights(x1, x2, y, sag, bulbs, rnd, cls = 'bulb') {
  const mx = (x1 + x2) / 2;
  let out = `<path d="M${x1} ${y} Q${mx} ${y + sag * 2} ${x2} ${y}" stroke="#6b5a4a" stroke-opacity=".5" stroke-width="1.6" fill="none"/>`;
  for (let i = 1; i < bulbs; i++) {
    const t = i / bulbs;
    const x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * mx + t * t * x2;
    const yy = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * (y + sag * 2) + t * t * y;
    out += `<circle class="${cls} tw${Math.floor(rnd() * 4)}" cx="${x.toFixed(1)}" cy="${(yy + 4).toFixed(1)}" r="${(3 + rnd() * 1.5).toFixed(1)}" fill="#fff4cf"/>`;
  }
  return out;
}

export function floralArch(cx, baseY, width, height, rnd, { drape = true, frame = '#f3ece0', trim = '#d8c39a', flowerClass = '', palette } = {}) {
  const l = cx - width / 2;
  const r = cx + width / 2;
  const top = baseY - height;
  const archPath = `M${l} ${baseY} L${l} ${top + width / 2} A${width / 2} ${width / 2} 0 0 1 ${r} ${top + width / 2} L${r} ${baseY}`;
  let flowers = '';
  const steps = 46;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let x;
    let y;
    const arcLen = Math.PI * (width / 2);
    const legLen = height - width / 2;
    const total = legLen * 2 + arcLen;
    const d = t * total;
    if (d < legLen) {
      x = l;
      y = baseY - d;
    } else if (d < legLen + arcLen) {
      const a = Math.PI - ((d - legLen) / arcLen) * Math.PI;
      x = cx + Math.cos(a) * (width / 2);
      y = top + width / 2 - Math.sin(a) * (width / 2);
    } else {
      x = r;
      y = top + width / 2 + (d - legLen - arcLen);
    }
    const heavy = d > legLen * 0.55 && d < legLen + arcLen + legLen * 0.45;
    if (heavy || i % 3 === 0) flowers += roseCluster(x, y, heavy ? 30 : 18, heavy ? 6 : 3, rnd, palette);
  }
  const drapes = drape
    ? `<path d="M${l + 10} ${top + width / 2 - 40} C${l + 60} ${top + width / 2 + 60} ${l + 30} ${baseY - 120} ${l - 30} ${baseY}" stroke="#fff" stroke-opacity=".85" stroke-width="22" fill="none" stroke-linecap="round"/>
       <path d="M${r - 10} ${top + width / 2 - 40} C${r - 60} ${top + width / 2 + 60} ${r - 30} ${baseY - 120} ${r + 30} ${baseY}" stroke="#fff" stroke-opacity=".85" stroke-width="22" fill="none" stroke-linecap="round"/>
       <path d="M${l + 30} ${top + width / 2 - 70} Q${cx} ${top + width / 2 + 40} ${r - 30} ${top + width / 2 - 70}" stroke="#fde7ee" stroke-opacity=".9" stroke-width="16" fill="none"/>`
    : '';
  return `<g class="arch">
    <ellipse cx="${cx}" cy="${baseY + 6}" rx="${width * 0.75}" ry="18" fill="#000" fill-opacity=".08"/>
    <path d="${archPath}" stroke="${frame}" stroke-width="16" fill="none"/>
    <path d="${archPath}" stroke="${trim}" stroke-width="3" fill="none" transform="translate(0 -2)"/>
    ${drapes}<g class="${flowerClass}">${flowers}</g>
  </g>`;
}

export function candle(x, y, s = 1) {
  return `<g class="candle" transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="-58" rx="26" ry="26" fill="url(#warm-glow)" class="flame-glow"/>
    <rect x="-9" y="-46" width="18" height="46" rx="3" fill="#fffaf0"/><rect x="-9" y="-46" width="5" height="46" fill="#000" fill-opacity=".05"/>
    <path class="flame" d="M0 -64 C5 -56 5 -50 0 -47 C-5 -50 -5 -56 0 -64 Z" fill="#ffd27a"/>
    <rect x="-14" y="-2" width="28" height="6" rx="2" fill="url(#g-gold)"/>
  </g>`;
}

export function flowerStand(x, y, s, rnd) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-10 0 L-6 -90 L6 -90 L10 0 Z" fill="#f4ede2"/><rect x="-24" y="-96" width="48" height="10" rx="3" fill="url(#g-gold)"/>
    <path d="M-22 -96 Q0 -80 22 -96" fill="#efe6d8"/>
    ${roseCluster(0, -122, 36, 14, rnd)}
  </g>`;
}

export function tree(x, y, s, color = '#9db98a', rnd) {
  let leaves = '';
  for (let i = 0; i < 7; i++) leaves += `<circle cx="${(x + (rnd() - 0.5) * 90 * s).toFixed(1)}" cy="${(y - 150 * s - rnd() * 90 * s).toFixed(1)}" r="${(40 + rnd() * 30) * s}" fill="${color}"/>`;
  return `<rect x="${x - 6 * s}" y="${y - 140 * s}" width="${12 * s}" height="${140 * s}" fill="#8a7462"/>${leaves}`;
}

export function cypress(x, y, s, color = '#8eac80') {
  return `<path d="M${x} ${y - 260 * s} C${x + 34 * s} ${y - 160 * s} ${x + 30 * s} ${y - 40 * s} ${x} ${y} C${x - 30 * s} ${y - 40 * s} ${x - 34 * s} ${y - 160 * s} ${x} ${y - 260 * s} Z" fill="${color}"/>`;
}

export function chandelier(x, y, s, rnd) {
  let crystals = '';
  for (let i = -4; i <= 4; i++) crystals += `<path d="M${x + i * 22 * s} ${y + 40 * s} l${-4 * s} ${16 * s} l${4 * s} ${8 * s} l${4 * s} ${-8 * s} z" fill="#fff" fill-opacity=".85"/>`;
  return `<g class="chandelier">
    <line x1="${x}" y1="0" x2="${x}" y2="${y - 20 * s}" stroke="#c9a565" stroke-width="2"/>
    <ellipse cx="${x}" cy="${y + 30 * s}" rx="${150 * s}" ry="${90 * s}" fill="url(#warm-glow)" opacity=".7" class="flame-glow"/>
    <path d="M${x - 100 * s} ${y + 20 * s} Q${x} ${y + 70 * s} ${x + 100 * s} ${y + 20 * s}" stroke="url(#g-gold)" stroke-width="${5 * s}" fill="none"/>
    <path d="M${x - 60 * s} ${y} Q${x} ${y + 40 * s} ${x + 60 * s} ${y}" stroke="url(#g-gold)" stroke-width="${4 * s}" fill="none"/>
    ${crystals}
    ${[-100, -60, 0, 60, 100].map((dx) => `<circle class="bulb tw${Math.floor(rnd() * 4)}" cx="${x + dx * s}" cy="${y + (Math.abs(dx) === 100 ? 14 : Math.abs(dx) === 60 ? -4 : 30) * s}" r="${6 * s}" fill="#fff5d6"/>`).join('')}
  </g>`;
}

export function roundTable(x, y, s, rnd) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="34" rx="130" ry="20" fill="#000" fill-opacity=".08"/>
    <path d="M-120 -10 L-126 34 Q0 58 126 34 L120 -10 Z" fill="url(#cloth)"/>
    <ellipse cx="0" cy="-10" rx="120" ry="30" fill="#fffdf9"/>
    <path d="M-112 -2 Q0 30 112 -2" stroke="#f3c6d2" stroke-width="5" fill="none"/>
    <rect x="-5" y="-70" width="10" height="56" fill="#e9dccb"/>
    ${roseCluster(0, -86, 30, 12, rnd)}
    ${candle(-60, -8, 0.45)}${candle(60, -8, 0.45)}
  </g>`;
}

export function weddingCake(x, y, s) {
  const tiers = [[120, 70], [96, 62], [74, 54], [54, 46], [36, 38]];
  let out = '';
  let yy = 0;
  tiers.forEach(([w, h], i) => {
    out += `<rect x="${-w / 2}" y="${yy - h}" width="${w}" height="${h}" rx="6" fill="url(#cake)"/>`;
    out += `<path d="M${-w / 2} ${yy - h + 8} ${Array.from({ length: 8 }, () => `q${w / 16} 10 ${w / 8} 0`).join(' ')}" stroke="#f6d9e0" stroke-width="3" fill="none"/>`;
    out += `<rect x="${-w / 2}" y="${yy - 7}" width="${w}" height="5" fill="url(#g-gold)"/>`;
    if (i % 2 === 0) out += `<circle cx="${w / 2 - 8}" cy="${yy - h + 4}" r="7" fill="#f08aa6"/><circle cx="${-w / 2 + 10}" cy="${yy - h + 6}" r="5" fill="#fbe9ee"/>`;
    yy -= h;
  });
  return `<g class="cake" transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="58" rx="120" ry="18" fill="#000" fill-opacity=".08"/>
    <rect x="-110" y="0" width="220" height="56" rx="6" fill="url(#cloth)"/>
    <ellipse cx="0" cy="0" rx="110" ry="14" fill="#fffdf9"/>
    <rect x="-70" y="-10" width="140" height="10" rx="4" fill="url(#g-gold)"/>
    <g transform="translate(0 -10)">${out}
      <g transform="translate(0 ${yy - 4})"><circle cx="-7" cy="-14" r="7" fill="#fff"/><circle cx="7" cy="-14" r="7" fill="#2b2733"/><path d="M-14 -6 L0 4 L14 -6" fill="#fff"/></g>
    </g>
  </g>`;
}

export function champagneTower(x, y, s) {
  let out = '';
  const rows = [5, 4, 3, 2, 1];
  rows.forEach((n, row) => {
    for (let i = 0; i < n; i++) {
      const gx = (i - (n - 1) / 2) * 34;
      const gy = -row * 40;
      out += `<g transform="translate(${gx} ${gy})"><path d="M-15 -30 Q0 -14 15 -30 Q14 -20 0 -16 Q-14 -20 -15 -30 Z" fill="url(#g-champagne)" class="coupe"/><path d="M-15 -30 Q0 -14 15 -30" stroke="#fff" stroke-width="1.4" fill="none"/><path d="M0 -16 L0 -2 M-8 0 L8 0" stroke="#fff" stroke-opacity=".85" stroke-width="2"/></g>`;
    }
  });
  return `<g class="champagne" transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="58" rx="120" ry="16" fill="#000" fill-opacity=".08"/>
    <rect x="-104" y="0" width="208" height="56" rx="6" fill="url(#cloth)"/><ellipse cx="0" cy="0" rx="104" ry="12" fill="#fffdf9"/>
    <ellipse cx="0" cy="-90" rx="130" ry="110" fill="url(#warm-glow)" opacity=".45" class="tower-glow"/>
    <g transform="translate(0 -2)">${out}</g>
  </g>`;
}

export function chairRowMarks(rows, blocks) {
  const seats = [];
  rows.forEach(({ y, xs }) => {
    blocks.forEach((block) => {
      xs[block].forEach((x) => seats.push({ x, y, side: block }));
    });
  });
  return seats;
}

