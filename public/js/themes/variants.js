/**
 * Visual variants. A variant is more than a palette — it chooses:
 *   - which environment architecture is built for each scene role (venue, ceremony, reception…)
 *   - character outfits (silhouettes, not just colours: ball gown, mermaid, princess, áo dài)
 *   - scene gradients (sky, walls, floors, drapes) and flower colours
 *   - particle palettes and the ambient effect (bokeh / petals / magic sparks / lanterns)
 *   - music overrides per chapter and HUD styling (CSS variables + data-theme)
 */
export const VARIANTS = {
  vietnamese: {
    id: 'vietnamese',
    label: 'A · Truyền thống đỏ – vàng',
    venue: 'viet',
    flowers: ['#d61f3c', '#ff6b81', '#ffd166', '#fff0f0', '#ff9fb2'],
    chair: { frame: '#fff6ea', sash: '#c8102e' },
    sky: {
      golden: ['#f7d6c6', '#fbe5d3', '#fff3e3', '#fff8ee'],
      sunset: ['#f2c3b2', '#f9dccb', '#fff0de'],
      night: ['#1a0b10', '#3d0f1c', '#7a1f2c']
    },
    hall: { wall: ['#9e1426', '#c41e33'], window: ['#5a0c18', '#9e1426', '#e2a34a'], drape: ['#c8102e', '#ff4d5e', '#a00d24'], floor: ['#d9b48a', '#f2dcc0'], cloth: ['#c8102e', '#8f0a1f'] },
    dance: { floor: ['#2a0a10', '#4f1018'], glow: '#ffd166' },
    stageGold: ['#9a6a1c', '#ffe29a', '#9a6a1c'],
    ui: { '--glass': 'rgba(255, 249, 240, 0.92)', '--glass-border': 'rgba(200, 16, 46, 0.55)', '--rose': '#c8102e', '--rose-deep': '#9e0d22', '--blush': '#f6d2c0', '--gold': '#c9962c', '--gold-deep': '#8f6418', '--ink': '#4a1d1d', '--ink-soft': '#8a5a50' },
    fx: {
      petals: [['#ffd6dc', '#e2334f'], ['#fff1f3', '#ff8aa0'], ['#fff6d6', '#e8b830']],
      confetti: ['#c8102e', '#e8b830', '#ffd166', '#ffffff', '#ff6b81'],
      fireworks: [['#ffe8b0', '#e8b830'], ['#ffd6dc', '#e2334f'], ['#ffffff', '#ffd166']],
      ambient: { petals: 0.35, bokeh: 0.5 }
    },
    music: { preparation: 'vn_prelude', reception: 'vn_celebration' },
    outfits: {
      bride: { style: 'aodai', dress: ['#d11a35', '#e8314a', '#9e0d22'], accent: ['#fff1c1', '#e8b830', '#a3741a'], hair: ['#2b1d1a', '#120a08'], pants: '#fffaf2', headdress: ['#ffd36a', '#c8102e'], bouquet: ['red', 'red', 'gold'] },
      groom: { style: 'aodai', suit: ['#1f3f8a', '#2e5bc0', '#183277'], lapel: ['#ffd36a', '#c9962c'], tie: ['#ffd36a', '#e8b830', '#a3741a'], shirt: '#fffaf2', pants: '#fffaf2', headdress: ['#1f3f8a', '#ffd36a'] },
      bridesmaids: [{ style: 'aodai', gown: ['#f7a8b8', '#ffd0da', '#e27e94'], hair: ['#2b1d1a', '#120a08'] }, { style: 'aodai', gown: ['#f7a8b8', '#ffd0da', '#e27e94'], hair: ['#3d302e', '#1c1515'] }],
      groomsmen: [{ suit: ['#22252e', '#353a47', '#1c1f27'], tie: '#c8102e' }, { suit: ['#22252e', '#353a47', '#1c1f27'], tie: '#c8102e' }],
      mc: { suit: ['#5a0c18', '#8a1424', '#4a0a14'], tie: '#ffd36a' }
    }
  },

  luxury: {
    id: 'luxury',
    label: 'B · Sang trọng trắng – vàng',
    venue: 'viet',
    flowers: ['#fffaf2', '#f3e3c4', '#e8c77a', '#fbe7ea', '#ffffff'],
    chair: { frame: '#e9cf8f', sash: '#fff6e6' },
    sky: { golden: ['#f6e6cf', '#fbefdf', '#fff6ea', '#fff8ef'], sunset: ['#f1d9c2', '#f8e5cf', '#fff3e2'], night: ['#1d1410', '#3b2a1f', '#6e4a2c'] },
    hall: { wall: ['#e9d3a6', '#f8ead0'], window: ['#7a5a24', '#c9a24f', '#fff0d6'], drape: ['#f3e3c4', '#fffaf2', '#e2c792'], floor: ['#eadfd0', '#fbf6ef'], cloth: ['#fffdf6', '#efe0c0'] },
    dance: { floor: ['#2a1e14', '#4a3520'], glow: '#ffe2a8' },
    stageGold: ['#8f6a2c', '#f3d79a', '#8f6a2c'],
    ui: { '--glass': 'rgba(255, 252, 244, 0.92)', '--glass-border': 'rgba(201, 162, 79, 0.75)', '--rose': '#b8862f', '--rose-deep': '#8c5a1c', '--blush': '#efdcb8', '--gold': '#b8913f', '--gold-deep': '#86642a', '--ink': '#3f3022', '--ink-soft': '#7a6a55' },
    fx: {
      petals: [['#fffaf2', '#ead8be'], ['#fff', '#f3e3c4'], ['#fbefd9', '#e2c38f']],
      confetti: ['#fff7e3', '#e9c46a', '#d8b56a', '#ffffff', '#c9a24f'],
      fireworks: [['#fff3cc', '#f2c14e'], ['#ffffff', '#f6e6c8'], ['#ffe9d6', '#e6b980']],
      ambient: { petals: 0.3, bokeh: 0.8 }
    },
    music: {},
    outfits: {
      bride: { style: 'aodai', dress: ['#fffdf6', '#f7ecd4', '#e3cf9f'], accent: ['#fff1c1', '#e2be72', '#a97d34'], hair: ['#2b1d1a', '#120a08'], pants: '#fffaf2', headdress: ['#ffe9a8', '#c9a24f'], bouquet: ['ivory', 'ivory', 'gold'] },
      groom: { style: 'aodai', suit: ['#f6ead0', '#fff8e6', '#e2cf9f'], lapel: ['#e2be72', '#a97d34'], tie: ['#ffd36a', '#e8b830', '#a3741a'], shirt: '#fffaf2', pants: '#fffaf2', headdress: ['#e9d3a6', '#c9a24f'] },
      bridesmaids: [{ style: 'aodai', gown: ['#f3e3c4', '#fff6e6', '#e2c792'], hair: ['#2b1d1a', '#120a08'] }, { style: 'aodai', gown: ['#fbe7ea', '#fff3f5', '#efc9d2'], hair: ['#3d302e', '#1c1515'] }],
      groomsmen: [{ suit: ['#3a2f22', '#56463a', '#30261c'], tie: '#e2c58c' }, { suit: ['#3a2f22', '#56463a', '#30261c'], tie: '#e2c58c' }],
      mc: { suit: ['#5a3a12', '#7a5420', '#4a300e'], tie: '#ffd36a' }
    }
  },

  garden: {
    id: 'garden',
    label: 'C · Sân vườn miền Tây',
    venue: 'viet',
    flowers: ['#f6b6c8', '#fbe9ee', '#e98aa6', '#fff7ef', '#ffd166'],
    chair: { frame: '#f6efe4', sash: '#f6c3d1' },
    sky: { golden: ['#f7d9d6', '#fbe4d8', '#fff1df', '#fdf3e4'], sunset: ['#e9bfcf', '#f8d6cf', '#ffefd9'], night: ['#0f2018', '#244031', '#5a6a3a'] },
    hall: { wall: ['#7fae7a', '#b9d6a2'], window: ['#2f5a3a', '#7fae7a', '#f4e3a8'], drape: ['#f7dfe4', '#fff6f6', '#efcfd7'], floor: ['#d9c7a0', '#f2e6c8'], cloth: ['#fffdf9', '#eee2d3'] },
    dance: { floor: ['#1b2a1e', '#2f4a32'], glow: '#ffd166' },
    stageGold: ['#9c7230', '#f7dc9a', '#9c7230'],
    ui: { '--rose': '#d0546f', '--rose-deep': '#a33a55', '--glass-border': 'rgba(127, 174, 122, 0.7)' },
    fx: { petals: [['#ffd6e0', '#e98aa6'], ['#fff6d6', '#f2c14e'], ['#e6f5dc', '#8fbf7a']], ambient: { petals: 0.5, bokeh: 0.35 } },
    music: {},
    outfits: {
      bride: { style: 'aodai', dress: ['#ff9fb8', '#ffc4d2', '#e27e94'], accent: ['#fff1c1', '#e8b830', '#a3741a'], hair: ['#2b1d1a', '#120a08'], pants: '#fffaf2', headdress: ['#ffd36a', '#e27e94'], bouquet: ['pink', 'ivory', 'pink'] },
      groom: { style: 'aodai', suit: ['#2f6a4a', '#3f8a60', '#255a3e'], lapel: ['#ffd36a', '#c9962c'], tie: ['#ffd36a', '#e8b830', '#a3741a'], shirt: '#fffaf2', pants: '#fffaf2', headdress: ['#2f6a4a', '#ffd36a'] },
      bridesmaids: [{ style: 'aodai', gown: ['#fff0b3', '#fff8d6', '#f2d36b'], hair: ['#2b1d1a', '#120a08'] }, { style: 'aodai', gown: ['#cfe8c4', '#e8f5e0', '#a9d19a'], hair: ['#3d302e', '#1c1515'] }],
      groomsmen: [{ suit: ['#3c4a3e', '#56665a', '#2e3a30'], tie: '#ff9fb8' }, { suit: ['#3c4a3e', '#56665a', '#2e3a30'], tie: '#ffd36a' }],
      mc: { suit: ['#1f3f2e', '#2f5a44', '#183326'], tie: '#ffd36a' }
    }
  },

  modern: {
    id: 'modern',
    label: 'D · Hiện đại Sài Gòn',
    venue: 'viet',
    flowers: ['#ffffff', '#f4f1ea', '#e9e2d3', '#d9cdb5', '#c8102e'],
    chair: { frame: '#16161a', sash: '#c8a45a' },
    sky: { golden: ['#e9e7e3', '#f4f3f0', '#fbfaf8', '#ffffff'], sunset: ['#d9d6d0', '#ecebe7', '#f8f7f4'], night: ['#0b0b0e', '#1a1a20', '#2e2c30'] },
    hall: { wall: ['#1d1d22', '#34343c'], window: ['#1b1d24', '#3c3f4a', '#8d8a85'], drape: ['#e8e6e1', '#ffffff', '#d9d6cf'], floor: ['#e9e8e5', '#f8f8f6'], cloth: ['#ffffff', '#e6e4df'] },
    dance: { floor: ['#0e0e11', '#1f1f24'], glow: '#f0d79a' },
    stageGold: ['#7c6432', '#e8cf8f', '#7c6432'],
    ui: { '--glass': 'rgba(18, 18, 22, 0.86)', '--glass-border': 'rgba(200, 164, 90, 0.7)', '--ink': '#f4f1ea', '--ink-soft': '#b9b3a8', '--rose': '#d8b56a', '--rose-deep': '#f0d79a', '--blush': '#3a3630', '--gold': '#c8a45a', '--gold-deep': '#e8cf8f', '--ivory': '#141418' },
    fx: {
      petals: [['#ffffff', '#e6e1d6'], ['#f6f3ec', '#d8cdb6'], ['#ffd6dc', '#c8102e']],
      confetti: ['#ffffff', '#111111', '#c8a45a', '#e8cf8f', '#c8102e'],
      fireworks: [['#ffffff', '#d9d6cf'], ['#fff3cc', '#c8a45a'], ['#ffd6dc', '#c8102e']],
      ambient: { petals: 0.1, bokeh: 0.6 }
    },
    music: {},
    outfits: {
      bride: { style: 'aodai', dress: ['#ffffff', '#f7f6f3', '#dcdad5'], accent: ['#f4e3b5', '#c8a45a', '#8a6d32'], hair: ['#2b2222', '#120d0d'], pants: '#ffffff', headdress: ['#f4e3b5', '#c8a45a'], bouquet: ['ivory', 'red', 'ivory'] },
      groom: { style: 'aodai', suit: ['#16161a', '#2a2a30', '#0b0b0d'], lapel: ['#c8a45a', '#8a6d32'], tie: ['#e8cf8f', '#c8a45a', '#8a6d32'], shirt: '#ffffff', pants: '#ffffff', headdress: ['#16161a', '#c8a45a'] },
      bridesmaids: [{ style: 'aodai', gown: ['#e8e6e1', '#ffffff', '#cfcac0'], hair: ['#2b1d1a', '#120a08'] }, { style: 'aodai', gown: ['#e8e6e1', '#ffffff', '#cfcac0'], hair: ['#3d302e', '#1c1515'] }],
      groomsmen: [{ suit: ['#121215', '#26262c', '#0d0d10'], tie: '#c8a45a' }, { suit: ['#121215', '#26262c', '#0d0d10'], tie: '#c8a45a' }],
      mc: { suit: ['#121215', '#26262c', '#0d0d10'], tie: '#c8102e' }
    }
  },

  fairytale: {
    id: 'fairytale',
    label: 'E · Cung đình Huế',
    venue: 'viet',
    flowers: ['#ffd36a', '#f2b632', '#c8102e', '#fff6d6', '#e8b830'],
    chair: { frame: '#ffd36a', sash: '#7a0f1c' },
    sky: { golden: ['#f6d79a', '#fbe6b8', '#fff3d6', '#fff8ea'], sunset: ['#e9b86a', '#f6d79a', '#fff0cc'], night: ['#1a0a08', '#3d1a0c', '#7a3a10'] },
    hall: { wall: ['#d9a521', '#f2c94c'], window: ['#5a0c18', '#9e1426', '#ffd36a'], drape: ['#f2c94c', '#ffe9a8', '#d9a521'], floor: ['#c99a5c', '#ecd2a0'], cloth: ['#f2c94c', '#b8860b'] },
    dance: { floor: ['#2a120a', '#4f2410'], glow: '#ffd36a' },
    stageGold: ['#8a5a10', '#ffe29a', '#8a5a10'],
    ui: { '--glass': 'rgba(255, 248, 230, 0.93)', '--glass-border': 'rgba(184, 134, 11, 0.75)', '--rose': '#b8860b', '--rose-deep': '#7a0f1c', '--blush': '#f6e2a8', '--gold': '#c9962c', '--gold-deep': '#8a5a10', '--ink': '#4a2a10', '--ink-soft': '#8a6a40' },
    fx: {
      petals: [['#fff6d6', '#e8b830'], ['#ffd6dc', '#c8102e'], ['#fff1c1', '#f2c94c']],
      confetti: ['#ffd36a', '#c8102e', '#e8b830', '#fff6d6', '#7a0f1c'],
      fireworks: [['#fff3cc', '#f2c14e'], ['#ffd6dc', '#c8102e'], ['#ffffff', '#ffd36a']],
      ambient: { petals: 0.3, bokeh: 0.5 }
    },
    music: {},
    outfits: {
      bride: { style: 'aodai', dress: ['#f2c94c', '#ffe08a', '#c9962c'], accent: ['#ffffff', '#c8102e', '#7a0f1c'], hair: ['#2b1d1a', '#120a08'], pants: '#fff6e0', headdress: ['#f2c94c', '#c8102e'], bouquet: ['gold', 'red', 'gold'] },
      groom: { style: 'aodai', suit: ['#c8102e', '#e8314a', '#9e0d22'], lapel: ['#ffd36a', '#c9962c'], tie: ['#ffd36a', '#e8b830', '#a3741a'], shirt: '#fff6e0', pants: '#fff6e0', headdress: ['#c8102e', '#ffd36a'] },
      bridesmaids: [{ style: 'aodai', gown: ['#e8b830', '#ffd36a', '#c9962c'], hair: ['#2b1d1a', '#120a08'] }, { style: 'aodai', gown: ['#e27e94', '#f7a8b8', '#c8566e'], hair: ['#3d302e', '#1c1515'] }],
      groomsmen: [{ suit: ['#4a1d10', '#6a2c18', '#3a160c'], tie: '#ffd36a' }, { suit: ['#4a1d10', '#6a2c18', '#3a160c'], tie: '#ffd36a' }],
      mc: { suit: ['#7a0f1c', '#9e1426', '#5a0c18'], tie: '#ffd36a' }
    }
  }
};

