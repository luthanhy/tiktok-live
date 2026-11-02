/**
 * Stage runtime: owns the world container (scene layers + cast layer), the camera,
 * scene transitions, the wedding party actors and the viewer guest seating.
 */
import { buildScenes, sceneDefs, tableSvg } from './scenes.js';
import { characterDefs, guestSeatSvg, crowdSvg } from '../characters/cast.js';
import { SpawnLayer } from '../effects/spawns.js';
import { CharacterManager } from '../characters/manager.js';
import { setFlowerPalette } from './decor.js';
import { variantDefs } from '../themes/variants.js';
import { escapeHtml, shortName, wait } from '../core/util.js';

const MAX_CROWD = 44;
const BASE_CROWD = 12; // relatives of both families are always there, so an empty room never looks deserted
const MAX_SAY = 4;

const chairSvg = ({ frame = '#f6efe4', sash = '#f6c3d1' } = {}) =>
  `<svg class="chair" viewBox="0 0 120 140"><path d="M22 140 L26 70 Q60 58 94 70 L98 140" stroke="${frame}" stroke-width="7" fill="none"/><path d="M28 86 Q60 76 92 86 M30 104 Q60 94 90 104" stroke="${frame}" stroke-width="5" fill="none"/><path d="M26 70 Q60 58 94 70" stroke="#000" stroke-opacity=".15" stroke-width="3" fill="none"/><path d="M50 74 q10 18 20 0 q4 22 -10 30 q-14 -8 -10 -30" fill="${sash}"/></svg>`;

export class Stage {
  constructor(root, { couple = {}, variant } = {}) {
    this.root = root;
    this.world = root.querySelector('#world');
    this.backLayer = root.querySelector('#scene-back');
    this.frontLayer = root.querySelector('#scene-front');
    this.castLayer = root.querySelector('#cast');
    this.couple = couple;
    this.variant = variant;
    this.scenes = null;
    this.sceneEls = {};
    this.current = null;
    this.camera = { zoom: 1, x: 960, y: 540 };
    this.guests = [];
    this.seatEls = [];
    this.walkers = new Set();
    this.crowdSize = 0;
    this.sayEls = [];
  }

  init() {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    defs.setAttribute('class', 'svg-defs');
    defs.setAttribute('aria-hidden', 'true');
    // Variant gradients come first so they win over the generic ones with the same id.
    defs.innerHTML = `<defs>${this.variant ? variantDefs(this.variant) : ''}${characterDefs()}${sceneDefs()}</defs>`;
    document.body.prepend(defs);
    setFlowerPalette(this.variant?.flowers);
    this.chair = chairSvg(this.variant?.chair);
    this.scenes = buildScenes(this.couple, this.variant);

    for (const [id, sc] of Object.entries(this.scenes)) {
      const { back, front } = sc.build();
      const b = document.createElement('div');
      b.className = 'scene scene-back';
      b.dataset.scene = id;
      b.innerHTML = back;
      const f = document.createElement('div');
      f.className = 'scene scene-front';
      f.dataset.scene = id;
      f.innerHTML = front;
      this.backLayer.appendChild(b);
      this.frontLayer.appendChild(f);
      this.sceneEls[id] = { back: b, front: f };
    }

    this.crowdLayer = document.createElement('div');
    this.crowdLayer.className = 'crowd';
    this.castLayer.appendChild(this.crowdLayer);
    this.tableLayer = document.createElement('div');
    this.tableLayer.className = 'tables';
    this.castLayer.appendChild(this.tableLayer);
    this.seatLayer = document.createElement('div');
    this.seatLayer.className = 'seats';
    this.castLayer.appendChild(this.seatLayer);

    this.spawns = new SpawnLayer(this.castLayer, { depth: (y) => this.depth(y) });
    this.characters = new CharacterManager(this.castLayer, { depth: (y) => this.depth(y), outfits: this.variant?.outfits });
    const c = this.characters;
    this.cast = {
      groom: c.create({ id: 'groom', type: 'groom', name: this.couple.groomName }),
      bride: c.create({ id: 'bride', type: 'bride', name: this.couple.brideName }),
      mc: c.create({ id: 'mc', type: 'mc', name: 'MC', size: 0.97 }),
      bm1: c.create({ id: 'bm1', type: 'bridesmaid', index: 0, size: 0.93 }),
      bm2: c.create({ id: 'bm2', type: 'bridesmaid', index: 1, size: 0.92 }),
      gm1: c.create({ id: 'gm1', type: 'groomsman', index: 0, size: 0.97 }),
      gm2: c.create({ id: 'gm2', type: 'groomsman', index: 1, size: 0.96 })
    };
    this.setScene('garden', { transition: 'cut' });
    this.startDrift();
  }

