/**
 * Developer debug panel — FPS, memory, event queue, pipeline rate, active animations,
 * game state, connections and character entities, plus test controls.
 *
 * Availability: the server must allow it (config.debug.enabled and NODE_ENV !== 'production').
 * Toggle with Ctrl+Shift+D or the ` key; open by default with ?debug=1. Never shown in
 * OBS mode unless ?debug=1 is passed explicitly. Lives outside the 1920×1080 frame.
 */
import { escapeHtml, fmt } from '../core/util.js';

const EFFECT_KEYS = ['petals', 'hearts', 'confetti', 'fireworks', 'sparkles', 'lightBeams', 'cameraShake', 'floatingWishes', 'giftExplosions', 'cinematicTransitions', 'commentSpawns', 'commentBubbles'];

export class DebugPanel {
  constructor({ net, director, stage, fx, getState }) {
    this.net = net;
    this.director = director;
    this.stage = stage;
    this.fx = fx;
    this.getState = getState;
    this.el = null;
    this.open = false;
    this.frames = 0;
    this.fps = 0;
    this.server = null;
    this.ws = 'connecting';
  }

  allowed() {
    return Boolean(this.getState()?.debugAllowed);
  }

  mount() {
    this.el = document.createElement('aside');
    this.el.id = 'debug-panel';
    this.el.innerHTML = `
      <header><b>🛠 Debug</b><span class="dbg-fps"></span><button data-dbg="close" title="Ẩn (Ctrl+Shift+D)">✕</button></header>
      <div class="dbg-body"></div>
      <div class="dbg-actions">
        <div class="row"><span>Event</span>
          <button data-ev='{"type":"like","count":50}'>❤️</button><button data-ev='{"type":"follow"}'>➕</button><button data-ev='{"type":"comment"}'>💬</button><button data-ev='{"type":"share"}'>🔁</button>
          <button data-ev='{"type":"gift","gift":"Rose","count":10}'>🌹</button><button data-ev='{"type":"gift","gift":"Heart Me"}'>❤</button><button data-ev='{"type":"gift","gift":"Hand Wave"}'>💎</button><button data-ev='{"type":"gift","gift":"Universe"}'>👑</button></div>
        <div class="row"><span>Rate</span><button data-rate="10">10/s</button><button data-rate="100">100/s</button><button data-rate="1000">1000/s</button><button data-rate="0">stop</button></div>
        <div class="row"><span>Game</span><button data-rpc="wedding.adjustScore" data-p='{"delta":1000}'>+1000</button><button data-rpc="wedding.prevChapter">⏮</button><button data-rpc="wedding.nextChapter">⏭</button><button data-rpc="wedding.restartChapter">↺ ch</button><button data-rpc="wedding.clearQueue">clear queue</button><button data-rpc="wedding.reset" data-confirm="1">reset</button></div>
        <div class="row fx-row"><span>FX</span></div>
      </div>`;
    document.body.appendChild(this.el);
    this.el.querySelector('.fx-row').insertAdjacentHTML('beforeend', EFFECT_KEYS.map((k) => `<label><input type="checkbox" data-fx="${k}">${k}</label>`).join(''));
    this.el.addEventListener('click', (e) => this.onClick(e));
    this.el.addEventListener('change', (e) => {
      const k = e.target.dataset.fx;
      if (k) this.call('wedding.updateConfig', { section: 'wedding', patch: { effects: { [k]: e.target.checked } } });
    });
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') || e.key === '`') this.toggle();
    });
    this.ws = this.net.connected ? 'open' : 'connecting';
    this.net.on('socket.open', () => (this.ws = 'open'));
    this.net.on('socket.close', () => (this.ws = 'closed'));
    const count = () => {
      this.frames += 1;
      requestAnimationFrame(count);
    };
    requestAnimationFrame(count);
    setInterval(() => {
      this.fps = this.frames;
      this.frames = 0;
      if (this.open) this.refresh();
    }, 1000);
  }

  toggle(force) {
    const next = force ?? !this.open;
    if (next && !this.allowed()) {
      console.info('[debug] panel disabled by server config (debug.enabled=false or NODE_ENV=production)');
      return;
    }
    this.open = next;
    this.el.classList.toggle('show', this.open);
    if (this.open) this.refresh();
  }

  async call(method, params) {
    try {
      return await this.net.call(method, params);
    } catch (err) {
      console.warn('[debug]', method, err.message);
      return null;
    }
  }

  onClick(e) {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.dbg === 'close') return this.toggle(false);
    if (b.dataset.ev) return this.call('mock.event', JSON.parse(b.dataset.ev));
    if (b.dataset.rate) return this.call('mock.rate', { eventsPerSec: Number(b.dataset.rate), durationSec: 10 });
    if (b.dataset.rpc) {
      if (b.dataset.confirm && !confirm('Reset toàn bộ đám cưới?')) return;
      return this.call(b.dataset.rpc, b.dataset.p ? JSON.parse(b.dataset.p) : {});
    }
  }

  async refresh() {
    this.server = (await this.call('wedding.getStatus', {})) || this.server;
    const s = this.getState();
    const d = this.director.debug();
    const mem = performance.memory ? `${Math.round(performance.memory.usedJSHeapSize / 1048576)} MB` : 'n/a';
    const st = this.server;
    const row = (k, v) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(String(v))}</td></tr>`;
    this.el.querySelector('.dbg-fps').textContent = `${this.fps} FPS`;
    this.el.querySelector('.dbg-fps').className = `dbg-fps ${this.fps < 40 ? 'bad' : this.fps < 55 ? 'warn' : 'ok'}`;
    const objective = s?.progress?.current?.objective?.meter || 'love';
    this.el.querySelector('.dbg-body').innerHTML = `<table>
      ${row('Memory (page)', mem)}
      ${st ? row('Server', `${st.memory.rssMb} MB rss · ${st.clients} screens · up ${Math.round(st.uptimeSec / 60)}m`) : ''}
      ${row('WebSocket', this.ws)}
      ${st ? row('TikTok', st.live.connected ? `LIVE @${st.live.username} · ${fmt(st.live.viewerCount)} viewers` : st.live.lastError || 'offline') : ''}
      ${st ? row('Event rate', `${st.pipeline.ratePerSec}/s · ${fmt(st.pipeline.received)} in · ${fmt(st.pipeline.batchedLikes)} likes batched`) : ''}
      ${st ? row('Anti-spam', `${fmt(st.antiSpam.rejected)} rejected`) : ''}
      ${st ? row('Queue', `${st.queue.size} waiting · ${fmt(st.queue.dispatched)} sent · ${fmt(st.queue.coalesced)} merged · ${st.queue.dropped} dropped`) : ''}
      ${st?.mock?.rate ? row('Mock rate', `${st.mock.rate.eventsPerSec}/s · ${fmt(st.mock.rate.sent)} sent · ${st.mock.rate.remainingSec}s left`) : ''}
      ${row('Animations', `${d.fx.particles} particles (${d.fx.pooled} pooled) · ${d.fx.rockets} rockets · ${d.walkers} walkers`)}
      ${row('Cinematic', d.cinematicRunning ? `running · queue: ${d.cinematicQueue.join(', ') || '—'}` : 'idle')}
      ${s ? row('Game', `${s.status} · ${s.mode?.label || 'classic'} · theme ${s.theme}`) : ''}
      ${s ? row('Chapter', `${s.progress.current.order}. ${s.progress.current.id} · objective ${objective}${s.progress.current.objectiveDone ? ' ✓' : ''}`) : ''}
      ${s ? row('Love / Happiness', `${fmt(s.love)} · ${Math.round(s.happiness)}%`) : ''}
      ${row('Characters', this.stage.characters.snapshot().map((c) => `${c.id}:${c.animation}/${c.emotion}`).join(' '))}
    </table>`;
    for (const k of EFFECT_KEYS) {
      const box = this.el.querySelector(`[data-fx="${k}"]`);
      if (box && document.activeElement !== box) box.checked = s?.effects?.[k] !== false;
    }
  }
}