export const VARIANT_IDS = Object.keys(VARIANTS);

export function getVariant(id) {
  return VARIANTS[id] || VARIANTS.vietnamese;
}

const lin = (id, stops, { x2 = 0, y2 = 1 } = {}) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map((c, i) => `<stop offset="${stops.length === 1 ? 0 : i / (stops.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient>`;

/** Gradients the variant contributes (scene gradient ids are shared with scenes.js builders). */
export function variantDefs(v) {
  const o = v.outfits;
  return [
    lin('sky-golden', v.sky.golden),
    lin('sky-sunset', v.sky.sunset),
    lin('sky-night', v.sky.night),
    lin('hall-wall', v.hall.wall),
    lin('window-eve', v.hall.window),
    lin('drape', v.hall.drape, { x2: 1, y2: 0 }),
    lin('marble', v.hall.floor),
    lin('cloth', v.hall.cloth),
    lin('dance-floor', v.dance.floor),
    lin('stage-gold', v.stageGold, { x2: 1, y2: 0 }),
    lin('th-bride-dress', o.bride.dress, { x2: 1, y2: 1 }),
    lin('th-bride-skirt', [o.bride.dress[2], o.bride.dress[0], o.bride.dress[1], o.bride.dress[2]], { x2: 1, y2: 0 }),
    lin('th-bride-accent', o.bride.accent, { x2: 1, y2: 1 }),
    lin('th-bride-hair', o.bride.hair),
    lin('th-bride-head', o.bride.headdress || o.bride.accent, { x2: 1, y2: 0 }),
    lin('th-groom-suit', o.groom.suit, { x2: 1, y2: 0 }),
    lin('th-groom-lapel', o.groom.lapel, { x2: 1, y2: 1 }),
    lin('th-groom-tie', o.groom.tie, { x2: 1, y2: 1 }),
    lin('th-groom-head', o.groom.headdress || o.groom.suit, { x2: 1, y2: 0 }),
    ...o.bridesmaids.map((b, i) => lin(`th-bm-${i}`, b.gown, { x2: 1, y2: 0 }) + lin(`th-bm-hair-${i}`, b.hair)),
    ...o.groomsmen.map((g, i) => lin(`th-gm-${i}`, g.suit, { x2: 1, y2: 0 })),
    lin('th-mc-suit', o.mc.suit, { x2: 1, y2: 0 })
  ].join('');
}

/** Apply HUD CSS variables + data-theme for variant-specific CSS rules. */
export function applyVariantUi(v) {
  document.body.dataset.theme = v.id;
  const root = document.documentElement;
  for (const [k, val] of Object.entries(v.ui || {})) root.style.setProperty(k, val);
}