  depth(y) {
    return (this.scenes[this.current]?.depth || ((v) => v / 900))(y);
  }

  marks() {
    return this.scenes[this.current]?.marks || {};
  }

  mark(name) {
    return this.marks()[name] || { x: 960, y: 800 };
  }

  // ---------------------------------------------------------------- scenes
  async setScene(id, { transition = 'fade', ms = 1400 } = {}) {
    if (!this.scenes[id]) throw new Error(`Unknown scene ${id}`);
    if (this.current === id) return;
    const prev = this.current;
    this.current = id;
    this.root.dataset.scene = id;
    if (transition === 'cut' || !prev) {
      // A cut is instant: no cross-fade (which would also stall on a hidden/occluded window).
      this.root.classList.add('no-fade');
      requestAnimationFrame(() => requestAnimationFrame(() => this.root.classList.remove('no-fade')));
      setTimeout(() => this.root.classList.remove('no-fade'), 500);
      for (const [sid, els] of Object.entries(this.sceneEls)) {
        els.back.classList.toggle('active', sid === id);
        els.front.classList.toggle('active', sid === id);
      }
      this.layoutScene();
      return;
    }
    // Cinematic dissolve through a soft white bloom; the cast re-blocks while covered.
    this.root.style.setProperty('--scene-ms', `${ms}ms`);
    this.root.classList.add('scene-transition');
    await wait(ms / 2);
    for (const [sid, els] of Object.entries(this.sceneEls)) {
      els.back.classList.toggle('active', sid === id);
      els.front.classList.toggle('active', sid === id);
    }
    this.layoutScene();
    await wait(ms / 2);
    this.root.classList.remove('scene-transition');
  }

  layoutScene() {
    const sc = this.scenes[this.current];
    this.tableLayer.innerHTML = (sc.tables || [])
      .map((t, i) => `<div class="table" style="transform:translate3d(${t.x}px,${t.y}px,0) translate(-50%,-80%) scale(${this.depth(t.y)});z-index:${Math.round(t.y)}">${tableSvg(i + 3)}</div>`)
      .join('');
    this.renderGuests(this.guests, { animateNew: false });
    this.renderCrowd();
    for (const a of Object.values(this.cast)) a.apply();
  }

  /** 0–4: how much of the venue is decorated (driven by the Preparation meter). */
  setPrepLevel(level) {
    const v = String(Math.max(0, Math.min(4, Math.floor(level))));
    if (this.root.dataset.prep !== v) this.root.dataset.prep = v;
  }

  /** Short camera shake for big impacts (respects the cameraShake effect toggle). */
  shake(intensity = 1, ms = 650) {
    if (this.shakeEnabled && !this.shakeEnabled()) return;
    this.root.style.setProperty('--shake', String(intensity));
    this.root.classList.remove('shaking');
    void this.root.offsetWidth;
    this.root.classList.add('shaking');
    clearTimeout(this.shakeTimer);
    this.shakeTimer = setTimeout(() => this.root.classList.remove('shaking'), ms);
  }

  // ---------------------------------------------------------------- camera
  setCamera({ zoom = 1, x = 960, y = 540, ms = 1800, ease = 'cubic-bezier(.45,.05,.2,1)' } = {}) {
    this.camera = { zoom, x, y };
    const tx = 960 - x * zoom;
    const ty = 540 - y * zoom;
    this.world.style.transition = `transform ${ms}ms ${ease}`;
    this.world.style.transform = `translate(${tx}px, ${ty}px) scale(${zoom})`;
    // Parallax: far layers drift less than the cast when the camera pushes in.
    this.root.style.setProperty('--par-x', `${((x - 960) * 0.06).toFixed(1)}px`);
    this.root.style.setProperty('--par-y', `${((y - 540) * 0.04).toFixed(1)}px`);
    this.root.style.setProperty('--cam-ms', `${ms}ms`);
  }

  /** World (stage) coordinates → screen coordinates of the 1920×1080 frame (for canvas FX). */
  toScreen(x, y) {
    const { zoom, x: cx, y: cy } = this.camera;
    return { x: (x - cx) * zoom + 960, y: (y - cy) * zoom + 540 };
  }

  /** Screen point at an actor's chest / head height. */
  actorPoint(actor, at = 'head') {
    const s = actor.scaleAt(actor.y);
    const lift = at === 'head' ? 360 : at === 'hands' ? 220 : 0;
    return this.toScreen(actor.x, actor.y - lift * s);
  }

  resetCamera(ms = 1600) {
    this.setCamera({ zoom: 1, x: 960, y: 540, ms });
  }

