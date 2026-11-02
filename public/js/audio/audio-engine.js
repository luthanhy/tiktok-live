/**
 * WeddingAudio — fully synthesized score, SFX and MC voice.
 *  - Music: lookahead sequencer over TRACKS (music.js), with crossfades between chapters
 *  - Instruments: piano, strings, pad, brass, harp, bass, bell, soft drum (pure WebAudio)
 *  - SFX: wedding bells, chime, sparkle, applause, cheer, fireworks, champagne, kiss, shutter…
 *  - Voice: ZeroTTS (/api/tts) with Web Speech API fallback; music ducks under speech
 */
import { TRACKS } from './music.js';

const mtof = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class WeddingAudio {
  constructor({ getConfig } = {}) {
    this.getConfig = getConfig || (() => ({}));
    this.ctx = null;
    this.track = null;
    this.nextTrackId = null;
    this.ttsQueue = [];
    this.speaking = false;
    try {
      this.localMute = localStorage.getItem('wedding_local_mute') === '1';
    } catch (_) {
      this.localMute = false;
    }
    this.onStateChange = null;
  }

  get cfg() {
    return this.getConfig() || {};
  }

  get unlocked() {
    return Boolean(this.ctx && this.ctx.state === 'running');
  }

  /** Must be called from a user gesture in normal browsers (OBS allows autoplay). */
  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      this.ctx = new Ctx();
      this.buildGraph();
      this.schedulerTimer = setInterval(() => this.schedule(), 50);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().then(() => this.onStateChange?.());
    if (this.nextTrackId && !this.track) this.playMusic(this.nextTrackId);
    this.onStateChange?.();
    return true;
  }

  buildGraph() {
    const ctx = this.ctx;
    this.master = ctx.createDynamicsCompressor();
    this.master.threshold.value = -14;
    this.master.ratio.value = 3;
    this.master.connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.duck = ctx.createGain();
    this.musicBus.connect(this.duck).connect(this.master);
    this.sfxBus.connect(this.master);
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(2.6, 2.2);
    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.value = 0.32;
    this.reverb.connect(this.reverbGain).connect(this.master);
    this.noise = this.noiseBuffer(2);
    this.applyVolumes();
  }

  applyVolumes() {
    if (!this.ctx) return;
    const c = this.cfg;
    const t = this.ctx.currentTime;
    const master = this.isMuted() ? 0 : Number(c.masterVolume ?? 0.9);
    this.musicBus.gain.setTargetAtTime(c.musicEnabled === false ? 0 : (c.musicVolume ?? 0.55) * 0.9 * master, t, 0.3);
    this.sfxBus.gain.setTargetAtTime(c.sfxEnabled === false ? 0 : (c.sfxVolume ?? 0.8) * master, t, 0.1);
  }

  /** Muted either by the show config or locally on this screen (M key). */
  isMuted() {
    return Boolean(this.cfg.muted || this.localMute);
  }

  toggleLocalMute() {
    this.localMute = !this.localMute;
    try {
      localStorage.setItem('wedding_local_mute', this.localMute ? '1' : '0');
    } catch (_) {}
    this.applyVolumes();
    return this.localMute;
  }

  impulse(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  noiseBuffer(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  out(node, { bus = 'music', wet = 0.25 } = {}) {
    node.connect(bus === 'music' ? this.musicBus : this.sfxBus);
    if (wet > 0) {
      const send = this.ctx.createGain();
      send.gain.value = wet;
      node.connect(send).connect(this.reverb);
    }
  }

  // ---------------------------------------------------------------- instruments
  voice(inst, t, midi, dur, vel, bus = 'music') {
    const ctx = this.ctx;
    const f = mtof(midi);
    const g = ctx.createGain();
    g.gain.value = 0;
    switch (inst) {
      case 'piano': {
        const o1 = ctx.createOscillator();
        const o2 = ctx.createOscillator();
        o1.type = 'triangle';
        o2.type = 'sine';
        o1.frequency.value = f;
        o2.frequency.value = f * 2.001;
        const g2 = ctx.createGain();
        g2.gain.value = 0.25;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(Math.min(9000, f * 8), t);
        lp.frequency.exponentialRampToValueAtTime(Math.max(400, f * 2), t + 1.2);
        o1.connect(lp);
        o2.connect(g2).connect(lp);
        lp.connect(g);
        const peak = 0.32 * vel;
        const rel = Math.min(3.2, Math.max(0.6, dur * 1.6));
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(peak, t + 0.006);
        g.gain.exponentialRampToValueAtTime(peak * 0.35, t + 0.25);
        g.gain.exponentialRampToValueAtTime(0.0001, t + rel);
        [o1, o2].forEach((o) => {
          o.start(t);
          o.stop(t + rel + 0.05);
        });
        this.out(g, { bus, wet: 0.3 });
        break;
      }
      case 'harp': {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        o.connect(g);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.22 * vel, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
        o.start(t);
        o.stop(t + 1.5);
        this.out(g, { bus, wet: 0.35 });
        break;
      }
      case 'strings':
      case 'pad':
      case 'lead': {
        const n = inst === 'lead' ? 1 : 2;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = inst === 'pad' ? 900 : inst === 'lead' ? 2600 : 1800;
        lp.Q.value = 0.6;
        const vib = ctx.createOscillator();
        const vibGain = ctx.createGain();
        vib.frequency.value = 5.2;
        vibGain.gain.value = inst === 'pad' ? 0 : f * 0.006;
        vib.connect(vibGain);
        const oscs = [];
        for (let k = 0; k < n; k++) {
          const o = ctx.createOscillator();
          o.type = inst === 'lead' ? 'triangle' : 'sawtooth';
          o.frequency.value = f;
          o.detune.value = n > 1 ? (k ? 7 : -7) : 0;
          vibGain.connect(o.frequency);
          o.connect(lp);
          oscs.push(o);
        }
        lp.connect(g);
        const peak = (inst === 'pad' ? 0.07 : inst === 'lead' ? 0.2 : 0.11) * vel;
        const atk = inst === 'pad' ? 0.5 : inst === 'lead' ? 0.04 : 0.12;
        const end = t + Math.max(0.2, dur);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(peak, t + atk);
        g.gain.setValueAtTime(peak, Math.max(t + atk, end - 0.05));
        g.gain.linearRampToValueAtTime(0, end + (inst === 'pad' ? 0.8 : 0.35));
        vib.start(t);
        vib.stop(end + 1);
        oscs.forEach((o) => {
          o.start(t);
          o.stop(end + 1);
        });
        this.out(g, { bus, wet: 0.4 });
        break;
      }
      case 'brass': {
        const o = ctx.createOscillator();
        const o2 = ctx.createOscillator();
        o.type = 'sawtooth';
        o2.type = 'square';
        o.frequency.value = f;
        o2.frequency.value = f;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(400, t);
        lp.frequency.linearRampToValueAtTime(2600, t + 0.06);
        lp.frequency.linearRampToValueAtTime(1500, t + 0.3);
        const g2 = ctx.createGain();
        g2.gain.value = 0.3;
        o.connect(lp);
        o2.connect(g2).connect(lp);
        lp.connect(g);
        const peak = 0.13 * vel;
        const end = t + Math.max(0.15, dur);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(peak, t + 0.03);
        g.gain.setValueAtTime(peak * 0.85, end - 0.04);
        g.gain.linearRampToValueAtTime(0, end + 0.12);
        [o, o2].forEach((x) => {
          x.start(t);
          x.stop(end + 0.2);
        });
        this.out(g, { bus, wet: 0.3 });
        break;
      }
      case 'bass': {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        const o2 = ctx.createOscillator();
        o2.type = 'triangle';
        o2.frequency.value = f * 2;
        const g2 = ctx.createGain();
        g2.gain.value = 0.18;
        o.connect(g);
        o2.connect(g2).connect(g);
        const end = t + Math.max(0.2, dur);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.3 * vel, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.06 * vel + 0.0001, end);
        g.gain.linearRampToValueAtTime(0, end + 0.1);
        [o, o2].forEach((x) => {
          x.start(t);
          x.stop(end + 0.15);
        });
        this.out(g, { bus, wet: 0.08 });
        break;
      }
      case 'bell':
        this.bellStrike(t, f, vel, bus);
        return;
      case 'drum': {
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(140, t);
        o.frequency.exponentialRampToValueAtTime(45, t + 0.18);
        o.connect(g);
        g.gain.setValueAtTime(0.5 * vel, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        o.start(t);
        o.stop(t + 0.32);
        this.out(g, { bus, wet: 0.1 });
        break;
      }
      default:
        return;
    }
  }

  bellStrike(t, f, vel = 0.6, bus = 'sfx') {
    const ctx = this.ctx;
    const partials = [
      [0.5, 0.6, 4.5],
      [1, 1, 3.5],
      [2.01, 0.55, 2.6],
      [2.76, 0.4, 2],
      [5.4, 0.22, 1.2],
      [8.93, 0.12, 0.7]
    ];
    const g = ctx.createGain();
    g.gain.value = 0.16 * vel;
    for (const [ratio, amp, decay] of partials) {
      const o = ctx.createOscillator();
      const pg = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f * ratio;
      pg.gain.setValueAtTime(0, t);
      pg.gain.linearRampToValueAtTime(amp, t + 0.004);
      pg.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      o.connect(pg).connect(g);
      o.start(t);
      o.stop(t + decay + 0.05);
    }
    this.out(g, { bus, wet: 0.5 });
  }

  noiseBurst(t, { dur = 0.2, type = 'bandpass', freq = 1500, q = 1, gain = 0.3, attack = 0.002, sweepTo = null, bus = 'sfx', wet = 0.15 } = {}) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g);
    this.out(g, { bus, wet });
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  }

  tone(t, { f0, f1 = f0, dur = 0.2, type = 'sine', gain = 0.2, bus = 'sfx', wet = 0.2 } = {}) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    this.out(g, { bus, wet });
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // ---------------------------------------------------------------- music
  playMusic(id) {
    this.nextTrackId = id;
    if (!this.ctx) return;
    const track = TRACKS[id];
    if (!track) return;
    if (this.track?.id === id) return;
    const now = this.ctx.currentTime;
    if (this.track) {
      // fade out the old track's bus by starting the new one on a fresh gain
      const old = this.trackGain;
      old.gain.setTargetAtTime(0, now, 0.6);
      setTimeout(() => old.disconnect(), 4000);
    }
    this.trackGain = this.ctx.createGain();
    this.trackGain.gain.setValueAtTime(0, now);
    this.trackGain.gain.linearRampToValueAtTime(1, now + 1.6);
    this.trackGain.connect(this.musicBus);
    this.track = { ...track, startAt: now + 0.15, cursor: 0, loop: 0 };
  }

  stopMusic() {
    if (!this.ctx || !this.trackGain) return;
    this.trackGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
    this.track = null;
    this.nextTrackId = null;
  }

  schedule() {
    if (!this.track || !this.ctx || this.ctx.state !== 'running') return;
    const tr = this.track;
    const spb = 60 / tr.bpm;
    const horizon = this.ctx.currentTime + 0.25;
    const loopDur = tr.length * spb;
    for (let guard = 0; guard < 64; guard++) {
      const ev = tr.events[tr.cursor];
      const loopStart = tr.startAt + tr.loop * loopDur;
      if (!ev) {
        tr.loop += 1;
        tr.cursor = 0;
        continue;
      }
      const when = loopStart + ev.t * spb;
      if (when > horizon) break;
      if (when >= this.ctx.currentTime - 0.05) {
        const notes = Array.isArray(ev.n) ? ev.n : [ev.n];
        for (const n of notes) this.voiceToTrack(ev.i, when, n, ev.d * spb, ev.v ?? 0.6);
      }
      tr.cursor += 1;
    }
  }

  voiceToTrack(inst, t, midi, dur, vel) {
    // Route through the per-track gain so crossfades work.
    const prevBus = this.musicBus;
    this.musicBus = this.trackGain;
    try {
      this.voice(inst, t, midi, dur, vel, 'music');
    } finally {
      this.musicBus = prevBus;
    }
  }

  // ---------------------------------------------------------------- sfx
  sfx(name, opts = {}) {
    if (!this.ctx || this.ctx.state !== 'running' || this.cfg.sfxEnabled === false) return;
    const t = this.ctx.currentTime + 0.02;
    const fn = this[`sfx_${name}`];
    if (fn) fn.call(this, t, opts);
  }

  sfx_bells(t) {
    const peal = [84, 83, 81, 79, 77, 76, 74, 72];
    for (let round = 0; round < 2; round++) peal.forEach((n, i) => this.bellStrike(t + round * 2.4 + i * 0.28, mtof(n - 12), 0.7 - round * 0.15));
  }

  sfx_chime(t) {
    [88, 91, 96].forEach((n, i) => this.bellStrike(t + i * 0.16, mtof(n - 12), 0.45));
  }

  sfx_sparkle(t) {
    for (let i = 0; i < 9; i++) this.tone(t + i * 0.055 + Math.random() * 0.03, { f0: 2200 + Math.random() * 2600, dur: 0.25, gain: 0.05, wet: 0.5 });
  }

  sfx_heart(t) {
    this.tone(t, { f0: 660, f1: 1320, dur: 0.14, gain: 0.08, type: 'triangle' });
  }

  sfx_gift(t) {
    [72, 76, 79, 84].forEach((n, i) => this.tone(t + i * 0.07, { f0: mtof(n), dur: 0.5, gain: 0.07, type: 'triangle', wet: 0.4 }));
  }

  sfx_whoosh(t) {
    this.noiseBurst(t, { dur: 0.7, freq: 300, sweepTo: 3200, q: 0.8, gain: 0.12, attack: 0.25, wet: 0.3 });
  }

  sfx_transition(t) {
    this.noiseBurst(t, { dur: 1.1, freq: 200, sweepTo: 2600, q: 0.7, gain: 0.08, attack: 0.5, wet: 0.5 });
    [76, 81, 88].forEach((n, i) => this.tone(t + 0.3 + i * 0.12, { f0: mtof(n), dur: 1.2, gain: 0.035, wet: 0.7 }));
  }

  sfx_pop(t) {
    this.noiseBurst(t, { dur: 0.05, type: 'highpass', freq: 1500, gain: 0.3 });
    this.tone(t, { f0: 900, f1: 300, dur: 0.1, gain: 0.12 });
  }

  sfx_impact(t) {
    this.tone(t, { f0: 120, f1: 40, dur: 0.7, gain: 0.35, wet: 0.3 });
    this.noiseBurst(t, { dur: 0.6, type: 'lowpass', freq: 500, gain: 0.25, wet: 0.4 });
    [84, 88, 91, 96].forEach((n, i) => this.tone(t + 0.05 + i * 0.05, { f0: mtof(n), dur: 1.4, gain: 0.05, type: 'triangle', wet: 0.6 }));
  }

  sfx_fail(t) {
    [67, 63, 60].forEach((n, i) => this.voice('strings', t + i * 0.35, n, 0.5, 0.6, 'sfx'));
  }

  sfx_shutter(t) {
    this.noiseBurst(t, { dur: 0.04, type: 'highpass', freq: 3000, gain: 0.25 });
    this.noiseBurst(t + 0.09, { dur: 0.05, type: 'highpass', freq: 2200, gain: 0.2 });
  }

  sfx_kiss(t) {
    this.tone(t, { f0: 420, f1: 980, dur: 0.12, gain: 0.12 });
    this.noiseBurst(t + 0.1, { dur: 0.05, freq: 1800, gain: 0.08 });
  }

  sfx_applause(t, { dur = 3.2, density = 70 } = {}) {
    const n = Math.round(dur * density);
    for (let i = 0; i < n; i++) {
      const at = t + Math.random() * dur;
      const env = Math.sin((Math.min(at - t, dur) / dur) * Math.PI);
      this.noiseBurst(at, { dur: 0.03 + Math.random() * 0.03, freq: 900 + Math.random() * 1800, q: 1.5, gain: (0.04 + Math.random() * 0.05) * (0.3 + env), wet: 0.35 });
    }
  }

  sfx_cheer(t) {
    [500, 1100, 2400].forEach((f, k) => this.noiseBurst(t + k * 0.05, { dur: 2.2, freq: f, q: 4, gain: 0.05, attack: 0.5, wet: 0.4 }));
    for (let i = 0; i < 4; i++) this.tone(t + 0.2 + i * 0.35 + Math.random() * 0.2, { f0: 900 + Math.random() * 300, f1: 1500 + Math.random() * 500, dur: 0.45, gain: 0.025, wet: 0.5 });
    this.sfx_applause(t + 0.1, { dur: 2.6, density: 60 });
  }

  sfx_fireworks(t, { count = 3 } = {}) {
    for (let k = 0; k < count; k++) {
      const at = t + k * 0.6 + Math.random() * 0.2;
      this.tone(at, { f0: 500 + Math.random() * 200, f1: 1800, dur: 0.7, gain: 0.03, wet: 0.2 });
      const boom = at + 0.75;
      this.noiseBurst(boom, { dur: 1.2, type: 'lowpass', freq: 600, gain: 0.35, wet: 0.5 });
      this.tone(boom, { f0: 90, f1: 38, dur: 0.6, gain: 0.25, wet: 0.2 });
      for (let c = 0; c < 18; c++) this.noiseBurst(boom + 0.3 + Math.random() * 1.1, { dur: 0.025, type: 'highpass', freq: 4000, gain: 0.05, wet: 0.4 });
    }
  }

  sfx_champagne(t) {
    this.noiseBurst(t, { dur: 0.06, type: 'highpass', freq: 1200, gain: 0.4 });
    this.tone(t, { f0: 700, f1: 180, dur: 0.12, gain: 0.2 });
    this.noiseBurst(t + 0.08, { dur: 1.8, type: 'highpass', freq: 5000, gain: 0.06, attack: 0.05, wet: 0.2 });
    this.tone(t + 0.6, { f0: 2100, dur: 1.2, gain: 0.04, type: 'sine', wet: 0.6 });
  }

  sfx_glassClink(t) {
    this.tone(t, { f0: 2350, dur: 1.4, gain: 0.06, wet: 0.6 });
    this.tone(t + 0.003, { f0: 3520, dur: 0.9, gain: 0.04, wet: 0.6 });
  }

  sfx_fanfare(t) {
    [[72, 0], [72, 0.13], [72, 0.26], [76, 0.4], [79, 0.7]].forEach(([n, d]) => this.voice('brass', t + d, n, d === 0.7 ? 0.9 : 0.12, 0.8, 'sfx'));
  }

  // ---------------------------------------------------------------- voice
  speak(text, { priority = false } = {}) {
    const c = this.cfg;
    const s = String(text || '').trim();
    if (!s || c.ttsEnabled === false || this.isMuted()) return;
    if (priority) this.ttsQueue.unshift(s);
    else this.ttsQueue.push(s);
    while (this.ttsQueue.length > 4) this.ttsQueue.splice(priority ? this.ttsQueue.length - 1 : 1, 1);
    this.drainSpeech();
  }

  setDuck(on) {
    if (!this.ctx) return;
    this.duck.gain.setTargetAtTime(on ? 0.35 : 1, this.ctx.currentTime, 0.25);
  }

  async drainSpeech() {
    if (this.speaking || !this.ttsQueue.length) return;
    this.speaking = true;
    const text = this.ttsQueue.shift();
    this.setDuck(true);
    try {
      const played = await this.playZeroTts(text);
      if (!played) await this.playBrowserTts(text);
    } catch (err) {
      console.warn('[audio] speech failed', err);
    }
    this.setDuck(false);
    this.speaking = false;
    setTimeout(() => this.drainSpeech(), 250);
  }

  async playZeroTts(text) {
    if (this.zeroTtsUnavailable) return false;
    try {
      const res = await fetch('/api/tts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, voice: this.cfg.ttsVoice }) });
      const json = await res.json();
      if (!json.ok || !json.url) {
        if (/status: (unavailable|stopped|disabled)|disabled/i.test(json.error || '')) this.zeroTtsUnavailable = true;
        return false;
      }
      await new Promise((resolve) => {
        const a = new Audio(json.url);
        a.volume = (this.cfg.ttsVolume ?? 0.95) * Number(this.cfg.masterVolume ?? 0.9);
        a.onended = resolve;
        a.onerror = resolve;
        a.play().catch(resolve);
        setTimeout(resolve, 25000);
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  playBrowserTts(text) {
    return new Promise((resolve) => {
      const synth = window.speechSynthesis;
      if (!synth) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      const voices = synth.getVoices();
      const vi = voices.find((v) => /^vi/i.test(v.lang));
      if (vi) u.voice = vi;
      u.lang = vi?.lang || 'vi-VN';
      u.rate = 1.02;
      u.pitch = 1.05;
      u.volume = (this.cfg.ttsVolume ?? 0.95) * Number(this.cfg.masterVolume ?? 0.9);
      u.onend = resolve;
      u.onerror = resolve;
      synth.speak(u);
      setTimeout(resolve, Math.min(20000, 1500 + text.length * 90));
    });
  }
}
