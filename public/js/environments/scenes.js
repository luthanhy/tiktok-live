/**
 * Wedding environments — original layered vector art for a 1920×1080 stage.
 * Each scene returns:
 *   back  : sky / architecture / floor (behind the cast)
 *   front : blurred foreground for depth-of-field (in front of the cast)
 *   marks : named stage positions used by the choreography
 *   seats : guest seat positions (chair rows or tables)
 *   depth : y → scale function (2.5D perspective)
 */
import { escapeHtml } from '../core/util.js';

import { ballroomBack, ballroomFront, modernBack, modernFront, castleBack, castleFront, vietBack, vietFront, venueExtras, doubleHappiness } from './venues.js';
import { W, H, seeded, roseCluster, stringLights, floralArch, candle, flowerStand, tree, cypress, chandelier, roundTable, weddingCake, champagneTower, chairRowMarks } from './decor.js';

export function sceneDefs() {
  return `
  <linearGradient id="sky-golden" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7d9d6"/><stop offset=".45" stop-color="#fbe4d8"/><stop offset=".8" stop-color="#fff1df"/><stop offset="1" stop-color="#fdf3e4"/></linearGradient>
  <linearGradient id="sky-sunset" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9bfcf"/><stop offset=".5" stop-color="#f8d6cf"/><stop offset="1" stop-color="#ffefd9"/></linearGradient>
  <linearGradient id="sky-night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140f2e"/><stop offset=".55" stop-color="#3a2552"/><stop offset="1" stop-color="#7a4466"/></linearGradient>
  <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff8e6" stop-opacity="1"/><stop offset=".35" stop-color="#ffe6c2" stop-opacity=".55"/><stop offset="1" stop-color="#ffd9c0" stop-opacity="0"/></radialGradient>
  <radialGradient id="warm-glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff3cf" stop-opacity=".95"/><stop offset="1" stop-color="#ffd38a" stop-opacity="0"/></radialGradient>
  <radialGradient id="pink-glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffd1e0" stop-opacity=".8"/><stop offset="1" stop-color="#ff9fc0" stop-opacity="0"/></radialGradient>
  <linearGradient id="lawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9cf9c"/><stop offset=".4" stop-color="#9fbd84"/><stop offset="1" stop-color="#7fa36a"/></linearGradient>
  <linearGradient id="hill-far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cbd8bf"/><stop offset="1" stop-color="#b6c9a7"/></linearGradient>
  <linearGradient id="hill-mid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9c193"/><stop offset="1" stop-color="#93ad80"/></linearGradient>
  <linearGradient id="carpet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8344c"/><stop offset="1" stop-color="#d4475f"/></linearGradient>
  <linearGradient id="runner" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf4ea"/><stop offset="1" stop-color="#fffaf2"/></linearGradient>
  <linearGradient id="marble" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efe3d6"/><stop offset="1" stop-color="#fbf5ee"/></linearGradient>
  <linearGradient id="hall-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3dfcf"/><stop offset="1" stop-color="#fbeee2"/></linearGradient>
  <linearGradient id="window-eve" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d5c94"/><stop offset=".6" stop-color="#c58aa4"/><stop offset="1" stop-color="#f4c4a8"/></linearGradient>
  <linearGradient id="drape" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f7dfe4"/><stop offset=".5" stop-color="#fff6f6"/><stop offset="1" stop-color="#efcfd7"/></linearGradient>
  <linearGradient id="dance-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b1b36"/><stop offset="1" stop-color="#4c2a4a"/></linearGradient>
  <linearGradient id="stage-gold" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9c7230"/><stop offset=".5" stop-color="#f7dc9a"/><stop offset="1" stop-color="#9c7230"/></linearGradient>
  <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4d8" stop-opacity=".75"/><stop offset="1" stop-color="#fff4d8" stop-opacity="0"/></linearGradient>
  <linearGradient id="beam-pink" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc2dc" stop-opacity=".6"/><stop offset="1" stop-color="#ffc2dc" stop-opacity="0"/></linearGradient>
  <linearGradient id="cake" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#efe2d4"/><stop offset=".4" stop-color="#fffaf4"/><stop offset="1" stop-color="#e6d6c4"/></linearGradient>
  <linearGradient id="cloth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf9"/><stop offset="1" stop-color="#eee2d3"/></linearGradient>
  <filter id="soft-blur"><feGaussianBlur stdDeviation="3"/></filter>
  <filter id="far-blur"><feGaussianBlur stdDeviation="5"/></filter>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
}

// ------------------------------------------------------------------ scenes
function gardenBack(rnd, { ceremony }) {
  const archW = ceremony ? 330 : 280;
  const archH = ceremony ? 470 : 380;
  const archBase = ceremony ? 700 : 680;
  const aisle = ceremony
    ? `<path d="M905 ${archBase} L1015 ${archBase} L1230 ${H} L690 ${H} Z" fill="url(#carpet)"/>
       <path d="M905 ${archBase} L690 ${H} M1015 ${archBase} L1230 ${H}" stroke="url(#g-gold)" stroke-width="5"/>
       ${Array.from({ length: 40 }, () => {
         const t = rnd();
         const side = rnd() < 0.5 ? -1 : 1;
         const y = archBase + t * (H - archBase);
         const half = 55 + t * 215;
         const x = 960 + side * (half + rnd() * 24 - 6);
         return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(3 + t * 6).toFixed(1)}" ry="${(2 + t * 3).toFixed(1)}" fill="${rnd() < 0.5 ? '#f7b9ca' : '#fff4f4'}"/>`;
       }).join('')}`
    : `<path d="M915 ${archBase} L1005 ${archBase} L1160 ${H} L760 ${H} Z" fill="url(#runner)" opacity=".95"/>
       <g class="decor d3">${Array.from({ length: 26 }, () => {
         const t = rnd();
         const y = archBase + t * (H - archBase);
         const half = 45 + t * 150;
         const x = 960 + (rnd() * 2 - 1) * half;
         return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(3 + t * 5).toFixed(1)}" ry="${(2 + t * 2).toFixed(1)}" fill="#f7b9ca"/>`;
       }).join('')}</g>`;

  const candles = ceremony
    ? [0.12, 0.3, 0.52, 0.78].map((t) => {
        const y = archBase + 20 + t * (H - archBase - 60);
        const half = 80 + t * 260;
        const s = 0.6 + t * 0.9;
        return candle(960 - half, y, s) + candle(960 + half, y, s);
      }).join('')
    : '';

  const stands = ceremony
    ? flowerStand(700, 720, 0.9, rnd) + flowerStand(1220, 720, 0.9, rnd)
    : `<g class="decor d1">${flowerStand(760, 715, 0.85, rnd) + flowerStand(1160, 715, 0.85, rnd)}</g>` +
      `<g transform="translate(1330 790)"><rect x="-70" y="-10" width="140" height="60" rx="6" fill="url(#cloth)"/><ellipse cx="0" cy="-10" rx="70" ry="10" fill="#fffdf9"/>${roseCluster(-30, -30, 26, 8, rnd)}${roseCluster(30, -26, 22, 7, rnd)}</g>
       <g transform="translate(560 800)"><path d="M-50 0 L-40 -50 L40 -50 L50 0 Z" fill="#d9c09a"/><path d="M-50 -50 L50 -50" stroke="#b89a6f" stroke-width="4"/>${roseCluster(0, -64, 34, 12, rnd)}</g>`;

  return `
  <svg class="scene-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
    <g class="L-far">
      <rect width="${W}" height="${H}" fill="url(${ceremony ? '#sky-sunset' : '#sky-golden'})"/>
      <circle cx="1420" cy="360" r="260" fill="url(#sun-glow)" class="sun"/>
      <g filter="url(#far-blur)" opacity=".9">
        <path d="M0 520 Q240 430 520 500 T1040 470 T1560 500 T1920 460 L1920 640 L0 640 Z" fill="url(#hill-far)"/>
        ${[120, 260, 1640, 1780, 400, 1500].map((x, i) => cypress(x, 600, 0.9 + (i % 3) * 0.2)).join('')}
        <g transform="translate(1620 560)" opacity=".85"><path d="M-70 0 L-70 -90 L0 -140 L70 -90 L70 0 Z" fill="#fbf6ee"/><path d="M-85 -88 L0 -150 L85 -88" stroke="#e7dccb" stroke-width="8" fill="none"/><rect x="-50" y="-80" width="16" height="80" fill="#f1e8db"/><rect x="34" y="-80" width="16" height="80" fill="#f1e8db"/></g>
      </g>
      <g class="birds" opacity=".5"><path d="M300 200 q10 -8 20 0 q10 -8 20 0" stroke="#8a6f74" stroke-width="2" fill="none"/><path d="M360 230 q7 -6 14 0 q7 -6 14 0" stroke="#8a6f74" stroke-width="2" fill="none"/></g>
    </g>
    <g class="L-mid">
      <path d="M0 610 Q480 560 960 590 T1920 600 L1920 700 L0 700 Z" fill="url(#hill-mid)"/>
      ${tree(230, 640, 1.2, '#9cb98b', rnd)}${tree(1700, 640, 1.25, '#95b483', rnd)}${tree(420, 630, 0.8, '#a7c196', rnd)}${tree(1500, 630, 0.85, '#a2bf90', rnd)}
      ${Array.from({ length: 12 }, (_, i) => roseCluster(80 + i * 160, 640 + (i % 2) * 8, 60, 16, rnd, ['#f7b9ca', '#fff3f5', '#e98aa6', '#a9c193', '#9fbd84'])).join('')}
    </g>
    <g class="L-floor">
      <path d="M0 640 L${W} 640 L${W} ${H} L0 ${H} Z" fill="url(#lawn)"/>
      <path d="M0 640 L${W} 640" stroke="#fff" stroke-opacity=".25" stroke-width="3"/>
      ${aisle}
    </g>
    <g class="L-props">
      ${floralArch(960, archBase, archW, archH, rnd, { flowerClass: ceremony ? '' : 'decor d4' })}
      ${stands}${candles}
      <g class="lights${ceremony ? '' : ' decor d2'}">${stringLights(-40, 760, 120, 60, 22, rnd)}${stringLights(1160, 1960, 120, 60, 22, rnd)}${stringLights(380, 1540, 70, 90, 30, rnd)}</g>
    </g>
  </svg>`;
}

function gardenFront(rnd) {
  return `<svg class="scene-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
    <g filter="url(#soft-blur)" opacity=".95">
      ${roseCluster(60, 1050, 150, 46, rnd)}${roseCluster(1860, 1050, 150, 46, rnd)}
      ${Array.from({ length: 9 }, (_, i) => `<path d="M${20 + i * 26} -10 C${30 + i * 26} 80 ${10 + i * 26} 150 ${26 + i * 26} ${180 + (i % 3) * 40}" stroke="#d9b8e6" stroke-width="10" stroke-linecap="round" fill="none" opacity=".75"/>`).join('')}
      ${Array.from({ length: 9 }, (_, i) => `<path d="M${1900 - i * 26} -10 C${1890 - i * 26} 80 ${1910 - i * 26} 150 ${1894 - i * 26} ${180 + (i % 3) * 40}" stroke="#d9b8e6" stroke-width="10" stroke-linecap="round" fill="none" opacity=".75"/>`).join('')}
    </g>
  </svg>`;
}

function receptionBack(rnd, variantId = 'garden', initials = '&') {
  const windows = [380, 700, 1220, 1540]
    .map((x) => `<g transform="translate(${x} 120)"><path d="M-90 420 L-90 90 A90 90 0 0 1 90 90 L90 420 Z" fill="url(#window-eve)"/><path d="M-90 420 L-90 90 A90 90 0 0 1 90 90 L90 420 Z M0 0 L0 420 M-90 220 L90 220" stroke="#efe1cf" stroke-width="8" fill="none"/>
      <path d="M-120 -20 C-100 120 -140 300 -110 440 L-80 440 C-90 300 -70 120 -80 -20 Z" fill="url(#drape)"/><path d="M120 -20 C100 120 140 300 110 440 L80 440 C90 300 70 120 80 -20 Z" fill="url(#drape)"/></g>`)
    .join('');
  let tiles = '';
  for (let r = 0; r < 9; r++) {
    const y0 = 600 + Math.pow(r / 9, 1.6) * 480;
    const y1 = 600 + Math.pow((r + 1) / 9, 1.6) * 480;
    tiles += `<path d="M0 ${y0.toFixed(1)} L${W} ${y0.toFixed(1)}" stroke="#e2d2bf" stroke-width="${1 + r * 0.3}"/>`;
    if (r % 2 === 0) tiles += `<rect x="0" y="${y0.toFixed(1)}" width="${W}" height="${(y1 - y0).toFixed(1)}" fill="#fff" fill-opacity=".18"/>`;
  }
  for (let c = -12; c <= 12; c++) tiles += `<path d="M${960 + c * 40} 600 L${960 + c * 190} ${H}" stroke="#e2d2bf" stroke-width="1.4"/>`;
  return `<svg class="scene-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
    <g class="L-far">
      <rect width="${W}" height="620" fill="url(#hall-wall)"/>
      ${windows}
      <rect x="0" y="560" width="${W}" height="44" fill="#ead8c4"/><rect x="0" y="556" width="${W}" height="6" fill="url(#g-gold)"/>
      <g transform="translate(960 300)"><circle r="120" fill="url(#pink-glow)" opacity=".7"/>${roseCluster(0, 0, 110, 46, rnd)}${variantId === 'vietnamese' ? doubleHappiness(0, 0, 62, { bg: '#c8102e' }) : `<text y="22" text-anchor="middle" class="monogram-text" font-size="58">${escapeHtml(initials)}</text>`}</g>
    </g>
    <g class="L-floor">
      <rect x="0" y="600" width="${W}" height="${H - 600}" fill="url(#marble)"/>${tiles}
      <ellipse cx="960" cy="830" rx="420" ry="120" fill="url(#warm-glow)" opacity=".35"/>
    </g>
    <g class="L-props">
      ${chandelier(560, 150, 1, rnd)}${chandelier(960, 120, 1.25, rnd)}${chandelier(1360, 150, 1, rnd)}
      <g class="lights">${stringLights(-40, 980, 40, 70, 26, rnd)}${stringLights(940, 1960, 40, 70, 26, rnd)}</g>
      ${venueExtras(variantId, 'reception')}
      ${weddingCake(700, 700, 0.95)}${champagneTower(1240, 700, 0.95)}
    </g>
  </svg>`;
}

function receptionFront(rnd) {
  return `<svg class="scene-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
    <g filter="url(#soft-blur)">
      <path d="M-40 -20 C40 200 0 600 60 1100 L-40 1100 Z" fill="url(#drape)"/>
      <path d="M1960 -20 C1880 200 1920 600 1860 1100 L1960 1100 Z" fill="url(#drape)"/>
      <path d="M-20 -10 Q480 120 980 -10 Q1440 120 1940 -10 L1940 -40 L-20 -40 Z" fill="url(#drape)"/>
      ${roseCluster(120, 1060, 120, 30, rnd)}${roseCluster(1800, 1060, 120, 30, rnd)}
    </g>
  </svg>`;
}

function danceBack(rnd, initials, variantId = 'garden') {
  let stars = '';
  for (let i = 0; i < 160; i++) stars += `<circle class="bulb tw${i % 4}" cx="${(rnd() * W).toFixed(0)}" cy="${(rnd() * 560).toFixed(0)}" r="${(1 + rnd() * 2.6).toFixed(1)}" fill="#ffe9c9"/>`;
  let curtains = '';
  for (let i = 0; i < 48; i++) curtains += `<path d="M${i * 41 + 10} 0 L${i * 41 + 10} ${300 + (i % 5) * 50}" stroke="#ffe7c2" stroke-opacity=".18" stroke-width="2"/>`;
  return `<svg class="scene-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
    <g class="L-far">
      <rect width="${W}" height="${H}" fill="#1d1229"/>
      <rect width="${W}" height="620" fill="url(#sky-night)" opacity=".8"/>
      ${curtains}${stars}
      <g transform="translate(960 150)" class="mirror-ball"><line x1="0" y1="-150" x2="0" y2="-40" stroke="#c9a565" stroke-width="2"/><circle r="44" fill="#d9d4e6"/><g opacity=".55" stroke="#8a84a0" stroke-width="1.2">${Array.from({ length: 7 }, (_, i) => `<path d="M-44 ${-36 + i * 12} L44 ${-36 + i * 12}"/>`).join('')}${Array.from({ length: 7 }, (_, i) => `<path d="M${-36 + i * 12} -44 L${-36 + i * 12} 44"/>`).join('')}</g><circle r="44" fill="url(#pink-glow)" opacity=".5"/></g>
    </g>
    <g class="L-floor">
      <rect x="0" y="600" width="${W}" height="${H - 600}" fill="url(#dance-floor)"/>
      ${Array.from({ length: 10 }, (_, r) => `<path d="M0 ${600 + Math.pow((r + 1) / 10, 1.6) * 480} L${W} ${600 + Math.pow((r + 1) / 10, 1.6) * 480}" stroke="#ffd9f0" stroke-opacity=".12"/>`).join('')}
      ${Array.from({ length: 25 }, (_, c) => `<path d="M${960 + (c - 12) * 44} 600 L${960 + (c - 12) * 200} ${H}" stroke="#ffd9f0" stroke-opacity=".1"/>`).join('')}
      <ellipse cx="960" cy="830" rx="440" ry="130" fill="none" stroke="url(#g-gold)" stroke-width="5" opacity=".75"/>
      <ellipse cx="960" cy="830" rx="420" ry="122" fill="url(#pink-glow)" opacity=".35" class="floor-glow"/>
      <text x="960" y="860" text-anchor="middle" class="monogram-text floor-mono" font-size="88" opacity=".35" transform="matrix(1 0 0 .32 0 584)">${escapeHtml(initials)}</text>
    </g>
    <g class="L-props">${venueExtras(variantId, 'dance')}</g>
    <g class="L-props sweep-beams">
      <path class="sweep s1" d="M300 0 L230 1080 L470 1080 Z" fill="url(#beam-pink)"/>
      <path class="sweep s2" d="M1620 0 L1450 1080 L1690 1080 Z" fill="url(#beam)"/>
      <path class="sweep s3" d="M960 0 L820 1080 L1100 1080 Z" fill="url(#beam)" opacity=".6"/>
    </g>
  </svg>`;
}

function danceFront() {
  return `<svg class="scene-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
    <g filter="url(#soft-blur)" opacity=".9">
      ${Array.from({ length: 14 }, (_, i) => `<circle cx="${i < 7 ? 40 + i * 30 : 1880 - (i - 7) * 30}" cy="${1000 + (i % 3) * 30}" r="${30 + (i % 4) * 10}" fill="#ffb7d5" fill-opacity=".35"/>`).join('')}
    </g>
  </svg>`;
}

function grandBack(rnd, initials, variantId = 'garden') {
  let stars = '';
  for (let i = 0; i < 220; i++) stars += `<circle class="bulb tw${i % 4}" cx="${(rnd() * W).toFixed(0)}" cy="${(rnd() * 520).toFixed(0)}" r="${(0.8 + rnd() * 2.2).toFixed(1)}" fill="#fff6e4"/>`;
  const steps = Array.from({ length: 5 }, (_, i) => {
    const y = 760 + i * 34;
    const w = 520 + i * 120;
    return `<rect x="${960 - w / 2}" y="${y}" width="${w}" height="34" fill="${i % 2 ? '#f6ecdf' : '#fffaf2'}"/><rect x="${960 - w / 2}" y="${y}" width="${w}" height="4" fill="url(#g-gold)"/>`;
  }).join('');
  return `<svg class="scene-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
    <g class="L-far">
      <rect width="${W}" height="${H}" fill="url(#sky-night)"/>
      ${stars}
      <circle cx="1560" cy="170" r="54" fill="#fff6e0"/><circle cx="1580" cy="160" r="54" fill="#3a2552" opacity=".25"/><circle cx="1560" cy="170" r="140" fill="url(#warm-glow)" opacity=".35"/>
      <g filter="url(#far-blur)" opacity=".85">${[150, 300, 1620, 1770].map((x) => cypress(x, 720, 1.2, '#2b2140')).join('')}</g>
      ${venueExtras(variantId, 'grand')}
    </g>
    <g class="L-mid">
      <path d="M520 780 L520 250 Q960 60 1400 250 L1400 780" stroke="url(#stage-gold)" stroke-width="30" fill="none"/>
      <path d="M560 780 L560 280 Q960 110 1360 280 L1360 780" stroke="#fff3d6" stroke-opacity=".35" stroke-width="4" fill="none"/>
      ${Array.from({ length: 26 }, (_, i) => {
        const t = i / 25;
        const a = Math.PI * (1 - t);
        const x = 960 + Math.cos(a) * 440;
        const y = 300 - Math.sin(a) * 150 + (Math.abs(t - 0.5) > 0.42 ? 30 : 0);
        return `<circle class="bulb tw${i % 4}" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="7" fill="#fff4cf"/>`;
      }).join('')}
      <g class="led-heart" transform="translate(960 470)">
        <path d="M0 150 C-260 -10 -170 -230 0 -110 C170 -230 260 -10 0 150 Z" fill="url(#pink-glow)" opacity=".55"/>
        <path d="M0 150 C-260 -10 -170 -230 0 -110 C170 -230 260 -10 0 150 Z" fill="none" stroke="#ffd6e6" stroke-width="6" stroke-dasharray="2 16" stroke-linecap="round" class="heart-dots"/>
        <text y="10" text-anchor="middle" class="monogram-text" font-size="92" fill="#fff6e8">${escapeHtml(initials)}</text>
      </g>
      ${[600, 1320].map((x) => `<g transform="translate(${x} 780)"><rect x="-26" y="-330" width="52" height="330" fill="#f8efe4"/><rect x="-34" y="-340" width="68" height="16" fill="url(#g-gold)"/>${roseCluster(0, -360, 60, 24, rnd)}${roseCluster(0, -180, 36, 10, rnd)}</g>`).join('')}
    </g>
    <g class="L-floor">
      <rect x="0" y="760" width="${W}" height="${H - 760}" fill="#2a1b36"/>
      ${steps}
      <ellipse cx="960" cy="760" rx="380" ry="40" fill="url(#warm-glow)" opacity=".5"/>
    </g>
    <g class="L-props sweep-beams">
      <path class="sweep s1" d="M560 0 L380 1080 L700 1080 Z" fill="url(#beam)"/>
      <path class="sweep s2" d="M1360 0 L1220 1080 L1540 1080 Z" fill="url(#beam-pink)"/>
    </g>
  </svg>`;
}

function grandFront(rnd) {
  let crowd = '';
  for (let i = 0; i < 34; i++) {
    const x = i * 60 + (rnd() - 0.5) * 30;
    const y = 1040 + (i % 3) * 18;
    const r = 34 + rnd() * 10;
    crowd += `<circle cx="${x.toFixed(0)}" cy="${(y - r * 1.5).toFixed(0)}" r="${(r * 0.62).toFixed(0)}" fill="#1a1024"/><path d="M${(x - r).toFixed(0)} ${y + 60} Q${x.toFixed(0)} ${(y - r * 1.2).toFixed(0)} ${(x + r).toFixed(0)} ${y + 60} Z" fill="#1a1024"/>`;
    if (i % 2 === 0) {
      const lx = x + (rnd() < 0.5 ? -1 : 1) * r * 0.9;
      crowd += `<g class="lightstick ls${i % 3}" style="transform-origin:${lx.toFixed(0)}px ${(y - 10).toFixed(0)}px"><line x1="${lx.toFixed(0)}" y1="${(y - 10).toFixed(0)}" x2="${lx.toFixed(0)}" y2="${(y - 80).toFixed(0)}" stroke="${['#ffd1e4', '#fff1c9', '#e9d4ff'][i % 3]}" stroke-width="8" stroke-linecap="round"/><circle cx="${lx.toFixed(0)}" cy="${(y - 84).toFixed(0)}" r="16" fill="${['#ff9cc7', '#ffe08a', '#c9a6ff'][i % 3]}" opacity=".45"/></g>`;
    }
  }
  return `<svg class="scene-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><g opacity=".96">${crowd}</g></svg>`;
}