  /** Slow handheld-style drift keeps the frame alive between beats. */
  startDrift() {
    let t = 0;
    const tick = () => {
      t += 1;
      const dx = Math.sin(t / 9) * 6;
      const dy = Math.cos(t / 13) * 3;
      this.root.style.setProperty('--drift-x', `${dx.toFixed(2)}px`);
      this.root.style.setProperty('--drift-y', `${dy.toFixed(2)}px`);
    };
    tick();
    this.driftTimer = setInterval(tick, 1000);
  }

  // ---------------------------------------------------------------- cast
  placeCast(map) {
    for (const [id, markName] of Object.entries(map)) {
      const actor = this.cast[id];
      if (!actor) continue;
      if (markName === null) {
        actor.show(false);
        continue;
      }
      const m = typeof markName === 'string' ? this.mark(markName) : markName;
      actor.show(true);
      actor.place(m.x, m.y);
    }
  }

  allCast() {
    return Object.values(this.cast);
  }

  // ---------------------------------------------------------------- guests
  /** guests: [{id,name,avatar,role}] most recent last. Fills seats of the current scene. */
  renderGuests(guests, { animateNew = true } = {}) {
    this.guests = guests || [];
    const sc = this.scenes[this.current];
    if (!sc) return;
    const seats = sc.seats || [];
    const visible = this.arrangeGuests(this.guests, seats);
    const known = new Set(this.seatEls.map((s) => s.dataset.guest).filter(Boolean));
    const frag = document.createDocumentFragment();
    const els = [];
    seats.forEach((seat, i) => {
      const g = visible[i];
      const elx = document.createElement('div');
      const s = this.depth(seat.y) * (seat.scale || (seat.standing ? 1.0 : 0.88));
      elx.className = `seat${seat.standing ? ' standing' : ''}${seat.table ? ' at-table' : ''}${g ? ' filled' : ''}`;
      elx.style.transform = `translate3d(${seat.x}px, ${seat.y}px, 0) translate(-50%, -100%) scale(${s.toFixed(3)})`;
      elx.style.zIndex = String(Math.round(seat.y) - 1);
      elx.dataset.x = String(seat.x);
      elx.dataset.y = String(seat.y);
      if (g) {
        elx.dataset.guest = g.id;
        const role = (g.role && g.role !== 'guest' ? ` role-${g.role}` : '') + (g.team ? ` team-${g.team}` : '');
        elx.innerHTML = `<div class="bust${role}">${guestSeatSvg(g.id, { avatar: g.avatar })}</div>${seat.standing || seat.table ? '' : this.chair}<div class="seat-tag${role}">${escapeHtml(shortName(g.name, 12))}</div>`;
        if (animateNew && !known.has(g.id)) elx.classList.add('just-seated');
      } else if (!seat.standing && !seat.table) {
        elx.innerHTML = this.chair;
      }
      frag.appendChild(elx);
      els.push(elx);
    });
    this.seatLayer.replaceChildren(frag);
    this.seatEls = els;
  }

  /** Actor-like anchor for speech bubbles above a seated guest. */
  seatAnchor(seatEl) {
    const x = Number(seatEl.dataset.x);
    const y = Number(seatEl.dataset.y);
    return { x, y, scaleAt: () => this.depth(y) * 0.34 };
  }

  /**
   * Map guests onto seats. In team modes the groom's side sits on the left of the aisle
   * and the bride's side on the right (like a real ceremony); otherwise most recent fill in order.
   */
  arrangeGuests(guests, seats) {
    const recent = guests.slice(-seats.length);
    if (!recent.some((g) => g.team) || !seats.some((s) => s.side)) return recent;
    const out = new Array(seats.length).fill(undefined);
    const free = { l: [], r: [], any: [] };
    seats.forEach((s, i) => (s.side ? free[s.side] : free.any).push(i));
    const rest = [];
    for (const g of recent) {
      const pool = g.team === 'groom' ? free.l : g.team === 'bride' ? free.r : null;
      if (pool && pool.length) out[pool.shift()] = g;
      else rest.push(g);
    }
    const remaining = [...free.l, ...free.r, ...free.any].sort((a, b) => a - b);
    for (const g of rest) if (remaining.length) out[remaining.shift()] = g;
    return out;
  }

  seatOf(guestId) {
    const sc = this.scenes[this.current];
    const seats = sc?.seats || [];
    const visible = this.arrangeGuests(this.guests, seats);
    const idx = visible.findIndex((g) => g?.id === guestId);
    return idx >= 0 ? seats[idx] : null;
  }

