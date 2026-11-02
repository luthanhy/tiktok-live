/**
 * WeddingFX — canvas particle engine (1920×1080).
 * Performance rules carried over from the original engine:
 *  - all gradients are pre-rendered once into sprite canvases (no gradients/shadows per frame)
 *  - frame loop sleeps when nothing is alive, pauses when the tab is hidden
 *  - hard particle budget (config.effects.particleBudget); emitters degrade instead of lagging
 */
import { rand, pick } from '../core/util.js';

const W = 1920;
const H = 1080;
const PETAL_TINTS = [
  ['#ffe3ea', '#f39bb4'],
  ['#fff7f8', '#f6c5d2'],
  ['#ffd0dc', '#e7708f'],
  ['#fff3e6', '#f0c9a2']
];
const CONFETTI = ['#f7c6d4', '#f2a7bd', '#fff4d9', '#e9c46a', '#d4b0f0', '#ffffff', '#f6d7a7', '#ffb3c7'];
const POOL_KEYS = ['k', 'img', 'x', 'y', 'vx', 'vy', 'g', 'drag', 'rot', 'vr', 'sway', 'phase', 'size', 'life', 'age', 'delay', 'grow', 'twinkle', 'softAlpha', 'color', 'w', 'h', 'flip', 'onDone', 'x0', 'y0', 'x1', 'y1', 'arc', 'ambient', 'r0'];
const FIREWORK = [
  ['#ffd7e6', '#ff7fb0'],
  ['#fff3cc', '#f2c14e'],
  ['#ffffff', '#cfd8ff'],
  ['#efd8ff', '#b07cf0'],
  ['#ffe2cf', '#ff9e6e']
];

function sprite(size, draw) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  draw(c.getContext('2d'), size);
  return c;
}

