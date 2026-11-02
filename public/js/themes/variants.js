/**
 * Visual variants. A variant is more than a palette — it chooses:
 *   - which environment architecture is built for each scene role (venue, ceremony, reception…)
 *   - character outfits (silhouettes, not just colours: ball gown, mermaid, princess, áo dài)
 *   - scene gradients (sky, walls, floors, drapes) and flower colours
 *   - particle palettes and the ambient effect (bokeh / petals / magic sparks / lanterns)
 *   - music overrides per chapter and HUD styling (CSS variables + data-theme)
 */
export const VARIANTS = {
  luxury: {
    id: 'luxury',
    label: 'A · Luxury European',
    venue: 'ballroom',
    flowers: ['#fffaf2', '#f6e7ea', '#efd9b8', '#f3cfd8', '#ffffff'],
    chair: { frame: '#d8b56a', sash: '#f3e3d0' },
    sky: {
      golden: ['#f6e6cf', '#fbefdf', '#fff6ea', '#fff8ef'],
      sunset: ['#f1d9c2', '#f8e5cf', '#fff3e2'],
      night: ['#1d1428', '#3b2a3f', '#6e4a52']
    },
    hall: { wall: ['#efe2cf', '#fbf3e7'], window: ['#e9c58e', '#f6dcb3', '#fff0d6'], drape: ['#eadcc6', '#fffaf2', '#dfcbb0'], floor: ['#eadfd0', '#fbf6ef'], cloth: ['#fffdf9', '#eadfce'] },
    dance: { floor: ['#2a1e22', '#4a3530'], glow: '#ffe2a8' },
    stageGold: ['#8f6a2c', '#f3d79a', '#8f6a2c'],
    ui: { '--glass': 'rgba(255, 252, 246, 0.9)', '--glass-border': 'rgba(201, 162, 79, 0.75)', '--rose': '#b9787f', '--rose-deep': '#8c5a3c', '--blush': '#ecd7c4', '--gold': '#b8913f', '--gold-deep': '#86642a', '--ink': '#3f3029', '--ink-soft': '#7a6a5f' },
    fx: {
      petals: [['#fffaf2', '#ead8be'], ['#fff', '#f3dfe3'], ['#fbefd9', '#e2c38f'], ['#fff6f6', '#efc9d2']],
      confetti: ['#fff7e3', '#e9c46a', '#d8b56a', '#ffffff', '#f3dfe3', '#c9a24f'],
      fireworks: [['#fff3cc', '#f2c14e'], ['#ffffff', '#f6e6c8'], ['#ffe9d6', '#e6b980']],
      ambient: { petals: 0.25, bokeh: 0.9 }
    },
    music: {},
    outfits: {
      bride: { style: 'gown', dress: ['#fffdf8', '#f9f1e4', '#e6d6bf'], accent: ['#fff1c1', '#e2be72', '#a97d34'], hair: ['#8a5a42', '#5a3527'], bouquet: ['ivory', 'blush', 'ivory'] },
      groom: { style: 'tux', suit: ['#1a1823', '#2e2b3c', '#16141e'], lapel: ['#4a4660', '#15131c'], tie: ['#fff1c1', '#d9b462', '#9d7330'], shirt: '#fbfaf7', pants: '#1d1b27' },
      bridesmaids: [{ style: 'gown', gown: ['#e9d6bf', '#f8ecdc', '#dcc6a8'], hair: ['#f0d29c', '#c79a5c'] }, { style: 'gown', gown: ['#ecc9cf', '#f9e3e6', '#ddb0b9'], hair: ['#3d302e', '#1c1515'] }],
      groomsmen: [{ suit: ['#2b3047', '#3f4766', '#252a3e'], tie: '#e2c58c' }, { suit: ['#2b3047', '#3f4766', '#252a3e'], tie: '#f0d9dc' }],
      mc: { suit: ['#3a2f2b', '#56463f', '#30261f'], tie: '#d9b462' }
    }
  },

  garden: {
    id: 'garden',
    label: 'B · Romantic Garden',
    venue: 'garden',
    flowers: ['#f6b6c8', '#fbe9ee', '#e98aa6', '#fff7ef', '#f4c7a1'],
    chair: { frame: '#f6efe4', sash: '#f6c3d1' },
    sky: {
      golden: ['#f7d9d6', '#fbe4d8', '#fff1df', '#fdf3e4'],
      sunset: ['#e9bfcf', '#f8d6cf', '#ffefd9'],
      night: ['#140f2e', '#3a2552', '#7a4466']
    },
    hall: { wall: ['#f3dfcf', '#fbeee2'], window: ['#5d5c94', '#c58aa4', '#f4c4a8'], drape: ['#f7dfe4', '#fff6f6', '#efcfd7'], floor: ['#efe3d6', '#fbf5ee'], cloth: ['#fffdf9', '#eee2d3'] },
    dance: { floor: ['#2b1b36', '#4c2a4a'], glow: '#ffc2dc' },
    stageGold: ['#9c7230', '#f7dc9a', '#9c7230'],
    ui: {},
    fx: { ambient: { petals: 0.5, bokeh: 0.35 } },
    music: {},
    outfits: {
      bride: { style: 'gown', dress: ['#fffdf8', '#fbf4ea', '#eadccb'], accent: ['#fff1c1', '#e2be72', '#a97d34'], hair: ['#8a5a42', '#5a3527'], bouquet: ['pink', 'ivory', 'pink'] },
      groom: { style: 'tux', suit: ['#1a1823', '#2e2b3c', '#16141e'], lapel: ['#4a4660', '#15131c'], tie: ['#fff1c1', '#e2be72', '#a97d34'], shirt: '#fbfaf7', pants: '#1d1b27' },
      bridesmaids: [{ style: 'gown', gown: ['#eeb3c0', '#f9d3db', '#e2a0b0'], hair: ['#f0d29c', '#c79a5c'] }, { style: 'gown', gown: ['#c9b8d8', '#e6dbef', '#b9a5cb'], hair: ['#3d302e', '#1c1515'] }],
      groomsmen: [{ suit: ['#5b5868', '#7a7688', '#4e4b5a'], tie: '#f3a9bb' }, { suit: ['#5b5868', '#7a7688', '#4e4b5a'], tie: '#e7c6f0' }],
      mc: { suit: ['#1f2a48', '#34436d', '#1a2440'], tie: '#e2be72' }
    }
  },

  modern: {
    id: 'modern',
    label: 'C · Modern Wedding',
    venue: 'modern',
    flowers: ['#ffffff', '#f4f1ea', '#e9e2d3', '#d9cdb5', '#ffffff'],
    chair: { frame: '#16161a', sash: '#c8a45a' },
    sky: {
      golden: ['#e9e7e3', '#f4f3f0', '#fbfaf8', '#ffffff'],
      sunset: ['#d9d6d0', '#ecebe7', '#f8f7f4'],
      night: ['#0b0b0e', '#1a1a20', '#2e2c30']
    },
    hall: { wall: ['#f2f1ee', '#fbfbf9'], window: ['#1b1d24', '#3c3f4a', '#8d8a85'], drape: ['#e8e6e1', '#ffffff', '#d9d6cf'], floor: ['#e9e8e5', '#f8f8f6'], cloth: ['#ffffff', '#e6e4df'] },
    dance: { floor: ['#0e0e11', '#1f1f24'], glow: '#f0d79a' },
    stageGold: ['#7c6432', '#e8cf8f', '#7c6432'],
    ui: { '--glass': 'rgba(18, 18, 22, 0.86)', '--glass-border': 'rgba(200, 164, 90, 0.7)', '--ink': '#f4f1ea', '--ink-soft': '#b9b3a8', '--rose': '#d8b56a', '--rose-deep': '#f0d79a', '--blush': '#3a3630', '--gold': '#c8a45a', '--gold-deep': '#e8cf8f', '--ivory': '#141418' },
    fx: {
      petals: [['#ffffff', '#e6e1d6'], ['#f6f3ec', '#d8cdb6'], ['#ffffff', '#cfcac0']],
      confetti: ['#ffffff', '#111111', '#c8a45a', '#e8cf8f', '#d9d6cf'],
      fireworks: [['#ffffff', '#d9d6cf'], ['#fff3cc', '#c8a45a'], ['#f2f2f2', '#9a9a9a']],
      ambient: { petals: 0.1, bokeh: 0.6 }
    },
    music: { preparation: 'modern_pulse', reception: 'modern_groove' },
    outfits: {
      bride: { style: 'sleek', dress: ['#ffffff', '#f7f6f3', '#dcdad5'], accent: ['#f4e3b5', '#c8a45a', '#8a6d32'], hair: ['#2b2222', '#120d0d'], bouquet: ['ivory', 'ivory', 'ivory'] },
      groom: { style: 'tux', suit: ['#f4f3f0', '#ffffff', '#dcdad5'], lapel: ['#1a1a1d', '#000000'], tie: ['#1a1a1d', '#000', '#000'], shirt: '#ffffff', pants: '#151518' },
      bridesmaids: [{ style: 'sleek', gown: ['#141418', '#2a2a30', '#0b0b0d'], hair: ['#f0d29c', '#c79a5c'] }, { style: 'sleek', gown: ['#141418', '#2a2a30', '#0b0b0d'], hair: ['#3d302e', '#1c1515'] }],
      groomsmen: [{ suit: ['#121215', '#26262c', '#0d0d10'], tie: '#c8a45a' }, { suit: ['#121215', '#26262c', '#0d0d10'], tie: '#c8a45a' }],
      mc: { suit: ['#121215', '#26262c', '#0d0d10'], tie: '#ffffff' }
    }
  },

  fairytale: {
    id: 'fairytale',
    label: 'D · Fairytale',
    venue: 'castle',
    flowers: ['#d9c9ff', '#a8ecff', '#ffd6f4', '#ffffff', '#c4b0ff'],
    chair: { frame: '#e8e2ff', sash: '#a8ecff' },
    sky: {
      golden: ['#1c1f4f', '#47407f', '#b991c4', '#f3c6b6'],
      sunset: ['#26245a', '#5b4a92', '#d4a6c8'],
      night: ['#0b0c2a', '#251c56', '#5a3b7d']
    },
    hall: { wall: ['#3a3470', '#5d5296'], window: ['#0f1240', '#3a3a8a', '#9b8fd8'], drape: ['#8f7fd6', '#c9bdf5', '#7a69c4'], floor: ['#4f4888', '#7a72b5'], cloth: ['#f5f2ff', '#d6cff5'] },
    dance: { floor: ['#14123a', '#2c2364'], glow: '#a8ecff' },
    stageGold: ['#6c62b8', '#e9e2ff', '#6c62b8'],
    ui: { '--glass': 'rgba(32, 28, 78, 0.82)', '--glass-border': 'rgba(168, 236, 255, 0.6)', '--ink': '#f4f0ff', '--ink-soft': '#c4bce8', '--rose': '#ffb8ec', '--rose-deep': '#bfeaff', '--blush': '#3d3478', '--gold': '#e9d38f', '--gold-deep': '#f6e3a6', '--ivory': '#1a1740' },
    fx: {
      petals: [['#f2ecff', '#bba6ff'], ['#e8fbff', '#8fdcf5'], ['#fff0fb', '#f5a8e6']],
      confetti: ['#d9c9ff', '#a8ecff', '#ffd6f4', '#fff6c9', '#ffffff'],
      fireworks: [['#e8fbff', '#7fd8ff'], ['#f6ecff', '#b38cff'], ['#fff0fb', '#ff8ee0'], ['#fffbe6', '#f5d77a']],
      ambient: { petals: 0.15, bokeh: 0.5, magic: 1.4 }
    },
    music: { preparation: 'fairy_music_box', reception: 'fairy_music_box' },
    outfits: {
      bride: { style: 'princess', dress: ['#f6f2ff', '#e3ddff', '#b9c9f5'], accent: ['#ffffff', '#bfeaff', '#7fb8e8'], hair: ['#f3d9a4', '#c99a55'], bouquet: ['lilac', 'ice', 'lilac'] },
      groom: { style: 'prince', suit: ['#1d2a6b', '#2f42a0', '#17225a'], lapel: ['#f6e3a6', '#c9a24f'], tie: ['#ffffff', '#e8e8f0', '#c9c9d6'], shirt: '#ffffff', pants: '#f2efe8' },
      bridesmaids: [{ style: 'gown', gown: ['#cbbcff', '#e8e0ff', '#a996f0'], hair: ['#f0d29c', '#c79a5c'] }, { style: 'gown', gown: ['#a8e3ff', '#dcf5ff', '#83c8ec'], hair: ['#3d302e', '#1c1515'] }],
      groomsmen: [{ suit: ['#2a2f5e', '#3e4588', '#232750'], tie: '#bfeaff' }, { suit: ['#2a2f5e', '#3e4588', '#232750'], tie: '#d9c9ff' }],
      mc: { suit: ['#3b2b6b', '#55409a', '#2f225a'], tie: '#f6e3a6' }
    }
  },

  vietnamese: {
    id: 'vietnamese',
    label: 'E · Vietnamese Modern',
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
  }
};

export const VARIANT_IDS = Object.keys(VARIANTS);

export function getVariant(id) {
  return VARIANTS[id] || VARIANTS.luxury;
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