  // ---------------------------------------------------------------- audience
  /**
   * The standing crowd at the back of the venue grows with the live audience
   * (viewer count when connected, otherwise how many guests have arrived), on a log scale:
   * at least BASE_CROWD relatives, 10 viewers ≈ 17 people, 100 ≈ 33, 1000+ = full house.
   */
  setAudience({ viewers, guests } = {}) {
    if (viewers != null) this.viewers = viewers;
    if (guests != null) this.arrived = guests;
    const n = Math.max(this.viewers || 0, this.arrived || 0);
    const size = Math.min(MAX_CROWD, Math.max(BASE_CROWD, Math.round(5 * Math.log2(1 + n))));
    if (size === this.crowdSize) return;
    this.crowdSize = size;
    this.renderCrowd();
  }

  /** Deterministic standing spots in two back rows, leaving the altar / stage centre clear. */
  crowdSpots() {
    const spots = [];
    for (let i = 0; i < MAX_CROWD; i++) {
      const row = i % 2;
      const k = Math.floor(i / 2);
      const side = k % 2 ? 1 : -1;
      const step = Math.floor(k / 2);
      const x = 960 + side * (300 + step * 62 + row * 31 + ((i * 37) % 17));
      spots.push({ x, y: 648 + row * 16 + ((i * 13) % 7) });
    }
    return spots;
  }

  renderCrowd() {
    if (!this.crowdLayer) return;
    const spots = this.crowdSpots().slice(0, this.crowdSize);
    this.crowdLayer.innerHTML = spots
      .map((p, i) => {
        const s = this.depth(p.y) * 0.95;
        return `<div class="crowd-guest" style="transform:translate3d(${p.x}px,${p.y}px,0) translate(-50%,-100%) scale(${s.toFixed(3)});z-index:${Math.round(p.y) - 40};--d:${(i % 7) * 0.37}s">${crowdSvg(`crowd-${i}`)}</div>`;
      })
      .join('');
  }

  /** Speech bubble over a seated viewer's head with what they just commented. */
  guestSay(guestId, text) {
    const seat = guestId && this.seatEls.find((s) => s.dataset.guest === guestId);
    if (!seat || !text) return false;
    while (this.sayEls.length >= MAX_SAY) this.sayEls.shift().remove();
    const x = Number(seat.dataset.x);
    const y = Number(seat.dataset.y);
    const el = document.createElement('div');
    el.className = 'seat-say';
    el.textContent = text.length > 54 ? `${text.slice(0, 52)}…` : text;
    el.style.transform = `translate3d(${x}px, ${y - 150 * this.depth(y)}px, 0) translate(-50%, -100%)`;
    el.style.zIndex = '1900';
    (this.root.querySelector('#world-ui') || this.castLayer).appendChild(el);
    this.sayEls.push(el);
    seat.classList.remove('react-talk');
    void seat.offsetWidth;
    seat.classList.add('react-talk');
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => {
        el.remove();
        this.sayEls = this.sayEls.filter((e) => e !== el);
      }, 400);
    }, 4200);
    return true;
  }

  /** Make every seated guest do a little celebration bounce. */
  guestsReact(cls = 'cheer', ms = 1400) {
    this.crowdLayer?.classList.remove('crowd-cheer');
    void this.crowdLayer?.offsetWidth;
    this.crowdLayer?.classList.add('crowd-cheer');
    clearTimeout(this.crowdTimer);
    this.crowdTimer = setTimeout(() => this.crowdLayer?.classList.remove('crowd-cheer'), ms + 400);
    this.seatEls.forEach((s, i) => {
      if (!s.classList.contains('filled')) return;
      setTimeout(() => {
        s.classList.remove(`react-${cls}`);
        void s.offsetWidth;
        s.classList.add(`react-${cls}`);
        setTimeout(() => s.classList.remove(`react-${cls}`), ms);
      }, (i % 8) * 70);
    });
  }

  /** A temporary full-body viewer character (arrival, flower delivery…). */
  spawnWalker(user, { carry = '', from = 'entryRight', tag = true } = {}) {
    const start = typeof from === 'string' ? this.mark(from) : from;
    const actor = this.characters.create({ id: `walker-${Math.random().toString(36).slice(2, 7)}`, type: 'guest', name: tag ? shortName(user.name, 14) : '', user, carry, size: 0.86, x: start.x, y: start.y, tag });
    actor.el.classList.add('walker');
    this.walkers.add(actor);
    return actor;
  }

  removeWalker(actor) {
    actor.el.classList.add('fade-out');
    setTimeout(() => {
      this.characters.remove(actor.id);
      this.walkers.delete(actor);
    }, 600);
  }
}
