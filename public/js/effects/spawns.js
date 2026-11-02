/**
 * Comment spawner — when a viewer names an animal / object ("con đà điểu", "pizza", "🦒"),
 * it shows up in the venue: animals walk across the floor with 2.5D depth and a contact
 * shadow, birds fly over, food lands on the tables, weather falls from the ceiling.
 *
 * Matching is done on diacritic-free lower-case text so "da dieu" and "đà điểu" both work;
 * single words only match exactly as written ("gà", "mèo", "dog") to avoid false hits like
 * "ông" → "ong". Longer phrases win and consume their text ("cá sấu" never also spawns "cá").
 * Emojis typed in the comment spawn directly. Bounded: at most MAX_ALIVE on stage.
 */
import { escapeHtml, shortName } from '../core/util.js';

const MAX_ALIVE = 7;
const MAX_PER_COMMENT = 2;

// move: walk | hop | fly | swim | drop | float | roll | pop
const ENTRIES = [
  ['ostrich', ['đà điểu', 'ostrich'], 'walk', 1.25],
  ['🐘', ['con voi', 'elephant'], 'walk', 1.5],
  ['🦒', ['hươu cao cổ', 'giraffe'], 'walk', 1.6],
  ['🦓', ['ngựa vằn', 'zebra'], 'walk', 1.2],
  ['🐎', ['con ngựa', 'ngựa', 'horse'], 'walk', 1.25],
  ['🦄', ['kỳ lân', 'ki lan', 'unicorn'], 'walk', 1.2],
  ['🐄', ['con bò', 'bò sữa', 'cow'], 'walk', 1.2],
  ['🐃', ['con trâu', 'trâu', 'buffalo'], 'walk', 1.25],
  ['🐖', ['con heo', 'con lợn', 'heo', 'lợn', 'pig'], 'walk', 1],
  ['🐐', ['con dê', 'dê', 'goat'], 'hop', 0.95],
  ['🐑', ['con cừu', 'cừu', 'sheep'], 'walk', 0.95],
  ['🐕', ['con chó', 'cún', 'chó', 'dog', 'puppy'], 'walk', 0.85],
  ['🐈', ['con mèo', 'mèo', 'cat', 'kitty'], 'walk', 0.8],
  ['🐇', ['con thỏ', 'thỏ', 'rabbit', 'bunny'], 'hop', 0.75],
  ['🐿️', ['sóc', 'squirrel'], 'hop', 0.6],
  ['🐀', ['con chuột', 'chuột', 'mouse'], 'walk', 0.5],
  ['🐓', ['con gà', 'gà trống', 'gà', 'chicken', 'rooster'], 'walk', 0.8],
  ['🐣', ['gà con', 'chick'], 'hop', 0.55],
  ['🦆', ['con vịt', 'vịt', 'duck'], 'walk', 0.75],
  ['🦢', ['thiên nga', 'swan'], 'walk', 0.95],
  ['🦚', ['con công', 'chim công', 'peacock'], 'walk', 1.15],
  ['🦩', ['hồng hạc', 'flamingo'], 'walk', 1.05],
  ['🐧', ['chim cánh cụt', 'cánh cụt', 'penguin'], 'walk', 0.8],
  ['🐢', ['con rùa', 'rùa', 'turtle'], 'walk', 0.75],
  ['🐊', ['cá sấu', 'crocodile'], 'walk', 1.2],
  ['🦖', ['khủng long', 'dinosaur', 'dino'], 'walk', 1.6],
  ['🐅', ['con hổ', 'cọp', 'hổ', 'tiger'], 'walk', 1.25],
  ['🦁', ['sư tử', 'lion'], 'walk', 1.25],
  ['🐻', ['con gấu', 'gấu', 'bear'], 'walk', 1.25],
  ['🐼', ['gấu trúc', 'panda'], 'walk', 1.1],
  ['🐒', ['con khỉ', 'khỉ', 'monkey'], 'hop', 0.9],
  ['🦊', ['cáo', 'fox'], 'walk', 0.9],
  ['🦘', ['chuột túi', 'kangaroo'], 'hop', 1.2],
  ['🦔', ['nhím', 'hedgehog'], 'walk', 0.55],
  ['🐍', ['con rắn', 'rắn', 'snake'], 'walk', 0.9],
  ['🐌', ['ốc sên', 'snail'], 'walk', 0.5],
  ['🦀', ['con cua', 'crab'], 'walk', 0.6],
  ['🦞', ['tôm hùm', 'lobster'], 'walk', 0.7],
  ['🐸', ['con ếch', 'ếch', 'frog'], 'hop', 0.6],
  ['🐟', ['con cá', 'cá', 'fish'], 'swim', 0.7],
  ['🐬', ['cá heo', 'dolphin'], 'swim', 1.1],
  ['🐳', ['cá voi', 'whale'], 'swim', 1.5],
  ['🦈', ['cá mập', 'shark'], 'swim', 1.3],
  ['🐙', ['bạch tuộc', 'octopus'], 'swim', 0.9],
  ['🕊️', ['bồ câu', 'chim bồ câu', 'dove'], 'fly', 0.8],
  ['🐦', ['con chim', 'chim', 'bird'], 'fly', 0.7],
  ['🦜', ['con vẹt', 'vẹt', 'parrot'], 'fly', 0.85],
  ['🦅', ['đại bàng', 'eagle'], 'fly', 1.1],
  ['🦉', ['cú mèo', 'con cú', 'owl'], 'fly', 0.9],
  ['🦋', ['con bướm', 'bươm bướm', 'bướm', 'butterfly'], 'fly', 0.6],
  ['🐝', ['con ong', 'bee'], 'fly', 0.5],
  ['🦇', ['con dơi', 'dơi', 'bat'], 'fly', 0.75],
  ['🐉', ['con rồng', 'rồng', 'dragon'], 'fly', 1.7],
  ['🍕', ['pizza'], 'drop', 0.9],
  ['🍔', ['hamburger', 'burger', 'bánh mì kẹp'], 'drop', 0.85],
  ['🥖', ['bánh mì', 'banh mi'], 'drop', 0.9],
  ['🍜', ['phở', 'bún bò', 'mì tôm', 'noodles'], 'drop', 0.9],
  ['🍚', ['cơm tấm', 'cơm', 'rice'], 'drop', 0.85],
  ['🍗', ['đùi gà', 'gà rán', 'fried chicken'], 'drop', 0.85],
  ['🍣', ['sushi'], 'drop', 0.8],
  ['🍦', ['kem', 'ice cream'], 'drop', 0.8],
  ['🍰', ['bánh kem', 'bánh ngọt', 'cake'], 'drop', 0.9],
  ['🍉', ['dưa hấu', 'watermelon'], 'roll', 1],
  ['🥭', ['xoài', 'mango'], 'roll', 0.7],
  ['🍌', ['chuối', 'banana'], 'drop', 0.75],
  ['🍎', ['táo', 'apple'], 'roll', 0.7],
  ['🥥', ['dừa', 'coconut'], 'roll', 0.8],
  ['🍺', ['bia', 'beer', 'dzô dzô'], 'drop', 0.85],
  ['🧋', ['trà sữa', 'milk tea'], 'drop', 0.85],
  ['☕', ['cà phê', 'cafe', 'coffee'], 'drop', 0.75],
  ['🍾', ['rượu', 'champagne', 'sâm panh'], 'drop', 0.95],
  ['🎈', ['bong bóng', 'balloon'], 'float', 0.9],
  ['🎁', ['hộp quà', 'quà', 'gift'], 'drop', 0.85],
  ['💰', ['tiền', 'phong bì', 'lì xì', 'money'], 'drop', 0.85],
  ['💍', ['nhẫn', 'ring'], 'pop', 0.9],
  ['🌸', ['hoa đào', 'hoa anh đào', 'sakura'], 'drop', 0.7],
  ['🌻', ['hướng dương', 'sunflower'], 'pop', 0.9],
  ['🌷', ['hoa tulip', 'tulip'], 'pop', 0.8],
  ['🌹', ['hoa hồng', 'rose'], 'pop', 0.8],
  ['🚗', ['ô tô', 'xe hơi', 'car'], 'roll', 1.4],
  ['🛵', ['xe máy', 'xe tay ga', 'scooter'], 'roll', 1.2],
  ['🚲', ['xe đạp', 'bike'], 'roll', 1.1],
  ['🚀', ['tên lửa', 'rocket'], 'fly', 1],
  ['✈️', ['máy bay', 'plane'], 'fly', 1.2],
  ['🛸', ['ufo', 'đĩa bay', 'người ngoài hành tinh'], 'fly', 1.2],
  ['👻', ['con ma', 'bóng ma', 'ghost'], 'float', 1],
  ['🤖', ['robot', 'người máy'], 'walk', 1.1],
  ['⛄', ['người tuyết', 'snowman'], 'pop', 1.2],
  ['❄️', ['tuyết', 'snow'], 'drop', 0.6],
  ['🌧️', ['mưa', 'rain'], 'drop', 0.8],
  ['⚡', ['sấm sét', 'tia sét', 'lightning'], 'pop', 1],
  ['🌈', ['cầu vồng', 'rainbow'], 'pop', 1.6],
  ['⭐', ['ngôi sao', 'star'], 'float', 0.7],
  ['🌙', ['mặt trăng', 'moon'], 'float', 1],
  ['☀️', ['mặt trời', 'sun'], 'float', 1.1],
  ['🔥', ['lửa', 'cháy', 'fire'], 'pop', 0.9],
  ['🎸', ['đàn guitar', 'guitar'], 'pop', 1],
  ['🎤', ['micro', 'hát karaoke', 'karaoke'], 'pop', 0.85],
  ['⚽', ['bóng đá', 'quả bóng', 'football'], 'roll', 0.75],
  ['🏀', ['bóng rổ', 'basketball'], 'roll', 0.75]
];

