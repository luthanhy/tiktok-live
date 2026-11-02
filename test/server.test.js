/**
 * Integration test: boots the real HTTP + WebSocket server on a random port and
 * drives it purely through JSON-RPC, like the dashboard and OBS overlay do.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

process.env.LOG_SILENT = '1';
const { createApp } = require('../src/app');

let wedding;
let base;

test.before(async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wedding-it-'));
  wedding = createApp({ dataDir, persist: false, tts: null, adminToken: 'secret' });
  const port = await wedding.listen(0);
  base = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  await wedding.close();
});

async function rpc(method, params = {}, token = 'secret') {
  const res = await fetch(`${base}/rpc`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  });
  return res.json();
}

test('serves the stage, the dashboard and health', async () => {
  for (const p of ['/', '/admin', '/healthz', '/js/main.js', '/js/dashboard/admin.js', '/css/stage.css']) {
    const res = await fetch(base + p);
    assert.equal(res.status, 200, p);
  }
});

test('admin methods require the token when configured', async () => {
  const denied = await rpc('wedding.reset', {}, 'wrong');
  assert.equal(denied.error.code, -32001);
  const ok = await rpc('wedding.getState', {}, '');
  assert.ok(ok.result.progress);
  const unknown = await rpc('nope.method');
  assert.equal(unknown.error.code, -32601);
});

test('mock events flow through anti-spam → engine → queue → websocket actions', async () => {
  await rpc('wedding.reset');
  const ws = new WebSocket(`${base.replace('http', 'ws')}/ws`);
  const actions = [];
  const states = [];
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw);
    if (msg.method === 'wedding.action') actions.push(msg.params);
    if (msg.method === 'wedding.state') states.push(msg.params);
  });
  await new Promise((r) => ws.once('open', r));

  await rpc('mock.event', { type: 'gift', gift: 'Rose', count: 3, user: 'thao.vy' });
  await rpc('mock.event', { type: 'follow', user: 'quanghuy' });
  await rpc('mock.event', { type: 'comment', text: 'Chúc mừng hạnh phúc', user: 'giahan' });
  await rpc('wedding.event', { type: 'gift', user: { id: 'whale', name: 'Đại Gia' }, gift: { name: 'Universe', diamonds: 34999, count: 1 } });

  await new Promise((r) => setTimeout(r, 1600));
  ws.close();
  const kinds = actions.map((a) => a.kind);
  assert.ok(kinds.includes('gift'));
  assert.ok(kinds.includes('guest_arrival'));
  assert.ok(kinds.includes('wish'));
  const premium = actions.find((a) => a.kind === 'gift' && a.gift.tier === 'premium');
  assert.ok(premium, 'premium gift dispatched');
  assert.equal(premium.interaction, 'fireworks_show');
  const last = states[states.length - 1];
  assert.equal(last.leaderboard[0].name, 'Đại Gia');
  assert.equal(last.counters.flowers, 3);
});

test('stress: a 1000-event burst is absorbed without unbounded growth', async () => {
  await rpc('wedding.reset');
  const res = await rpc('mock.burst', { count: 1000 });
  assert.equal(res.result.count, 1000);
  const status = (await rpc('wedding.getStatus')).result;
  assert.ok(status.queue.size <= 200, `queue bounded (${status.queue.size})`);
  assert.ok(status.queue.coalesced > 0, 'likes/gifts coalesced');
  assert.ok(status.antiSpam.rejected > 0, 'spam rejected');
  const state = (await rpc('wedding.getState')).result;
  assert.ok(state.love > 0);
});

test('admin controls: chapter, score, pause/resume, config, effect', async () => {
  await rpc('wedding.reset');
  assert.equal((await rpc('wedding.setChapter', { id: 'ring_exchange' })).result.id, 'ring_exchange');
  await rpc('wedding.adjustScore', { delta: 500 });
  let state = (await rpc('wedding.getState')).result;
  assert.equal(state.progress.current.id, 'ring_exchange');
  assert.equal(state.love, 500);
  assert.equal((await rpc('wedding.pause')).result, 'paused');
  assert.equal((await rpc('wedding.start')).result, 'running');
  const cfg = await rpc('wedding.updateConfig', { section: 'wedding', patch: { couple: { brideName: 'Hoa' } } });
  assert.equal(cfg.result.couple.brideName, 'Hoa');
  state = (await rpc('wedding.getState')).result;
  assert.equal(state.couple.brideName, 'Hoa');
  assert.equal((await rpc('wedding.triggerEffect', { effect: 'fireworks' })).result.ok, true);
  const bad = await rpc('wedding.updateConfig', { section: 'gifts', patch: { tiers: [] } });
  assert.ok(bad.error);
});

test('live.connect reports a clean error instead of crashing for an offline user', async () => {
  const res = await rpc('live.connect', { username: '' });
  // empty username falls back to config (empty) → validation error
  assert.ok(res.error);
  const status = (await rpc('live.status')).result;
  assert.equal(status.connected, false);
});

test('modes, themes and restart chapter are controllable over RPC', async () => {
  const modes = (await rpc('wedding.listModes')).result;
  assert.equal(modes.length, 6);
  const set = await rpc('wedding.setMode', { id: 'bride_vs_groom' });
  assert.equal(set.result.id, 'bride_vs_groom');
  assert.equal((await rpc('wedding.getState')).result.mode.id, 'bride_vs_groom');
  assert.ok((await rpc('wedding.setMode', { id: 'nope' })).error);
  assert.equal((await rpc('wedding.setTheme', { variant: 'vietnamese' })).result.variant, 'vietnamese');
  assert.equal((await rpc('wedding.getState')).result.theme, 'vietnamese');
  assert.ok((await rpc('wedding.setTheme', { variant: 'space' })).error);
  await rpc('wedding.setChapter', { id: 'ceremony' });
  assert.equal((await rpc('wedding.restartChapter')).result.id, 'ceremony');
  await rpc('wedding.setMode', { id: 'classic' });
  await rpc('wedding.setTheme', { variant: 'luxury' });
});

test('load: 1000 events/second for 2 seconds stays bounded and keeps scoring', async () => {
  await rpc('wedding.reset');
  const before = (await rpc('wedding.getStatus')).result.pipeline.received;
  await rpc('mock.rate', { eventsPerSec: 1000, durationSec: 2 });
  await new Promise((r) => setTimeout(r, 2600));
  const st = (await rpc('wedding.getStatus')).result;
  const received = st.pipeline.received - before;
  assert.ok(received >= 1600, `≈2000 events generated (${received})`);
  assert.ok(st.pipeline.batchedLikes > 0, 'likes were batched');
  assert.ok(st.queue.size <= 200, `presentation queue bounded (${st.queue.size})`);
  const state = (await rpc('wedding.getState')).result;
  assert.ok(state.love > 1000);
  assert.ok(state.leaderboard.length === 10);
  assert.equal(st.mock.rate, null, 'rate generator stopped by itself');
});