// ------------------------------------------------------------------ registry
const depthFn = (horizon, k, min = 0.3, max = 1.4) => (y) => Math.max(min, Math.min(max, 0.5 + (y - horizon) * k));

const VENUES = {
  garden: { back: (rnd, prep) => gardenBack(rnd, { ceremony: !prep }), front: gardenFront },
  ballroom: { back: (rnd, prep) => ballroomBack(rnd, { prep }), front: ballroomFront },
  modern: { back: (rnd, prep) => modernBack(rnd, { prep }), front: modernFront },
  castle: { back: (rnd, prep) => castleBack(rnd, { prep }), front: castleFront },
  viet: { back: (rnd, prep) => vietBack(rnd, { prep }), front: vietFront }
};

export function buildScenes({ brideName = 'Linh', groomName = 'Minh' } = {}, variant = { id: 'garden', venue: 'garden' }) {
  const initials = `${(groomName || 'M')[0]} & ${(brideName || 'L')[0]}`.toUpperCase();
  const venue = VENUES[variant.venue] || VENUES.garden;
  const vid = variant.id;
  const gardenSeats = chairRowMarks(
    [
      { y: 790, xs: { l: [560, 650, 740], r: [1180, 1270, 1360] } },
      { y: 870, xs: { l: [510, 610, 710], r: [1210, 1310, 1410] } },
      { y: 960, xs: { l: [460, 575, 690], r: [1230, 1345, 1460] } }
    ],
    ['l', 'r']
  );
  const ceremonySeats = chairRowMarks(
    [
      { y: 780, xs: { l: [590, 680, 770], r: [1150, 1240, 1330] } },
      { y: 860, xs: { l: [530, 630, 730], r: [1190, 1290, 1390] } },
      { y: 950, xs: { l: [470, 580, 690], r: [1230, 1340, 1450] } },
      { y: 1050, xs: { l: [420, 545], r: [1375, 1500] } }
    ],
    ['l', 'r']
  );
  const tables = [
    { x: 520, y: 900 },
    { x: 1400, y: 900 },
    { x: 470, y: 1060 },
    { x: 1450, y: 1060 }
  ];
  const tableSeats = [];
  tables.forEach(({ x: tx, y: ty }) => {
    [-80, -27, 27, 80].forEach((dx) => tableSeats.push({ x: tx + dx, y: ty - 34, table: true }));
  });
  const danceSpots = [];
  for (let i = 0; i < 12; i++) danceSpots.push({ x: 470 + i * 89, y: i % 2 ? 690 : 710, standing: true });
  const grandSpots = [];
  for (let i = 0; i < 10; i++) grandSpots.push({ x: 470 + i * 109, y: 1010 + (i % 2) * 22, standing: true, scale: 0.62 });

  return {
    garden: {
      id: 'garden',
      label: 'Wedding Garden',
      build: (seed = 11) => ({ back: venue.back(seeded(seed), true), front: venue.front(seeded(seed + 1)) }),
      depth: depthFn(600, 0.0019),
      seats: gardenSeats,
      marks: {
        arch: { x: 960, y: 700 },
        groom: { x: 878, y: 708 },
        bride: { x: 1042, y: 708 },
        mc: { x: 960, y: 684 },
        gm1: { x: 782, y: 716 },
        gm2: { x: 688, y: 728 },
        bm1: { x: 1150, y: 728 },
        bm2: { x: 1300, y: 760 },
        bmWork1: { x: 1240, y: 770 },
        bmWork2: { x: 780, y: 745 },
        offRight: { x: 2100, y: 820 },
        offLeft: { x: -180, y: 820 },
        entryLeft: { x: -140, y: 900 },
        entryRight: { x: 2060, y: 900 }
      }
    },
    ceremony: {
      id: 'ceremony',
      label: 'Ceremony Stage',
      build: (seed = 23) => ({ back: venue.back(seeded(seed), false), front: venue.front(seeded(seed + 1)) }),
      depth: depthFn(600, 0.0021),
      seats: ceremonySeats,
      marks: {
        arch: { x: 960, y: 700 },
        groom: { x: 886, y: 714 },
        bride: { x: 1034, y: 714 },
        mc: { x: 960, y: 690 },
        gm1: { x: 790, y: 720 },
        gm2: { x: 700, y: 732 },
        bm1: { x: 1130, y: 720 },
        bm2: { x: 1220, y: 732 },
        aisleStart: { x: 960, y: 1180 },
        aisleMid: { x: 960, y: 900 },
        aisleNear: { x: 975, y: 780 },
        offRight: { x: 2100, y: 820 },
        offLeft: { x: -180, y: 820 },
        entryLeft: { x: -140, y: 980 },
        entryRight: { x: 2060, y: 980 }
      }
    },
    reception: {
      id: 'reception',
      label: 'Reception Hall',
      build: (seed = 37) => ({ back: receptionBack(seeded(seed), vid, initials), front: receptionFront(seeded(seed + 1)) }),
      depth: depthFn(600, 0.0019),
      seats: tableSeats,
      tables,
      marks: {
        cakeGroom: { x: 572, y: 790 },
        cakeBride: { x: 830, y: 792 },
        towerGroom: { x: 1112, y: 790 },
        towerBride: { x: 1372, y: 792 },
        centerGroom: { x: 920, y: 820 },
        centerBride: { x: 1000, y: 820 },
        mc: { x: 960, y: 700 },
        gm1: { x: 440, y: 760 },
        gm2: { x: 1480, y: 760 },
        bm1: { x: 470, y: 820 },
        bm2: { x: 1450, y: 820 },
        offLeft: { x: -180, y: 860 },
        offRight: { x: 2100, y: 860 },
        entryLeft: { x: -140, y: 980 },
        entryRight: { x: 2060, y: 980 }
      }
    },
    dance: {
      id: 'dance',
      label: 'Dance Floor',
      build: (seed = 41) => ({ back: danceBack(seeded(seed), initials, vid), front: danceFront() }),
      depth: depthFn(600, 0.0019),
      seats: danceSpots,
      marks: {
        groom: { x: 925, y: 830 },
        bride: { x: 995, y: 830 },
        mc: { x: 1500, y: 720 },
        gm1: { x: 660, y: 790 },
        bm1: { x: 720, y: 790 },
        gm2: { x: 1200, y: 790 },
        bm2: { x: 1260, y: 790 },
        offLeft: { x: -180, y: 860 },
        offRight: { x: 2100, y: 860 },
        entryLeft: { x: -140, y: 980 },
        entryRight: { x: 2060, y: 980 }
      }
    },
    grand: {
      id: 'grand',
      label: 'Grand Celebration Stage',
      build: (seed = 53) => ({ back: grandBack(seeded(seed), initials, vid), front: grandFront(seeded(seed + 1)) }),
      depth: depthFn(560, 0.0018),
      seats: grandSpots,
      marks: {
        groom: { x: 892, y: 762 },
        bride: { x: 1028, y: 762 },
        mc: { x: 1330, y: 790 },
        gm1: { x: 770, y: 780 },
        gm2: { x: 670, y: 792 },
        bm1: { x: 1150, y: 780 },
        bm2: { x: 1245, y: 792 },
        offLeft: { x: -180, y: 860 },
        offRight: { x: 2100, y: 860 },
        entryLeft: { x: -140, y: 980 },
        entryRight: { x: 2060, y: 980 }
      }
    }
  };
}

/** Round banquet table drawn in the cast layer so seated guests sit *behind* it. */
export function tableSvg(seed = 5) {
  return `<svg viewBox="-140 -130 280 200" class="table-svg" overflow="visible">${roundTable(0, 0, 1, seeded(seed))}</svg>`;
}

/** The photo booth is a cut-away panel rather than a full scene. */
export function photoBoothSvg(rnd = seeded(77)) {
  let wall = '';
  for (let r = 0; r < 7; r++) for (let c = 0; c < 9; c++) wall += roseCluster(30 + c * 58 + (r % 2) * 28, 30 + r * 58, 22, 4, rnd);
  return `<svg viewBox="0 0 520 400" class="booth-svg" preserveAspectRatio="xMidYMid slice">
    <rect width="520" height="400" fill="#fbe8ee"/>${wall}
    <rect x="0" y="0" width="520" height="400" fill="#fff" fill-opacity=".18"/>
    <text x="260" y="70" text-anchor="middle" class="neon-text" font-size="44">Just Married</text>
  </svg>`;
}