const LABELS = { ostrich: 'đà điểu' };

function fold(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
}

const WORD = '[\\p{L}\\p{N}]';
function wordRe(w) {
  return new RegExp(`(?<!${WORD})${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!${WORD})`, 'u');
}

/** One rule per phrase, longest first, so the most specific phrase claims the text. */
const PHRASES = ENTRIES.flatMap(([icon, words, move, size]) =>
  words.map((w) => ({
    rule: { icon, move, size, label: LABELS[icon] || words[0] },
    len: w.length,
    exact: new RegExp(wordRe(w.toLowerCase()).source, 'gu'),
    folded: w.includes(' ') ? new RegExp(wordRe(fold(w)).source, 'gu') : null
  }))
).sort((a, b) => b.len - a.len);
const RULES = ENTRIES.map(([icon, , move, size], i) => ({ icon, move, size, label: LABELS[icon] || ENTRIES[i][1][0] }));

const EMOJI_MOVE = new Map(RULES.map((r) => [r.icon.replace(/️/g, ''), r]));

/** Find up to MAX_PER_COMMENT things to spawn for a comment. Exported for the build check. */
export function findSpawns(text = '', emojis = []) {
  const out = [];
  const seen = new Set();
  const add = (r) => {
    if (seen.has(r.icon) || out.length >= MAX_PER_COMMENT) return;
    seen.add(r.icon);
    out.push(r);
  };
  for (const e of emojis) {
    const known = EMOJI_MOVE.get(String(e).replace(/️/g, ''));
    add(known || { icon: e, move: 'float', size: 0.85, label: e });
  }
  // fold() keeps string length for Vietnamese, so a match blanked in one string can be blanked in both.
  let lower = String(text).toLowerCase().normalize('NFC');
  let folded = fold(lower);
  if (folded.length !== lower.length) folded = lower;
  const blank = (m) => {
    lower = lower.slice(0, m.index) + ' '.repeat(m[0].length) + lower.slice(m.index + m[0].length);
    folded = folded.slice(0, m.index) + ' '.repeat(m[0].length) + folded.slice(m.index + m[0].length);
  };
  for (const p of PHRASES) {
    if (out.length >= MAX_PER_COMMENT) break;
    for (const [re, src] of [[p.exact, () => lower], [p.folded, () => folded]]) {
      if (!re) continue;
      re.lastIndex = 0;
      const m = re.exec(src());
      if (m) {
        blank(m);
        add(p.rule);
        break;
      }
    }
  }
  return out;
}

