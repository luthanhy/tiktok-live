/**
 * Composition root: wires config → anti-spam → engine → presentation queue → sockets.
 *
 *   TikTok / mock / RPC event
 *        │ normalized {type,user,...}
 *        ▼
 *   AntiSpam.check ──reject──▶ event log (admin)
 *        │ ok
 *        ▼
 *   WeddingEngine.handle  ──▶ state (scores, meters, chapters)  ──▶ 'wedding.state' (throttled)
 *        │ actions
 *        ▼
 *   PresentationQueue (priority / coalesce / pace) ──▶ 'wedding.action' ──▶ stage director
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');

const logger = require('./core/logger');
const { RpcRegistry } = require('./core/rpc');
const { ConfigStore } = require('./config');
const { AntiSpam } = require('./events/anti-spam');
const { PresentationQueue } = require('./events/event-queue');
const { EventPipeline } = require('./events/pipeline');
const { WeddingEngine } = require('./gameplay/wedding-engine');
const { TikTokLiveManager } = require('./tiktok/connector');
const { MockSimulator, MOCK_GIFTS } = require('./mock/simulator');

const ROOT = path.join(__dirname, '..');
const THEMES = ['luxury', 'garden', 'modern', 'fairytale', 'vietnamese'];
const log = logger.child('app');

function createApp(options = {}) {
  const dataDir = options.dataDir || path.join(ROOT, 'data');
  const ttsCacheDir = path.join(dataDir, 'tts-cache');
  const stateFile = path.join(dataDir, 'wedding-state.json');
  fs.mkdirSync(ttsCacheDir, { recursive: true });

  const config = new ConfigStore({ overrideDir: path.join(dataDir, 'config') });

  // ------------------------------------------------------------ sockets
  let wss = null;
  const broadcast = (method, params, filter) => {
    if (!wss) return;
    const payload = JSON.stringify({ jsonrpc: '2.0', method, params });
    for (const client of wss.clients) {
      if (client.readyState === 1 && (!filter || filter(client))) client.send(payload);
    }
  };

  // ------------------------------------------------------------ gameplay
  const queue = new PresentationQueue({
    getConfig: () => config.wedding.queue,
    logger: logger.child('queue'),
    onDispatch: (action) => broadcast('wedding.action', action)
  });

  let savedState = null;
  if (options.persist !== false && fs.existsSync(stateFile)) {
    try {
      savedState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      if (savedState?.version === 2) log.info(`Restored wedding state (love ${savedState.state.love}, chapter #${savedState.state.chapterIndex + 1})`);
      else log.warn('Saved state is from an older version — starting a fresh wedding');
    } catch (err) {
      log.warn(`Could not read ${stateFile}: ${err.message}`);
    }
  }
  const engine = new WeddingEngine({ config, queue, logger: logger.child('wedding'), initialState: savedState });
  const antiSpam = new AntiSpam(() => config.wedding.antiSpam);

  let saveTimer = null;
  let stateTimer = null;
  engine.onChange(() => {
    if (!stateTimer) {
      stateTimer = setTimeout(() => {
        stateTimer = null;
        broadcast('wedding.state', publicState());
      }, 200);
    }
    if (options.persist === false) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      fs.promises.writeFile(stateFile, JSON.stringify(engine.serialize()), 'utf8').catch((e) => log.error(`State save failed: ${e.message}`));
    }, 1500);
  });

  const adminLog = (entry) => broadcast('wedding.log', entry, (c) => c.isAdmin);
  const pipeline = new EventPipeline({
    engine,
    antiSpam,
    getConfig: () => config.wedding.antiSpam,
    logger: logger.child('pipeline'),
    onRejected: (evt, reason) => {
      if (evt.type !== 'join') adminLog({ ts: new Date().toISOString(), type: 'rejected', reason, user: evt.user?.name, event: evt.type, source: evt.source });
    },
    onProcessed: (evt, result) => {
      if (evt.type === 'join' || !result?.ok) return;
      if (evt.type === 'like') return;
      const entry = engine.eventLog[0];
      if (entry) adminLog({ ...entry, source: evt.source });
    }
  });

  /** Single entry point for every viewer event regardless of source (TikTok, mock, RPC). */
  const ingest = (evt) => pipeline.publish(evt);

  // ------------------------------------------------------------ TikTok
  const tiktok = new TikTokLiveManager();
  tiktok.on('event', ingest);
  tiktok.on('status', (status) => broadcast('live.status', status));

  // ------------------------------------------------------------ TTS
  let tts = options.tts;
  if (tts === undefined) {
    const { ZeroTTSManager } = require('./tts/zerotts');
    tts = new ZeroTTSManager({ getVoice: () => config.wedding.audio?.ttsVoice || 'maichi' });
  }
  if (tts) tts.on('status', (s) => broadcast('tts.status', s));

  // ------------------------------------------------------------ mock
  const simulator = new MockSimulator({ publish: ingest, logger: logger.child('mock') });
  if (config.wedding.mock?.autoSim) simulator.setAuto(true, config.wedding.mock.intervalMs);

  config.onChange((section) => {
    broadcast('config.updated', { section, value: config[section] });
    broadcast('wedding.state', publicState());
  });

  // ------------------------------------------------------------ RPC
  const rpc = new RpcRegistry({ adminToken: options.adminToken ?? process.env.ADMIN_TOKEN, logger: logger.child('rpc') });
  const statusPayload = () => ({
    live: { ...tiktok.status },
    tts: tts ? tts.getStatus() : { ready: false, status: 'disabled' },
    queue: queue.snapshot(),
    antiSpam: antiSpam.stats,
    pipeline: pipeline.snapshot(),
    mock: simulator.status(),
    memory: { rssMb: Math.round(process.memoryUsage().rss / 1048576), heapMb: Math.round(process.memoryUsage().heapUsed / 1048576) },
    debugAllowed: debugAllowed(),
    clients: wss ? wss.clients.size : 0,
    uptimeSec: Math.round(process.uptime())
  });

  const debugAllowed = () => config.wedding.debug?.enabled !== false && process.env.NODE_ENV !== 'production';
  const publicState = () => ({ ...engine.publicState(), debugAllowed: debugAllowed() });
  const resetAll = () => {
    queue.clear();
    queue.resume();
    antiSpam.reset();
    pipeline.reset();
  };

  rpc
    .register('wedding.getState', () => publicState())
    .register('wedding.getStatus', () => statusPayload())
    .register('wedding.getConfig', () => ({ wedding: config.wedding, gifts: config.gifts }))
    .register('wedding.getLogs', ({ limit }) => ({ events: engine.eventLog.slice(0, Math.min(250, Number(limit) || 100)), server: logger.recent(Math.min(300, Number(limit) || 100)) }), { admin: true })
    .register('wedding.start', () => {
      queue.resume();
      return engine.start();
    }, { admin: true })
    .register('wedding.pause', () => {
      queue.pause();
      return engine.pause();
    }, { admin: true })
    .register('wedding.reset', () => {
      resetAll();
      return engine.reset();
    }, { admin: true })
    .register('wedding.restartChapter', () => engine.restartChapter(), { admin: true })
    .register('wedding.listModes', () => engine.publicState().modes)
    .register('wedding.setMode', ({ id }) => {
      if (!engine.publicState().modes.some((m) => m.id === id)) throw new Error(`Unknown mode: ${id}`);
      config.update('wedding', { mode: { active: id } });
      resetAll();
      return engine.setMode(id);
    }, { admin: true })
    .register('wedding.setTheme', ({ variant }) => {
      if (!THEMES.includes(variant)) throw new Error(`Unknown theme: ${variant}`);
      config.update('wedding', { theme: { variant } });
      return { variant };
    }, { admin: true })
    .register('wedding.setChapter', ({ id, index }) => engine.setChapter(index !== undefined ? Number(index) : id), { admin: true })
    .register('wedding.nextChapter', () => engine.nextChapter(), { admin: true })
    .register('wedding.prevChapter', () => engine.prevChapter(), { admin: true })
    .register('wedding.adjustScore', (p) => engine.adjustScore(p), { admin: true })
    .register('wedding.triggerEffect', ({ effect, ...rest }) => {
      if (!effect) throw new Error('effect is required');
      return engine.triggerEffect(String(effect), rest);
    }, { admin: true })
    .register('wedding.updateConfig', ({ section, patch }) => config.update(section, patch), { admin: true })
    .register('wedding.restoreDefaults', ({ section }) => config.restoreDefaults(section), { admin: true })
    .register('wedding.clearQueue', () => ({ cleared: queue.clear() }), { admin: true })
    // External tools (TikFinity, Streamer.bot, webhooks) can inject events through the full pipeline.
    .register('wedding.event', (evt) => ingest({ ...evt, source: evt.source || 'rpc' }), { admin: true })
    .register('mock.event', (opts) => {
      const evt = simulator.emit(opts);
      return { event: evt };
    }, { admin: true })
    .register('mock.burst', ({ count, ...opts }) => simulator.burst(count, opts), { admin: true })
    .register('mock.auto', ({ enabled, intervalMs }) => simulator.setAuto(Boolean(enabled), intervalMs), { admin: true })
    .register('mock.rate', ({ eventsPerSec, durationSec }) => simulator.setRate(Number(eventsPerSec) || 0, Number(durationSec) || 10), { admin: true })
    .register('mock.catalog', () => ({ gifts: MOCK_GIFTS }))
    .register('live.connect', async ({ username }) => {
      const status = await tiktok.connect(username || config.wedding.tiktok?.username);
      if (username) config.update('wedding', { tiktok: { username: status.username } });
      return status;
    }, { admin: true })
    .register('live.disconnect', () => tiktok.disconnect(), { admin: true })
    .register('live.status', () => ({ ...tiktok.status }))
    .register('tts.status', () => (tts ? tts.getStatus() : { ready: false, status: 'disabled' }))
    .register('tts.speak', async ({ text, voice }) => {
      if (!tts) return { ok: false, error: 'TTS disabled' };
      const res = await tts.synthesize(text, voice);
      if (res.ok) broadcast('tts.play', { text, voice: res.voice, url: res.url });
      return res;
    }, { admin: true })
    .register('rpc.list', () => rpc.list());

  // ------------------------------------------------------------ HTTP
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use('/tts-cache', express.static(ttsCacheDir, { maxAge: '7d' }));
  app.use(express.static(path.join(ROOT, 'public'), { extensions: ['html'] }));
  app.get('/admin', (_req, res) => res.sendFile(path.join(ROOT, 'public', 'admin.html')));
  app.get('/healthz', (_req, res) => res.json({ ok: true, ...statusPayload() }));
  app.get('/api/state', (_req, res) => res.json(publicState()));

  app.post('/rpc', async (req, res) => {
    const token = req.get('x-admin-token') || req.query.token || '';
    const body = req.body;
    if (Array.isArray(body)) {
      const out = (await Promise.all(body.map((r) => rpc.handle({ id: null, ...r }, { token })))).filter(Boolean);
      return res.json(out);
    }
    // Plain HTTP callers (webhooks) often omit `id`; still answer them.
    const response = await rpc.handle({ id: null, ...(body || {}) }, { token });
    res.status(response?.error?.code === -32600 ? 400 : 200).json(response);
  });

  app.all('/api/tts', async (req, res) => {
    const text = String(req.body?.text || req.query?.text || '').trim();
    if (!text) return res.status(400).json({ ok: false, error: 'Missing text' });
    if (!tts) return res.json({ ok: false, error: 'TTS disabled' });
    res.json(await tts.synthesize(text, req.body?.voice || req.query?.voice));
  });

  const server = http.createServer(app);
  wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    ws.isAdmin = url.searchParams.get('role') === 'admin';
    ws.token = url.searchParams.get('token') || '';
    ws.send(JSON.stringify({ jsonrpc: '2.0', method: 'wedding.state', params: publicState() }));
    ws.send(JSON.stringify({ jsonrpc: '2.0', method: 'live.status', params: { ...tiktok.status } }));
    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString('utf8'));
      } catch (_) {
        return;
      }
      const response = await rpc.handle(msg, { token: msg?.params?.token || ws.token });
      if (response && ws.readyState === 1) ws.send(JSON.stringify(response));
    });
    ws.on('error', (err) => log.warn(`ws client error: ${err.message}`));
  });

  logger.subscribe((entry) => {
    if (entry.level === 'warn' || entry.level === 'error' || entry.scope === 'wedding' || entry.scope === 'tiktok') {
      broadcast('server.log', entry, (c) => c.isAdmin);
    }
  });

  // ------------------------------------------------------------ lifecycle
  const ticker = setInterval(() => engine.tick(), 1000);
  const statusTicker = setInterval(() => broadcast('wedding.status', statusPayload(), (c) => c.isAdmin), 2000);
  queue.start();
  if (engine.state.status === 'paused') queue.pause();

  function listen(port = options.port ?? 3000) {
    return new Promise((resolve) => {
      server.listen(port, () => resolve(server.address().port));
    });
  }

  async function close() {
    clearInterval(ticker);
    clearInterval(statusTicker);
    clearTimeout(stateTimer);
    clearTimeout(saveTimer);
    queue.stop();
    simulator.setAuto(false);
    simulator.setRate(0);
    pipeline.reset();
    await tiktok.disconnect().catch(() => {});
    if (tts?.stop) tts.stop();
    for (const c of wss.clients) c.terminate();
    await new Promise((r) => wss.close(() => r()));
    await new Promise((r) => server.close(() => r()));
  }

  return { app, server, listen, close, engine, queue, antiSpam, pipeline, config, tiktok, simulator, rpc, ingest };
}

module.exports = { createApp };
