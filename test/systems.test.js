/**
 * Tests for the second-generation systems: ingest pipeline, generic meters, gift rules,
 * leaderboard and the pluggable game modes.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

process.env.LOG_SILENT = '1';

const { ConfigStore } = require('../src/config');
const { WeddingEngine } = require('../src/gameplay/wedding-engine');
const { EventPipeline } = require('../src/events/pipeline');
const { AntiSpam } = require('../src/events/anti-spam');
const { createGameEvent } = require('../src/events/game-event');
const { Leaderboard } = require('../src/gameplay/leaderboard');
const { listModes } = require('../src/gameplay/modes');

function setup({ mode, patch } = {}) {
  const config = new ConfigStore({ overrideDir: fs.mkdtempSync(path.join(os.tmpdir(), 'wedding-sys-')) });
  if (patch) config.update('wedding', patch);
  if (mode) config.update('wedding', { mode: { active: mode } });
  const clockRef = { now: 1_000_000 };
  const queue = { items: [], push(i) { this.items.push(i); } };
  const engine = new WeddingEngine({ config, queue, clock: () => clockRef.now });
  engine.reset();
  queue.items.length = 0;
  return { config, engine, queue, clockRef, kinds: () => queue.items.map((i) => i.kind) };
}

const U = (id, name = id) => ({ id, name });

// ---------------------------------------------------------------- GameEvent + pipeline
test('GameEvent normalizes any source into one shape', () => {
  const e = createGameEvent({ type: 'gift', user: { uniqueId: 'abc', nickname: 'Abc' }, gift: { id: 5655, name: 'Rose', diamonds: 1, count: 7 }, source: 'tiktok' });
  assert.equal(e.type, 'gift');
  assert.equal(e.amount, 7);
  assert.equal(e.user.id, 'abc');
  assert.equal(e.gift.count, 7);
  assert.ok(e.timestamp > 0);
  assert.throws(() => createGameEvent({ type: 'dance' }), /Unsupported/);
});

test('pipeline batches like packets per viewer into a single engine call', async () => {
  const handled = [];
  const engine = { handle: (e) => (handled.push(e), { ok: true }) };
  const pipe = new EventPipeline({ engine, antiSpam: new AntiSpam(() => ({})), getConfig: () => ({ likeAggregateWindowMs: 40 }) });
  for (let i = 0; i < 100; i++) pipe.publish({ type: 'like', user: U('fan'), count: 1 });
  pipe.publish({ type: 'like', user: U('other'), count: 3 });
  assert.equal(handled.length, 0, 'likes wait for the aggregation window');
  await new Promise((r) => setTimeout(r, 80));
  assert.equal(handled.length, 2);
  assert.equal(handled.find((e) => e.user.id === 'fan').amount, 100);
  assert.equal(handled.find((e) => e.user.id === 'fan').metadata.packets, 100);
  assert.equal(pipe.snapshot().batchedLikes, 99);
  assert.equal(pipe.publish({ type: 'comment', user: U('x'), text: 'địt' }).reason, 'toxic_or_spam');
  assert.equal(pipe.publish({ type: 'teleport' }).reason, 'invalid_event');
  assert.ok(pipe.rate() > 0);
});

// ---------------------------------------------------------------- meters
test('chapter meters only fill while their chapter is active and reset on entry', () => {
  const { engine } = setup();
  engine.handle({ type: 'like', user: U('a'), amount: 30 });
  assert.equal(engine.meters.value('preparation'), 30, 'preparation is active in chapter 1');
  assert.equal(engine.meters.value('cake'), 0, 'cake meter is a reception meter');
  engine.setChapter('reception');
  engine.handle({ type: 'comment', user: U('b'), text: 'nhảy đi mọi người' });
  assert.ok(engine.meters.value('dance') >= 54, 'dance comments add the keyword bonus');
  engine.handle({ type: 'gift', user: U('c'), gift: { id: 5879, name: 'Doughnut', diamonds: 30, count: 1 } });
  assert.ok(engine.meters.value('cake') >= 200 + 90, 'cake gift adds its giftKeys bonus');
});

test('meter fills award bonus points, grow the goal and mark the chapter objective', () => {
  const { engine, queue } = setup();
  const before = engine.state.love;
  engine.adjustScore({ meter: 'preparation', meterValue: 1e9 });
  const full = queue.items.find((i) => i.kind === 'meter_full');
  assert.equal(full.payload.meter, 'preparation');
  assert.equal(full.payload.objective, true);
  assert.equal(engine.state.objectiveDone, true);
  assert.equal(engine.state.love, before + 200);
  assert.equal(engine.meters.state.preparation.max, 750);
});

// ---------------------------------------------------------------- gift rules
test('gift effect cooldown keeps the score but downgrades repeated showpieces', () => {
  const { engine, queue, clockRef } = setup();
  const perfume = { id: 5658, name: 'Perfume', diamonds: 20, count: 1 };
  engine.handle({ type: 'gift', user: U('a'), gift: perfume });
  engine.handle({ type: 'gift', user: U('b'), gift: perfume });
  const gifts = queue.items.filter((i) => i.kind === 'gift');
  assert.equal(gifts[0].payload.interaction, 'perfume_mist');
  assert.equal(gifts[1].payload.interaction, 'sparkle_shower');
  assert.equal(gifts[1].payload.note, 'cooldown');
  assert.equal(gifts[1].payload.gift.points, 120, 'points are never reduced by cooldowns');
  clockRef.now += 3000;
  engine.handle({ type: 'gift', user: U('c'), gift: perfume });
  assert.equal(queue.items.filter((i) => i.kind === 'gift').pop().payload.interaction, 'perfume_mist');
});

test('chapter requirement locks a gift effect until the story gets there', () => {
  const { engine, queue } = setup();
  const galaxy = { id: 11046, name: 'Galaxy', diamonds: 1000, count: 1 };
  engine.handle({ type: 'gift', user: U('a'), gift: galaxy });
  assert.equal(queue.items.filter((i) => i.kind === 'gift').pop().payload.note, 'chapter_locked');
  engine.setChapter('ceremony');
  engine.handle({ type: 'gift', user: U('b'), gift: galaxy });
  assert.equal(queue.items.filter((i) => i.kind === 'gift').pop().payload.interaction, 'light_show');
});

test('premium chapter boost pushes the story to the next threshold and completes the objective', () => {
  const { engine } = setup();
  engine.handle({ type: 'gift', user: U('whale'), gift: { id: 7312, name: 'Universe', diamonds: 34999, count: 1 } });
  assert.ok(engine.state.love >= 1000);
  assert.equal(engine.state.objectiveDone, true);
});

// ---------------------------------------------------------------- leaderboard
test('leaderboard has medals, top 10 and prunes for long streams', () => {
  const board = new Leaderboard(() => ({ size: 10, maxTracked: 50 }));
  for (let i = 0; i < 80; i++) board.get(U(`u${i}`)).points = i;
  assert.ok(board.count() <= 50);
  const top = board.top();
  assert.equal(top.length, 10);
  assert.deepEqual(top.slice(0, 3).map((t) => t.badge), ['🥇', '🥈', '🥉']);
  assert.equal(top[0].id, 'u79');
});

// ---------------------------------------------------------------- modes
test('mode registry lists the five extra modes plus classic', () => {
  assert.deepEqual(listModes().map((m) => m.id), ['classic', 'bride_vs_groom', 'love_race', 'wedding_rush', 'gift_battle', 'perfect_wedding']);
});

test('Bride vs Groom: comments choose a side, contributions score for that team', () => {
  const { engine, kinds } = setup({ mode: 'bride_vs_groom' });
  engine.handle({ type: 'comment', user: U('a'), text: 'team cô dâu nha' });
  engine.handle({ type: 'comment', user: U('b'), text: 'chú rể đẹp trai quá' });
  engine.handle({ type: 'gift', user: U('a'), gift: { id: 5655, name: 'Rose', diamonds: 1, count: 10 } });
  engine.handle({ type: 'gift', user: U('b'), gift: { id: 5487, name: 'Finger Heart', diamonds: 5, count: 10 } });
  const st = engine.publicState().mode;
  assert.equal(st.id, 'bride_vs_groom');
  const bride = st.teams.find((t) => t.id === 'bride');
  const groom = st.teams.find((t) => t.id === 'groom');
  assert.equal(bride.members, 1);
  assert.ok(groom.score > bride.score);
  assert.ok(kinds().includes('team_join'));
  assert.ok(kinds().includes('team_lead'), 'lead change is announced');
  assert.equal(engine.publicState().leaderboard.find((l) => l.id === 'a').team, 'bride');
  engine.setChapter('finale');
  assert.ok(kinds().includes('mode_result'));
});

test('Love Race: viewers auto-join a family and rounds award the winner', () => {
  const { engine, clockRef, kinds } = setup({ mode: 'love_race' });
  engine.handle({ type: 'like', user: U('fan1'), amount: 20 });
  engine.handle({ type: 'like', user: U('fan2'), amount: 5 });
  const st = engine.publicState().mode;
  assert.equal(st.teams.reduce((s, t) => s + t.members, 0), 2);
  const love = engine.state.love;
  clockRef.now += 181000;
  engine.tick(clockRef.now);
  assert.ok(kinds().includes('round_end'));
  assert.equal(engine.state.love, love + 500);
  assert.equal(engine.publicState().mode.round, 2);
});

test('Wedding Rush: time out ends the round, then the wedding restarts', () => {
  const { engine, clockRef, kinds } = setup({ mode: 'wedding_rush', patch: { modes: { wedding_rush: { durationSec: 60, resultHoldSec: 5 } } } });
  assert.equal(engine.publicState().mode.remainingSec, 60);
  clockRef.now += 61000;
  engine.tick(clockRef.now);
  assert.equal(engine.state.status, 'ended');
  assert.equal(engine.handle({ type: 'like', user: U('a') }).reason, 'round_over');
  const res = engine.queue.items.find((i) => i.kind === 'mode_result');
  assert.equal(res.payload.success, false);
  clockRef.now += 6000;
  engine.tick(clockRef.now);
  assert.equal(engine.state.status, 'running');
  assert.equal(engine.publicState().mode.remainingSec, 60);
  assert.ok(kinds().includes('chapter'));
});

test('Wedding Rush: reaching the finale in time is a success', () => {
  const { engine } = setup({ mode: 'wedding_rush' });
  engine.setChapter('finale');
  const res = engine.queue.items.find((i) => i.kind === 'mode_result');
  assert.equal(res.payload.success, true);
  assert.equal(engine.mode.durationScale(), 0.5);
});

test('Gift Battle: round champion is crowned and earns bonus love', () => {
  const { engine, clockRef } = setup({ mode: 'gift_battle' });
  engine.handle({ type: 'gift', user: U('small'), gift: { id: 5655, name: 'Rose', diamonds: 1, count: 1 } });
  engine.handle({ type: 'gift', user: U('big'), gift: { id: 5658, name: 'Perfume', diamonds: 20, count: 1 } });
  assert.equal(engine.publicState().mode.roundTop[0].id, 'big');
  clockRef.now += 121000;
  engine.tick(clockRef.now);
  const end = engine.queue.items.find((i) => i.kind === 'round_end');
  assert.equal(end.payload.champion.id, 'big');
  assert.equal(engine.publicState().mode.champions[0].id, 'big');
  assert.equal(engine.publicState().mode.roundTop.length, 0);
});

test('Perfect Wedding: missed chapter deadlines count mistakes and fail at the limit', () => {
  const { engine, clockRef, kinds } = setup({ mode: 'perfect_wedding', patch: { modes: { perfect_wedding: { chapterLimitSec: 10, maxMistakes: 2, resultHoldSec: 5 } } } });
  clockRef.now += 11000;
  engine.tick(clockRef.now);
  assert.equal(engine.publicState().mode.mistakes, 1);
  assert.ok(kinds().includes('mode_mistake'));
  clockRef.now += 11000;
  engine.tick(clockRef.now);
  assert.equal(engine.state.status, 'ended');
  assert.equal(engine.queue.items.find((i) => i.kind === 'mode_result').payload.success, false);
});

test('persisted state round-trips meters, leaderboard and mode data', () => {
  const { engine, config } = setup({ mode: 'bride_vs_groom' });
  engine.handle({ type: 'comment', user: U('a'), text: 'cô dâu' });
  engine.handle({ type: 'like', user: U('a'), amount: 40 });
  const saved = JSON.parse(JSON.stringify(engine.serialize()));
  const restored = new WeddingEngine({ config, queue: { push() {} }, initialState: saved });
  assert.equal(restored.state.love, engine.state.love);
  assert.equal(restored.meters.value('preparation'), engine.meters.value('preparation'));
  assert.equal(restored.mode.teamOf('a'), 'bride');
  assert.equal(restored.leaderboard()[0].id, 'a');
});

test('a pre-Vietnamese saved config is migrated to the Vietnamese storyline, keeping tuned numbers', () => {
  const { ConfigStore } = require('../src/config');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wedding-mig-'));
  const legacy = JSON.parse(JSON.stringify(require('../src/config/wedding.config.json')));
  delete legacy.locale;
  legacy.theme.variant = 'luxury';
  legacy.couple.weddingTitle = 'WEDDING LIVE – THE BIG DAY';
  legacy.meters.happiness.label = 'Happiness';
  legacy.storyline.chapters[0].title = 'Wedding Preparation';
  legacy.storyline.chapters[0].music = 'prelude';
  legacy.storyline.chapters[0].threshold = 0;
  legacy.storyline.chapters[1].minDurationSec = 99;
  fs.writeFileSync(path.join(dir, 'wedding.config.json'), JSON.stringify(legacy));
  const cfg = new ConfigStore({ overrideDir: dir }).wedding;
  assert.equal(cfg.locale, 'vi');
  assert.equal(cfg.theme.variant, 'vietnamese');
  assert.equal(cfg.couple.weddingTitle, 'ĐÁM CƯỚI LIVE – NGÀY VUI CHUNG ĐÔI');
  assert.equal(cfg.meters.happiness.label, 'Niềm vui');
  assert.equal(cfg.storyline.chapters[0].title, 'Chuẩn Bị Đám Cưới');
  assert.equal(cfg.storyline.chapters[0].music, 'vn_prelude');
  assert.equal(cfg.storyline.chapters[1].minDurationSec, 99, 'streamer tuning is kept');
  const saved = JSON.parse(fs.readFileSync(path.join(dir, 'wedding.config.json'), 'utf8'));
  assert.equal(saved.locale, 'vi', 'migration is written back once');
});

test('Vietnamese defaults: theme, voice gender, background song and all chapter music', () => {
  const cfg = require('../src/config/wedding.config.json');
  assert.equal(cfg.theme.variant, 'vietnamese');
  assert.equal(cfg.audio.ttsGender, 'female');
  assert.match(cfg.audio.musicUrl, /^https:\/\/cdn\.songhy\.online\/.+\.mp3$/);
  for (const ch of cfg.storyline.chapters) assert.match(ch.music, /^vn_/, `${ch.id} uses Vietnamese music`);
});
