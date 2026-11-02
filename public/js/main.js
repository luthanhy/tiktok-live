/**
 * Stage bootstrap — the livestream overlay (vertical 1080×1920 by default, scales to any window).
 *   /            stage + demo controls
 *   /?obs=1      clean source for OBS / TikTok Live Studio (no controls, autoplay audio)
 *   /?layout=landscape       16:9 1920×1080 version instead of the default vertical 9:16
 *   /?debug=1    open the developer debug panel (when the server allows it)
 */
import { WeddingSocket } from './core/net.js';
import { params } from './core/util.js';
import { Stage } from './environments/stage.js';
import { WeddingFX } from './effects/particles.js';
import { Overlays } from './effects/overlays.js';
import { WeddingAudio } from './audio/audio-engine.js';
import { Hud } from './ui/hud.js';
import { DebugPanel } from './ui/debug.js';
import { Director } from './animations/director.js';
import { getVariant, applyVariantUi } from './themes/variants.js';

const OBS = params.get('obs') === '1';
const root = document.getElementById('stage');
document.body.classList.toggle('obs', OBS);

/**
 * Uniform 16:9 scaling + a HUD "boost" on small outputs (1280×720, 1366×768) so panels stay
 * readable instead of shrinking with everything else. Panels grow from their own safe-zone corner.
 */
function fit() {
  const w = document.documentElement.clientWidth || window.innerWidth;
  const h = document.documentElement.clientHeight || window.innerHeight;
  // Phone-first: the show is a vertical 1080×1920 (9:16) TikTok LIVE by default, letterboxed on a
  // landscape monitor. ?layout=landscape switches to the 16:9 version.
  const portrait = params.get('layout') !== 'landscape';
  root.dataset.layout = portrait ? 'portrait' : 'landscape';
  const [dw, dh] = portrait ? [1080, 1920] : [1920, 1080];
  const s = Math.min(w / dw, h / dh);
  root.style.transform = `translate(-50%, -50%) scale(${s})`;
  const boost = portrait ? 1 : Math.max(1, Math.min(1.28, 0.82 / s));
  root.style.setProperty('--ui-boost', boost.toFixed(3));
  root.dataset.res = s < 0.7 ? 'small' : s < 0.9 ? 'medium' : 'large';
}
// ResizeObserver also catches OBS source resizes and device rotation that don't always fire `resize`.
new ResizeObserver(fit).observe(document.documentElement);
window.addEventListener('resize', fit);
fit();

let state = null;
let variant = null;
let stage;
let fx;
let director;
const ov = new Overlays(root, { getEffects: () => state?.effects });
const audio = new WeddingAudio({ getConfig: () => state?.audio });
const hud = new Hud(root);
const net = new WeddingSocket({ role: 'stage', token: params.get('token') || '' });
const pending = [];

function boot(s) {
  variant = getVariant(s.theme);
  applyVariantUi(variant);
  stage = new Stage(root, { couple: s.couple, variant });
  stage.init();
  stage.setAudience({ guests: s.counters?.guests });
  fx = new WeddingFX(root.querySelector('#fx'), { getConfig: () => state?.effects });
  fx.setPalette(variant.fx);
  director = new Director({ stage, fx, ov, audio, hud, variant });
  director.onState(s, { initial: true });
  const debug = new DebugPanel({ net, director, stage, fx, getState: () => state });
  debug.mount();
  if (params.get('debug') === '1') setTimeout(() => debug.toggle(true), 300);
  for (const a of pending.splice(0)) director.onAction(a);
  window.__wedding = { stage, fx, ov, audio, hud, director, net, debug, variant, get state() { return state; } };
}

net.on('wedding.state', (s) => {
  const first = !state;
  const prev = state;
  state = s;
  if (first) return boot(s);
  // Scenes embed the couple monogram and the variant's architecture: rebuild on change.
  if (prev.theme !== s.theme || prev.couple?.brideName !== s.couple?.brideName || prev.couple?.groomName !== s.couple?.groomName) {
    location.reload();
    return;
  }
  audio.applyVolumes();
  stage.setAudience({ guests: s.counters?.guests });
  director.onState(s);
});
net.on('wedding.action', (a) => {
  if (director) director.onAction(a);
  else if (pending.length < 20) pending.push(a);
});
net.on('live.status', (st) => {
  hud.setLive(st);
  stage?.setAudience({ viewers: st?.connected ? st.viewerCount || 0 : 0 });
});
net.on('tts.play', ({ url }) => {
  if (url) new Audio(url).play().catch(() => {});
});
net.on('socket.close', () => root.classList.add('offline'));
/** Tell the dashboard which Vietnamese voice this screen reads with (voices load asynchronously). */
function reportVoice() {
  net.call('tts.stageVoice', { name: audio.voiceStatus() }).catch(() => {});
}
window.speechSynthesis?.addEventListener?.('voiceschanged', reportVoice);
audio.onSpoken = (s) => net.call('tts.spoken', s).catch(() => {});
net.on('socket.open', () => {
  setTimeout(reportVoice, 800);
  root.classList.remove('offline');
  // after a reconnect, resync the chapter program
  if (director && state) director.onState(state, { initial: true });
});
net.connect();

// ------------------------------------------------------------------ audio unlock + local mute
const unlockBtn = document.getElementById('unlock-audio');
function refreshAudioButton() {
  unlockBtn.classList.toggle('hidden', audio.unlocked);
}
audio.onStateChange = refreshAudioButton;
unlockBtn.addEventListener('click', () => {
  audio.unlock();
  setTimeout(refreshAudioButton, 200);
});
if (OBS) audio.unlock();
document.addEventListener('pointerdown', () => !audio.unlocked && audio.unlock(), { once: true });
document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey && e.target === document.body) {
    const muted = audio.toggleLocalMute();
    ov.banner({ kicker: 'Audio', title: muted ? '🔇 Đã tắt tiếng màn hình này' : '🔊 Đã bật tiếng', ms: 1400 });
  }
});

// ------------------------------------------------------------------ demo controls (hidden in OBS mode)
const controls = document.getElementById('controls');
if (!OBS) {
  controls.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-mock]');
    if (!btn) return;
    const [method, json] = [btn.dataset.mock, btn.dataset.params || '{}'];
    try {
      await net.call(method, JSON.parse(json));
    } catch (err) {
      console.warn(err);
      btn.classList.add('err');
      btn.title = err.message;
      setTimeout(() => btn.classList.remove('err'), 1500);
    }
  });
  document.getElementById('btn-fullscreen').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  });
  document.getElementById('btn-hide').addEventListener('click', () => controls.classList.toggle('collapsed'));
  document.getElementById('btn-debug').addEventListener('click', () => window.__wedding?.debug.toggle());
}