export const SPAWN_WORD_COUNT = ENTRIES.reduce((n, e) => n + e[1].length, 0);

/** Hand-drawn ostrich (there is no emoji for one). Legs animate with CSS. */
function ostrichSvg() {
  return `<svg viewBox="0 0 160 220" class="sp-svg ostrich">
    <g class="o-leg o-leg-a"><path d="M70 128 L64 176 L70 214" stroke="#e7b9a0" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M70 214 l14 0" stroke="#d9a58c" stroke-width="6" stroke-linecap="round"/></g>
    <g class="o-leg o-leg-b"><path d="M92 128 L98 176 L92 214" stroke="#dcae95" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M92 214 l14 0" stroke="#c99880" stroke-width="6" stroke-linecap="round"/></g>
    <path d="M28 102 C20 76 52 58 88 62 C122 66 140 86 132 110 C124 132 90 140 62 134 C42 130 32 120 28 102 Z" fill="#2c2628"/>
    <path d="M40 92 C52 80 76 78 96 86 M44 108 C60 98 84 98 110 106" stroke="#4a4144" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M24 96 C6 86 4 70 14 62 C16 78 26 84 34 88 Z M28 108 C8 108 0 96 6 84 C12 98 22 100 32 100 Z" fill="#fbf6ef"/>
    <path d="M118 84 C126 60 124 36 120 18" stroke="#efc3b0" stroke-width="12" fill="none" stroke-linecap="round" class="o-neck"/>
    <g class="o-head"><ellipse cx="124" cy="14" rx="13" ry="11" fill="#efc3b0"/><path d="M134 12 L152 16 L134 20 Z" fill="#e0a77e"/><circle cx="127" cy="11" r="3.2" fill="#1f1a1c"/><circle cx="128" cy="10" r="1" fill="#fff"/><path d="M116 4 q4 -6 8 -2 q2 -6 7 -1" stroke="#6b5f62" stroke-width="2" fill="none"/></g>
  </svg>`;
}