export class WeddingFX {
  constructor(canvas, { getConfig } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = W;
    canvas.height = H;
    this.getConfig = getConfig || (() => ({}));
    this.parts = [];
    this.rockets = [];
    this.emitters = [];
    this.ambient = { petals: 0, bokeh: 0, stars: 0 };
    this.last = performance.now();
    this.running = false;
    this.palette = { petals: PETAL_TINTS, confetti: CONFETTI, fireworks: FIREWORK };
    this.pool = [];
    this.buildSprites();
    this.loop = this.loop.bind(this);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.wake();
    });
    this.wake();
  }

  cfg() {
    return this.getConfig() || {};
  }

  enabled(kind) {
    const c = this.cfg();
    return c[kind] !== false;
  }

  budget() {
    return Number(this.cfg().particleBudget) || 650;
  }

  room(n) {
    return Math.max(0, Math.min(n, this.budget() - this.parts.length));
  }

  buildSprites() {
    this.petals = this.palette.petals.map(([a, b]) =>
      sprite(48, (g, s) => {
        const grad = g.createRadialGradient(s * 0.4, s * 0.35, 2, s / 2, s / 2, s / 2);
        grad.addColorStop(0, a);
        grad.addColorStop(1, b);
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(s / 2, s * 0.08);
        g.bezierCurveTo(s * 0.95, s * 0.25, s * 0.85, s * 0.85, s / 2, s * 0.95);
        g.bezierCurveTo(s * 0.15, s * 0.85, s * 0.05, s * 0.25, s / 2, s * 0.08);
        g.fill();
        g.strokeStyle = 'rgba(255,255,255,.45)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(s / 2, s * 0.2);
        g.quadraticCurveTo(s * 0.55, s * 0.55, s / 2, s * 0.85);
        g.stroke();
      })
    );
    const heart = (fill, glow) =>
      sprite(64, (g, s) => {
        const grad = g.createRadialGradient(s / 2, s / 2, 4, s / 2, s / 2, s / 2);
        grad.addColorStop(0, glow);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, s, s);
        g.fillStyle = fill;
        g.beginPath();
        const x = s / 2;
        const y = s * 0.36;
        g.moveTo(x, s * 0.8);
        g.bezierCurveTo(s * 0.12, s * 0.55, s * 0.18, s * 0.14, x, y);
        g.bezierCurveTo(s * 0.82, s * 0.14, s * 0.88, s * 0.55, x, s * 0.8);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,.55)';
        g.beginPath();
        g.ellipse(s * 0.37, s * 0.35, s * 0.06, s * 0.035, -0.6, 0, Math.PI * 2);
        g.fill();
      });
    this.hearts = [heart('#ff6f9b', 'rgba(255,170,200,.55)'), heart('#ff9fbc', 'rgba(255,200,220,.5)'), heart('#ffffff', 'rgba(255,220,235,.6)'), heart('#e8456f', 'rgba(255,140,170,.5)')];
    this.spark = sprite(32, (g, s) => {
      const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.25, 'rgba(255,240,200,.9)');
      grad.addColorStop(1, 'rgba(255,220,160,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, s, s);
    });
    this.fwSprites = this.palette.fireworks.map(([core, edge]) =>
      sprite(24, (g, s) => {
        const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        grad.addColorStop(0, core);
        grad.addColorStop(0.35, edge);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, s, s);
      })
    );
    this.bokeh = ['rgba(255,236,200,', 'rgba(255,200,220,', 'rgba(255,255,255,'].map((c) =>
      sprite(96, (g, s) => {
        const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        grad.addColorStop(0, `${c}.55)`);
        grad.addColorStop(0.7, `${c}.25)`);
        grad.addColorStop(1, `${c}0)`);
        g.fillStyle = grad;
        g.fillRect(0, 0, s, s);
      })
    );
    this.mist = sprite(256, (g, s) => {
      const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grad.addColorStop(0, 'rgba(255,190,220,.35)');
      grad.addColorStop(0.6, 'rgba(240,190,255,.15)');
      grad.addColorStop(1, 'rgba(255,200,230,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, s, s);
    });
    this.bubble = sprite(32, (g, s) => {
      g.strokeStyle = 'rgba(255,248,220,.9)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(s / 2, s / 2, s / 2 - 3, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,.8)';
      g.beginPath();
      g.arc(s * 0.38, s * 0.36, 3, 0, Math.PI * 2);
      g.fill();
    });
    this.rose = sprite(72, (g, s) => {
      const grad = g.createRadialGradient(s * 0.42, s * 0.4, 2, s / 2, s / 2, s * 0.32);
      grad.addColorStop(0, '#ffd3df');
      grad.addColorStop(0.6, '#f08aa6');
      grad.addColorStop(1, '#c4506f');
      g.fillStyle = '#7fa377';
      g.beginPath();
      g.ellipse(s * 0.28, s * 0.68, s * 0.16, s * 0.07, -0.6, 0, Math.PI * 2);
      g.ellipse(s * 0.72, s * 0.68, s * 0.16, s * 0.07, 0.6, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = grad;
      g.beginPath();
      g.arc(s / 2, s / 2, s * 0.3, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(160,50,80,.45)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(s / 2, s / 2, s * 0.17, 0.4, 4.6);
      g.arc(s * 0.52, s * 0.5, s * 0.08, 2, 6);
      g.stroke();
    });
  }

  wake() {
    if (this.running || document.hidden) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.loop);
  }

  /** Particle objects are recycled (long streams would otherwise churn the GC). */
  add(spec) {
    if (this.parts.length >= this.budget()) return null;
    const p = this.pool.pop() || {};
    for (const k of POOL_KEYS) p[k] = undefined;
    Object.assign(p, spec);
    this.parts.push(p);
    this.wake();
    return p;
  }

  // ---------------------------------------------------------------- emitters
  petalsFall(n = 40, { side = 'top', x = W / 2, spread = W } = {}) {
    if (!this.enabled('petals')) return;
    for (let i = 0; i < this.room(n); i++) {
      let px = x + rand(-spread / 2, spread / 2);
      let py = rand(-120, -10);
      let vx = rand(-30, 30);
      if (side === 'left' || side === 'right') {
        const dir = side === 'left' ? 1 : -1;
        px = side === 'left' ? rand(-40, 120) : rand(W - 120, W + 40);
        py = rand(80, 700);
        vx = dir * rand(120, 320);
      }
      this.add({ k: 'petal', img: pick(this.petals), x: px, y: py, vx, vy: rand(40, 110), rot: rand(0, 6.28), vr: rand(-2, 2), sway: rand(0.8, 2.2), phase: rand(0, 6.28), size: rand(16, 34), life: rand(6, 10), age: 0, fade: 1 });
    }
  }

  petalBurst(x, y, n = 30) {
    if (!this.enabled('petals')) return;
    for (let i = 0; i < this.room(n); i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(120, 420);
      this.add({ k: 'petal', img: pick(this.petals), x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 160, g: 260, drag: 1.6, rot: rand(0, 6.28), vr: rand(-5, 5), sway: 1, phase: rand(0, 6), size: rand(14, 28), life: rand(2.5, 4), age: 0 });
    }
  }

  heartsRise(n = 10, { x = 1700, y = 1000, spread = 120 } = {}) {
    if (!this.enabled('hearts')) return;
    for (let i = 0; i < this.room(n); i++) {
      this.add({ k: 'heart', img: pick(this.hearts), x: x + rand(-spread, spread) * 0.3, y: y + rand(-20, 20), vx: rand(-40, 40), vy: rand(-260, -140), sway: rand(30, 70), phase: rand(0, 6.28), size: rand(26, 54), life: rand(2.6, 4.2), age: i * 0.06, delay: i * 0.06, grow: true });
    }
  }

  heartBurst(x, y, n = 36, power = 1) {
    if (!this.enabled('hearts')) return;
    for (let i = 0; i < this.room(n); i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.1, 0.1);
      const sp = rand(180, 420) * power;
      this.add({ k: 'heart', img: pick(this.hearts), x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, drag: 1.8, g: 40, size: rand(22, 48), life: rand(1.8, 3), age: 0 });
    }
  }

  confettiCannon(x, y, angleDeg, n = 80, power = 1) {
    if (!this.enabled('confetti')) return;
    for (let i = 0; i < this.room(n); i++) {
      const a = ((angleDeg + rand(-18, 18)) * Math.PI) / 180;
      const sp = rand(700, 1300) * power;
      this.add({ k: 'confetti', color: pick(this.palette.confetti), x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 520, drag: 1.4, rot: rand(0, 6.28), vr: rand(-12, 12), w: rand(8, 16), h: rand(4, 9), flip: rand(0, 6.28), life: rand(3.5, 5.5), age: 0 });
    }
  }

  confettiBoth(n = 140) {
    this.confettiCannon(-20, 1000, -62, n / 2);
    this.confettiCannon(W + 20, 1000, -118, n / 2);
  }

  confettiRain(n = 120) {
    if (!this.enabled('confetti')) return;
    for (let i = 0; i < this.room(n); i++) {
      this.add({ k: 'confetti', color: pick(this.palette.confetti), x: rand(0, W), y: rand(-400, -10), vx: rand(-40, 40), vy: rand(120, 260), g: 30, drag: 0.2, rot: rand(0, 6.28), vr: rand(-8, 8), w: rand(8, 15), h: rand(4, 8), flip: rand(0, 6.28), life: rand(6, 9), age: 0 });
    }
  }

  sparkles(n = 30, { x = W / 2, y = H / 2, w = 600, h = 400, rise = 30 } = {}) {
    if (!this.enabled('sparkles')) return;
    for (let i = 0; i < this.room(n); i++) {
      this.add({ k: 'spark', img: this.spark, x: x + rand(-w / 2, w / 2), y: y + rand(-h / 2, h / 2), vx: rand(-20, 20), vy: -rand(0, rise), size: rand(10, 30), life: rand(0.8, 1.8), age: -rand(0, 0.8), twinkle: rand(8, 16) });
    }
  }

  sparkleTrail(x0, y0, x1, y1, n = 24) {
    if (!this.enabled('sparkles')) return;
    for (let i = 0; i < this.room(n); i++) {
      const t = i / n;
      this.add({ k: 'spark', img: this.spark, x: x0 + (x1 - x0) * t + rand(-10, 10), y: y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * 120 + rand(-10, 10), vx: rand(-15, 15), vy: rand(-30, 10), size: rand(10, 22), life: rand(0.8, 1.4), age: -t * 0.6, twinkle: 12 });
    }
  }

  bubbles(x, y, n = 40) {
    for (let i = 0; i < this.room(n); i++) {
      this.add({ k: 'bubble', img: this.bubble, x: x + rand(-30, 30), y, vx: rand(-60, 60), vy: rand(-420, -200), g: 120, drag: 0.6, sway: rand(10, 30), phase: rand(0, 6), size: rand(8, 20), life: rand(1.6, 2.8), age: -rand(0, 0.6) });
    }
  }

  perfumeMist(n = 14) {
    for (let i = 0; i < this.room(n); i++) {
      this.add({ k: 'mist', img: this.mist, x: rand(-200, 200), y: rand(300, 900), vx: rand(260, 420), vy: rand(-30, 10), size: rand(260, 460), life: rand(4.5, 6.5), age: -i * 0.12, softAlpha: 0.9 });
    }
    this.sparkles(60, { x: W / 2, y: 560, w: W, h: 600, rise: 40 });
  }

  /** A rose flies along an arc to a target and bursts into petals. */
  roseFlight(x0, y0, x1, y1, { count = 1 } = {}) {
    for (let i = 0; i < Math.min(count, 8); i++) {
      this.add({ k: 'flight', img: this.rose, x0: x0 + rand(-30, 30), y0: y0 + rand(-20, 20), x1: x1 + rand(-14, 14), y1: y1 + rand(-14, 14), arc: rand(140, 240), size: 54, life: 1.5, age: -i * 0.18, onDone: (p) => this.petalBurst(p.x1, p.y1, 10) });
    }
  }

  fireworks(n = 4, { area = [260, 1660], top = 120, bottom = 420, delay = 0.5 } = {}) {
    if (!this.enabled('fireworks')) return;
    for (let i = 0; i < n; i++) {
      this.rockets.push({ x: rand(area[0], area[1]), y: H + 20, tx: 0, ty: rand(top, bottom), vy: -rand(900, 1150), age: -i * delay - rand(0, 0.3), palette: Math.floor(rand(0, this.fwSprites.length)), trail: [] });
    }
    this.wake();
  }

  burstAt(x, y, paletteIdx = 0, n = 90) {
    const img = this.fwSprites[paletteIdx % this.fwSprites.length];
    const ring = Math.random() < 0.35;
    for (let i = 0; i < this.room(n); i++) {
      const a = (i / n) * Math.PI * 2;
      const sp = ring ? 360 : rand(80, 420);
      this.add({ k: 'fw', img, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 140, drag: 1.25, size: rand(10, 18), life: rand(1.2, 2.1), age: 0, twinkle: Math.random() < 0.4 ? 18 : 0 });
    }
    this.onBurst?.(x, y);
  }

  /** Ambient life per scene: drifting petals, bokeh orbs or stars. */
  recycle(p) {
    if (this.pool.length < 1500) this.pool.push(p);
  }

  /** Variant palettes (petal tints, confetti colours, firework colours). */
  setPalette({ petals, confetti, fireworks } = {}) {
    this.palette = { petals: petals || PETAL_TINTS, confetti: confetti || CONFETTI, fireworks: fireworks || FIREWORK };
    this.buildSprites();
  }

  /** Rarity-scaled gift burst: shockwave ring(s) + radial sparks (+ confetti for legendary). */
  giftExplosion(x, y, rarity = 'rare') {
    if (this.cfg().giftExplosions === false) return;
    const power = { common: 0.5, rare: 0.8, epic: 1.1, legendary: 1.5 }[rarity] || 0.8;
    const rings = rarity === 'legendary' ? 3 : rarity === 'epic' ? 2 : 1;
    for (let i = 0; i < rings; i++) this.add({ k: 'ring', x, y, vx: 0, vy: 0, r0: 20, size: 260 * power + i * 80, life: 0.9 + i * 0.15, age: -i * 0.12, color: i % 2 ? '#ffd6e6' : '#fff1c1' });
    const n = Math.round(40 * power);
    for (let i = 0; i < this.room(n); i++) {
      const a = (i / n) * Math.PI * 2;
      const sp = rand(260, 620) * power;
      this.add({ k: 'fw', img: pick(this.fwSprites), x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 80, drag: 2, size: rand(10, 20), life: rand(0.7, 1.3), age: 0, twinkle: 14 });
    }
    if (rarity === 'legendary') this.confettiCannon(x, y + 40, -90, 120, 0.9);
  }

  setAmbient({ petals = 0, bokeh = 0, magic = 0 } = {}) {
    this.ambient = { petals, bokeh, magic };
    this.wake();
  }

  clear() {
    this.parts = [];
    this.rockets = [];
  }

  // ---------------------------------------------------------------- frame
  spawnAmbient(dt) {
    const a = this.ambient;
    if (a.magic && Math.random() < a.magic * dt * 3 && this.parts.length < this.budget() * 0.5) {
      this.add({ k: 'spark', img: pick(this.fwSprites), x: rand(0, W), y: rand(500, H), vx: rand(-14, 14), vy: rand(-60, -20), sway: rand(10, 30), phase: rand(0, 6), size: rand(8, 18), life: rand(4, 7), age: 0, twinkle: rand(3, 7), ambient: true });
    }
    if (a.petals && this.enabled('petals') && Math.random() < a.petals * dt && this.parts.length < this.budget() * 0.5) {
      this.add({ k: 'petal', img: pick(this.petals), x: rand(-100, W), y: -30, vx: rand(20, 70), vy: rand(30, 70), rot: rand(0, 6.28), vr: rand(-1.5, 1.5), sway: rand(0.6, 1.6), phase: rand(0, 6.28), size: rand(12, 24), life: 16, age: 0, ambient: true });
    }
    if (a.bokeh && Math.random() < a.bokeh * dt && this.parts.length < this.budget() * 0.5) {
      this.add({ k: 'bokeh', img: pick(this.bokeh), x: rand(0, W), y: rand(0, H), vx: rand(-8, 8), vy: rand(-14, -4), size: rand(40, 120), life: rand(5, 9), age: 0, ambient: true });
    }
  }

  loop(now) {
    if (document.hidden) {
      this.running = false;
      return;
    }
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, W, H);
    this.spawnAmbient(dt);

    // rockets
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.age += dt;
      if (r.age < 0) continue;
      r.y += r.vy * dt;
      r.vy += 380 * dt;
      r.trail.push([r.x, r.y]);
      if (r.trail.length > 10) r.trail.shift();
      ctx.globalCompositeOperation = 'lighter';
      r.trail.forEach(([tx, ty], j) => {
        ctx.globalAlpha = (j / r.trail.length) * 0.8;
        ctx.drawImage(this.spark, tx - 6, ty - 6, 12, 12);
      });
      if (r.y <= r.ty || r.vy >= -60) {
        this.burstAt(r.x, r.y, r.palette);
        this.rockets.splice(i, 1);
      }
    }

    // particles
    const parts = this.parts;
    let write = 0;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.age += dt;
      if (p.age < 0) {
        parts[write++] = p;
        continue;
      }
      if (p.age >= p.life) {
        p.onDone?.(p);
        this.recycle(p);
        continue;
      }
      const t = p.age / p.life;
      if (p.k === 'flight') {
        const e = 1 - Math.pow(1 - Math.min(1, t * 1.1), 3);
        p.x = p.x0 + (p.x1 - p.x0) * e;
        p.y = p.y0 + (p.y1 - p.y0) * e - Math.sin(e * Math.PI) * p.arc;
      } else {
        if (p.drag) {
          p.vx -= p.vx * p.drag * dt;
          p.vy -= p.vy * p.drag * dt;
        }
        if (p.g) p.vy += p.g * dt;
        p.x += p.vx * dt + (p.sway ? Math.sin(p.age * (p.k === 'petal' ? p.sway : 2) + p.phase) * (p.k === 'petal' ? 0.9 : p.sway * dt) : 0);
        p.y += p.vy * dt;
        if (p.vr) p.rot += p.vr * dt;
      }
      if (p.y > H + 80 || p.x < -300 || p.x > W + 300) {
        this.recycle(p);
        continue;
      }

      let alpha = t < 0.12 ? t / 0.12 : t > 0.75 ? (1 - t) / 0.25 : 1;
      if (p.twinkle) alpha *= 0.55 + 0.45 * Math.sin(p.age * p.twinkle);
      if (p.softAlpha) alpha *= p.softAlpha;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      if (p.k === 'ring') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, 14 * (1 - t));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r0 + (p.size - p.r0) * (1 - Math.pow(1 - t, 3)), 0, Math.PI * 2);
        ctx.stroke();
        parts[write++] = p;
        continue;
      }
      if (p.k === 'confetti') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.age * 9 + p.flip));
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      } else {
        ctx.globalCompositeOperation = p.k === 'fw' || p.k === 'spark' || p.k === 'bokeh' ? 'lighter' : 'source-over';
        const size = p.grow ? p.size * Math.min(1, 0.4 + t * 2.5) : p.size;
        if (p.rot !== undefined && p.k === 'petal') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(p.age * 2 + p.phase)));
          ctx.drawImage(p.img, -size / 2, -size / 2, size, size);
          ctx.restore();
        } else {
          ctx.drawImage(p.img, p.x - size / 2, p.y - size / 2, size, size);
        }
      }
      parts[write++] = p;
    }
    parts.length = write;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    const idle = parts.length === 0 && this.rockets.length === 0 && !this.ambient.petals && !this.ambient.bokeh && !this.ambient.magic;
    if (idle) {
      this.running = false;
      return;
    }
    requestAnimationFrame(this.loop);
  }

  stats() {
    return { particles: this.parts.length, rockets: this.rockets.length, pooled: this.pool.length, budget: this.budget() };
  }
}