export class SpawnLayer {
  /** host: an element inside the world (moves with the camera); depth: y → scale. */
  constructor(host, { depth, onSpawn } = {}) {
    this.host = host;
    this.depth = depth || ((y) => y / 900);
    this.onSpawn = onSpawn;
    this.alive = [];
    this.spawned = 0;
  }

  spawnFor(user, text, emojis) {
    const hits = findSpawns(text, emojis);
    hits.forEach((r, i) => setTimeout(() => this.spawn(r, user), i * 450));
    return hits;
  }

  spawn(rule, user) {
    while (this.alive.length >= MAX_ALIVE) this.kill(this.alive[0]);
    const fromLeft = Math.random() < 0.5;
    const el = document.createElement('div');
    el.className = `spawn mv-${rule.move}`;
    const art = rule.icon === 'ostrich' ? ostrichSvg() : `<span class="sp-emoji">${escapeHtml(rule.icon)}</span>`;
    const tag = user ? `<span class="sp-tag">${escapeHtml(shortName(user.name, 12))} gọi ${escapeHtml(rule.label)}</span>` : '';
    el.innerHTML = `<div class="sp-shadow"></div><div class="sp-body"><div class="sp-flip">${art}</div></div>${tag}`;

    let y;
    let x0;
    let x1;
    let ms;
    switch (rule.move) {
      case 'fly':
        y = 380 + Math.random() * 180;
        x0 = fromLeft ? -200 : 2120;
        x1 = fromLeft ? 2120 : -200;
        ms = 6500;
        break;
      case 'float':
        y = 860 + Math.random() * 120;
        x0 = x1 = 520 + Math.random() * 880;
        ms = 6500;
        break;
      case 'drop':
      case 'pop':
        y = 820 + Math.random() * 180;
        x0 = x1 = 480 + Math.random() * 960;
        ms = 5200;
        break;
      default: // walk, hop, swim, roll — cross the floor at a random depth
        y = 800 + Math.random() * 230;
        x0 = fromLeft ? -180 : 2100;
        x1 = fromLeft ? 2100 : -180;
        ms = rule.move === 'roll' ? 5200 : rule.move === 'swim' ? 7000 : 8500;
    }
    const s = this.depth(y) * rule.size;
    el.style.zIndex = String(Math.round(y));
    el.style.setProperty('--s', s.toFixed(3));
    // Emojis face left by default; the hand-drawn ostrich faces right.
    const facesRight = rule.icon === 'ostrich';
    el.style.setProperty('--face', fromLeft !== facesRight ? '-1' : '1');
    el.style.setProperty('--ms', `${ms}ms`);
    el.style.setProperty('--h', facesRight ? '230px' : '160px');
    el.style.transform = `translate3d(${x0}px, ${y}px, 0)`;
    this.host.appendChild(el);
    const item = { el, timer: 0 };
    this.alive.push(item);
    this.spawned += 1;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.classList.add('go');
        if (x1 !== x0) el.style.transform = `translate3d(${x1}px, ${y}px, 0)`;
      })
    );
    item.timer = setTimeout(() => this.kill(item), ms + 200);
    this.onSpawn?.(rule, user, { x: x0 === x1 ? x0 : 960, y });
    return item;
  }

  kill(item) {
    const i = this.alive.indexOf(item);
    if (i >= 0) this.alive.splice(i, 1);
    clearTimeout(item.timer);
    item.el.classList.add('bye');
    setTimeout(() => item.el.remove(), 400);
  }

  debug() {
    return { alive: this.alive.length, spawned: this.spawned };
  }
}
