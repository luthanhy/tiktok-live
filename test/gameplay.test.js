const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

process.env.LOG_SILENT = '1';

const { ConfigStore } = require('../src/config');
const { resolveGift } = require('../src/gameplay/gift-mapper');
const { PresentationQueue } = require('../src/events/event-queue');
const { AntiSpam } = require('../src/events/anti-spam');
const { sanitizeText, sanitizeUserName, sanitizeAvatar } = require('../src/events/sanitizer');
const { WeddingEngine } = require('../src/gameplay/wedding-engine');
const storyline = require('../src/storyline/storyline');
const { GiftComboTracker, social } = require('../src/tiktok/normalizer');
const { resolveTikTokUsername } = require('../src/tiktok/connector');

function tmpConfig() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wedding-cfg-'));
  return new ConfigStore({ overrideDir: dir });
}

function collectingQueue() {
  const items = [];
  return { items, push: (it) => items.push(it) };
}

function makeEngine(clockRef = { now: 1_000_000 }) {
  const config = tmpConfig();
  const queue = collectingQueue();
  const engine = new WeddingEngine({ config, queue, clock: () => clockRef.now });
  engine.state.chapterStartedAt = clockRef.now;
  return { engine, queue, config, clockRef };
}

// ---------------------------------------------------------------- gift mapping
test('gift mapper resolves by id, then by name, and falls back to tiers', () => {
  const cfg = tmpConfig().gifts;
  const rose = resolveGift(cfg, { id: 5655, name: 'whatever', diamonds: 1, count: 3 });
  assert.equal(rose.key, 'rose');
  assert.equal(rose.interaction, 'flower_delivery');
  assert.equal(rose.counters.flowers, 3);
  assert.equal(rose.points, 30);

  const byName = resolveGift(cfg, { id: 0, name: 'Heart Me', diamonds: 1 });
  assert.equal(byName.key, 'heart');
  assert.equal(byName.interaction, 'heart_burst');

  const unknownLarge = resolveGift(cfg, { id: 1, name: 'Mystery Box', diamonds: 299 });
  assert.equal(unknownLarge.mapped, false);
  assert.equal(unknownLarge.tier, 'large');
  assert.equal(unknownLarge.interaction, 'special_dance');

  const universe = resolveGift(cfg, { id: 7312, name: 'Universe', diamonds: 34999 });
  assert.equal(universe.tier, 'premium');
  assert.equal(universe.interaction, 'fireworks_show');
  assert.equal(universe.points, 8000, 'premium gifts are capped so one whale cannot finish the story alone');
  const perfume = resolveGift(cfg, { id: 5658, name: 'Perfume', diamonds: 20 });
  assert.equal(perfume.points, 120, 'medium tier uses its own rate');
});

test('a big combo of a cheap gift escalates with a bonus interaction', () => {
  const cfg = tmpConfig().gifts;
  const roses = resolveGift(cfg, { id: 5655, name: 'Rose', diamonds: 1, count: 150 });
  assert.equal(roses.interaction, 'flower_delivery');
  assert.equal(roses.tier, 'large');
  assert.equal(roses.bonusInteraction, 'special_dance');
});

test('gift mapping is editable at runtime', () => {
  const config = tmpConfig();
  config.update('gifts', { gifts: [...config.gifts.gifts, { key: 'ring', label: 'Nhẫn', names: ['ring'], interaction: 'light_show' }] });
  const r = resolveGift(config.gifts, { name: 'Ring', diamonds: 50 });
  assert.equal(r.key, 'ring');
  assert.equal(r.interaction, 'light_show');
  // persisted as an override and reloaded by a fresh store
  const reloaded = new ConfigStore({ overrideDir: config.overrideDir });
  assert.ok(reloaded.gifts.gifts.some((g) => g.key === 'ring'));
});

test('config validation rejects decreasing chapter thresholds', () => {
  const config = tmpConfig();
  const chapters = JSON.parse(JSON.stringify(config.wedding.storyline.chapters));
  chapters[2].threshold = 10;
  assert.throws(() => config.update('wedding', { storyline: { chapters } }), /threshold/);
});

// ---------------------------------------------------------------- queue
test('presentation queue orders by priority, coalesces and evicts', () => {
  const out = [];
  const q = new PresentationQueue({ getConfig: () => ({ maxSize: 3 }), onDispatch: (a) => out.push(a) });
  const merge = (a, b) => ({ count: a.count + b.count });
  q.push({ kind: 'hearts', priority: 1, coalesceKey: 'h:u1', merge, payload: { count: 2 } });
  q.push({ kind: 'hearts', priority: 1, coalesceKey: 'h:u1', merge, payload: { count: 5 } });
  q.push({ kind: 'gift', priority: 7, payload: { n: 1 } });
  q.push({ kind: 'wish', priority: 2, payload: { n: 2 } });
  assert.equal(q.size, 3);
  // full: a higher priority item evicts the lowest (hearts)
  assert.equal(q.push({ kind: 'chapter', priority: 100, payload: {} }), true);
  // a lower priority than everything queued is rejected
  assert.equal(q.push({ kind: 'hearts', priority: 0, payload: {} }), false);
  q.drain(10);
  assert.deepEqual(out.map((a) => a.kind), ['chapter', 'gift', 'wish']);
  assert.equal(q.stats.coalesced, 1);
});

test('presentation queue pacing drains maxBurst per tick and honours pause', async () => {
  const out = [];
  const q = new PresentationQueue({ getConfig: () => ({ dispatchIntervalMs: 20, maxBurst: 2 }), onDispatch: (a) => out.push(a) });
  for (let i = 0; i < 6; i++) q.push({ kind: 'k', payload: { i } });
  q.pause();
  q.start();
  await new Promise((r) => setTimeout(r, 70));
  assert.equal(out.length, 0);
  q.resume();
  await new Promise((r) => setTimeout(r, 35));
  assert.ok(out.length >= 2 && out.length <= 4, `paced dispatch, got ${out.length}`);
  q.stop();
});

// ---------------------------------------------------------------- anti-spam
test('anti-spam enforces comment cooldown, duplicates, follow dedup and share cooldown', () => {
  let now = 0;
  const spam = new AntiSpam(() => ({ commentCooldownMs: 1000, duplicateCommentWindowMs: 5000, followDedupWindowMs: 60000, shareCooldownMs: 2000, maxEventsPerUserPerMinute: 50 }), () => now);
  const u = { id: 'a', name: 'A' };
  assert.equal(spam.check({ type: 'comment', user: u, text: 'chúc mừng' }).ok, true);
  assert.equal(spam.check({ type: 'comment', user: u, text: 'khác' }).reason, 'comment_cooldown');
  now = 1500;
  assert.equal(spam.check({ type: 'comment', user: u, text: 'chúc  MỪNG' }).reason, 'duplicate_comment');
  now = 7000;
  assert.equal(spam.check({ type: 'comment', user: u, text: 'chúc mừng' }).ok, true);
  assert.equal(spam.check({ type: 'follow', user: u }).ok, true);
  assert.equal(spam.check({ type: 'follow', user: u }).reason, 'duplicate_follow');
  assert.equal(spam.check({ type: 'share', user: u }).ok, true);
  assert.equal(spam.check({ type: 'share', user: u }).reason, 'share_cooldown');
  // gifts are never blocked
  for (let i = 0; i < 100; i++) assert.equal(spam.check({ type: 'gift', user: u }).ok, true);
});

test('anti-spam per-user rate limit', () => {
  const spam = new AntiSpam(() => ({ commentCooldownMs: 0, duplicateCommentWindowMs: 0, maxEventsPerUserPerMinute: 3 }), () => 5);
  const u = { id: 'b' };
  const results = [1, 2, 3, 4].map((i) => spam.check({ type: 'comment', user: u, text: `t${i}` }).ok);
  assert.deepEqual(results, [true, true, true, false]);
});

// ---------------------------------------------------------------- sanitizer
test('sanitizer strips links, emotes, zalgo and caps length safely', () => {
  assert.equal(sanitizeText('<script>alert(1)</script> chúc mừng'), 'script alert 1 script chúc mừng');
  assert.equal(sanitizeText('ghé shop www.spam.com nha'), 'ghé shop nha');
  assert.equal(sanitizeText('𒐫𒐫𒐫'), '');
  assert.equal(sanitizeText('địt'), '');
  const long = sanitizeText('chúc '.repeat(60), 40);
  assert.ok(long.length <= 41 && long.endsWith('…'));
  assert.equal(sanitizeUserName('🌸🌸'), 'Khách Mời');
  assert.equal(sanitizeAvatar('javascript:alert(1)'), '');
  assert.equal(sanitizeAvatar('https://p16.tiktokcdn.com/a.jpg'), 'https://p16.tiktokcdn.com/a.jpg');
});

// ---------------------------------------------------------------- engine
test('engine scores events, updates counters, leaderboard and emits actions', () => {
  const { engine, queue } = makeEngine();
  engine.handle({ type: 'like', user: { id: 'u1', name: 'Lan' }, count: 10 });
  engine.handle({ type: 'follow', user: { id: 'u2', name: 'Huy' } });
  engine.handle({ type: 'share', user: { id: 'u2', name: 'Huy' } });
  engine.handle({ type: 'comment', user: { id: 'u3', name: 'My' }, text: 'Chúc hai bạn trăm năm hạnh phúc' });
  engine.handle({ type: 'comment', user: { id: 'u4', name: 'Kiên' }, text: 'chụp ảnh với cô dâu' });
  engine.handle({ type: 'gift', user: { id: 'u5', name: 'Ngân' }, gift: { id: 5655, name: 'Rose', diamonds: 1, count: 5 } });

  const s = engine.publicState();
  assert.equal(s.love, 10 + 25 + 40 + 5 + 5 + 50);
  assert.equal(s.counters.likes, 10);
  assert.equal(s.counters.flowers, 5);
  assert.equal(s.counters.guests, 3); // seated: u2 (follow), u3 (wish), u5 (gift); likes/photo requests don't take a seat
  assert.equal(s.counters.wishes, 1);
  assert.equal(s.counters.photos, 1);
  assert.equal(s.leaderboard[0].name, 'Huy');
  const kinds = queue.items.map((i) => i.kind);
  assert.deepEqual(kinds, ['hearts', 'top_supporter', 'guest_arrival', 'confetti', 'wish', 'photo', 'gift']);
  const gift = queue.items.find((i) => i.kind === 'gift');
  assert.equal(gift.payload.interaction, 'flower_delivery');
  assert.equal(gift.coalesceKey, 'gift:u5:rose');
});

test('chapters auto-advance one at a time, gated by dwell time and chapter objectives', () => {
  const { engine, queue, clockRef } = makeEngine();
  const chapters = storyline.sortedChapters(engine.cfg.storyline);
  const step = () => {
    clockRef.now += (chapters[engine.state.chapterIndex].minDurationSec + 1) * 1000;
    engine.tick(clockRef.now);
  };
  engine.adjustScore({ set: 12000 });
  step();
  assert.equal(engine.state.chapterIndex, 0, 'preparation needs its Preparation meter filled first');
  engine.adjustScore({ meter: 'preparation', meterValue: 1e9 });
  assert.ok(queue.items.some((i) => i.kind === 'meter_full' && i.payload.meter === 'preparation' && i.payload.objective));
  step();
  assert.equal(engine.state.chapterIndex, 1);
  step();
  step();
  assert.equal(chapters[engine.state.chapterIndex].id, 'ring_exchange');
  step();
  step();
  assert.equal(chapters[engine.state.chapterIndex].id, 'ring_exchange', 'kiss waits until the rings are exchanged');
  engine.adjustScore({ meter: 'ring', meterValue: 1e9 });
  step();
  assert.equal(chapters[engine.state.chapterIndex].id, 'kiss');
  step();
  assert.equal(chapters[engine.state.chapterIndex].id, 'kiss', '12000 love is below the reception threshold');
  const info = engine.publicState().progress;
  assert.equal(info.next.id, 'reception');
  assert.equal(info.pointsToNext, 16000 - engine.state.love);
});

test('pause stops progression, manual chapter control works, finale carries a summary', () => {
  const { engine, queue, clockRef } = makeEngine();
  engine.adjustScore({ set: 999999 });
  engine.pause();
  clockRef.now += 10 * 60 * 1000;
  engine.tick(clockRef.now);
  assert.equal(engine.state.chapterIndex, 0);
  engine.start();
  engine.setChapter('finale');
  assert.equal(engine.publicState().progress.current.id, 'finale');
  const finale = queue.items.filter((i) => i.kind === 'chapter').pop();
  assert.ok(finale.payload.summary);
  assert.equal(finale.payload.summary.love, 999999);
  engine.prevChapter();
  assert.equal(engine.publicState().progress.current.id, 'reception');
  assert.throws(() => engine.setChapter('nope'), /Unknown chapter/);
  engine.reset();
  assert.equal(engine.state.love, 0);
  assert.equal(engine.state.chapterIndex, 0);
});

test('happiness overflow and support goal award configurable bonuses', () => {
  const { engine, queue } = makeEngine();
  engine.adjustScore({ happiness: 99 });
  engine.handle({ type: 'gift', user: { id: 'big', name: 'Big' }, gift: { id: 7312, name: 'Universe', diamonds: 34999 } });
  assert.ok(queue.items.some((i) => i.kind === 'happiness_overflow'));
  const before = engine.meters.state.support.completions;
  for (let i = 0; i < 25; i++) engine.handle({ type: 'share', user: { id: `s${i}`, name: `Share ${i}` } });
  assert.ok(engine.meters.state.support.completions > before);
  assert.ok(engine.meters.state.support.max > 500, 'support goal grows after each level');
  assert.ok(queue.items.some((i) => i.kind === 'support_goal'));
});

test('thresholds come from config, not code', () => {
  const { engine, config, clockRef } = makeEngine();
  const chapters = config.wedding.storyline.chapters.map((c) => ({ ...c, threshold: c.order === 1 ? 0 : c.order * 10, minDurationSec: 0, requireObjective: false }));
  config.update('wedding', { storyline: { chapters } });
  engine.adjustScore({ set: 20 });
  engine.tick(clockRef.now + 1);
  assert.equal(engine.publicState().progress.current.id, 'bride_entrance');
});

// ---------------------------------------------------------------- tiktok normalizer
test('gift combo tracker scores only deltas of a streak', () => {
  const t = new GiftComboTracker();
  const pkt = (repeatCount, repeatEnd = false) => ({ user: { uniqueId: 'x', nickname: 'X' }, giftId: 5655, groupId: 'g1', repeatCount, repeatEnd, giftDetails: { name: 'Rose', diamondCount: 1 } });
  const counts = [pkt(1), pkt(3), pkt(3), pkt(5), pkt(5, true)].map((p) => t.normalize(p)?.gift.count ?? null);
  assert.deepEqual(counts, [1, 2, null, 2, null]);
  // non-streak gift arrives once with repeatEnd
  const single = t.normalize({ user: { uniqueId: 'y' }, giftId: 7312, repeatCount: 1, repeatEnd: true, giftDetails: { name: 'Universe', diamondCount: 34999 } });
  assert.equal(single.gift.diamonds, 34999);
  assert.equal(single.gift.count, 1);
});

test('social payloads map to follow/share', () => {
  assert.equal(social({ user: { uniqueId: 'a' }, displayType: 'pm_mt_msg_viewer_follow' }).type, 'follow');
  assert.equal(social({ user: { uniqueId: 'a' }, common: { displayText: { displayType: 'pm_mt_guidance_share' } } }).type, 'share');
  assert.equal(social({ user: { uniqueId: 'a' }, action: '7' }), null);
});

test('username resolver keeps the original URL handling', async () => {
  assert.equal(await resolveTikTokUsername('@abc.def'), 'abc.def');
  assert.equal(await resolveTikTokUsername('https://www.tiktok.com/@shop_vn/live?x=1'), 'shop_vn');
  const fakeFetch = async () => ({ url: 'https://www.tiktok.com/@resolved_user/live' });
  assert.equal(await resolveTikTokUsername('https://vt.tiktok.com/ZS123/', fakeFetch), 'resolved_user');
});

test('comments are read aloud (spaced), keep their emojis and emoji-only comments still count', () => {
  const { engine, queue, clockRef } = makeEngine();
  engine.handle({ type: 'comment', user: { id: 'a', name: 'Tuấn' }, text: 'con đà điểu kìa 🦒' });
  clockRef.now += 500;
  engine.handle({ type: 'comment', user: { id: 'b', name: 'Vy' }, text: 'đẹp đôi quá' });
  clockRef.now += 3000;
  engine.handle({ type: 'comment', user: { id: 'c', name: 'Hà' }, text: 'hôn đi' });
  engine.handle({ type: 'comment', user: { id: 'd', name: 'Nam' }, text: '🐘🐘' });
  const [first, second, third, fourth] = queue.items.map((i) => i.payload);
  assert.match(first.tts, /^Tuấn (chúc|gửi lời chúc): con đà điểu kìa$/);
  assert.deepEqual(first.emojis, ['🦒']);
  assert.equal(second.tts, '', 'second comment inside the gap is shown but not read');
  assert.match(third.tts, /^Hà (nói|bảo): hôn đi$/);
  assert.equal(fourth.text, '🐘 🐘');
  assert.equal(fourth.tts, '', 'emoji-only comments are not read aloud');
  assert.equal(engine.publicState().counters.comments, 4);
});

test('read-aloud mode can be limited to wishes or switched off', () => {
  const { engine, queue, config, clockRef } = makeEngine();
  config.update('wedding', { comments: { readAloud: { mode: 'off' } } });
  engine.handle({ type: 'comment', user: { id: 'a', name: 'Tuấn' }, text: 'chúc mừng nhé' });
  assert.equal(queue.items[0].payload.tts, '');
  config.update('wedding', { comments: { readAloud: { mode: 'wishes' } } });
  clockRef.now += 5000;
  engine.handle({ type: 'comment', user: { id: 'b', name: 'Vy' }, text: 'hôn đi' });
  assert.equal(queue.items[1].payload.tts, '');
});

test('announcer reads gifts, follows, shares and arrivals in varied Vietnamese, spaced out', () => {
  const { engine, queue, clockRef } = makeEngine();
  const ttsOf = (kind) => [...queue.items].reverse().find((i) => i.kind === kind)?.payload.tts;
  engine.handle({ type: 'gift', user: { id: 'a', name: 'thao.vy_99' }, gift: { id: 5655, name: 'Rose', diamonds: 1, count: 5 } });
  assert.match(ttsOf('gift'), /thao vy 99/, 'handle separators are spoken as spaces');
  assert.match(ttsOf('gift'), /5 Hoa Hồng/);
  clockRef.now += 500;
  engine.handle({ type: 'follow', user: { id: 'b', name: 'Huy' } });
  assert.equal(ttsOf('guest_arrival'), '', 'too soon after the last line');
  clockRef.now += 3000;
  engine.handle({ type: 'follow', user: { id: 'c', name: 'Lan' } });
  assert.match(ttsOf('guest_arrival'), /Lan/);
  clockRef.now += 100;
  engine.handle({ type: 'gift', user: { id: 'd', name: 'Đại Gia' }, gift: { name: 'Universe', diamonds: 34999, count: 1 } });
  assert.match(ttsOf('gift'), /Đại Gia/, 'big gifts are always thanked, even inside the gap');
  clockRef.now += 3000;
  engine.handle({ type: 'share', user: { id: 'e', name: 'Mai' } });
  assert.match(ttsOf('confetti'), /Mai/);
  clockRef.now += 3000;
  engine.handle({ type: 'join', user: { id: 'f', name: 'Khoa' } });
  assert.match(ttsOf('welcome'), /Khoa/);
  clockRef.now += 3000;
  engine.handle({ type: 'join', user: { id: 'g', name: 'Nga' } });
  assert.match(ttsOf('welcome'), /Khoa/, 'arrivals are welcomed at most once per joinGapMs');
});

test('announcer never repeats the same phrasing twice in a row', () => {
  const { Announcer, LINES } = require('../src/gameplay/announcer');
  let t = 0;
  const a = new Announcer({ clock: () => (t += 5000), getConfig: () => ({}), random: () => 0 });
  const first = a.gift({ name: 'A', gift: 'Hoa', big: false });
  const second = a.gift({ name: 'A', gift: 'Hoa', big: false });
  assert.notEqual(first, second);
  assert.ok(LINES.gift.length >= 3 && LINES.bigGift.length >= 3);
});

test('a quiet room gets MC invitations, spaced out and reset by viewer activity', () => {
  const { engine, queue, clockRef } = makeEngine();
  engine.start();
  const prompts = () => queue.items.filter((i) => i.kind === 'mc_prompt');
  clockRef.now += 20000;
  engine.tick();
  assert.equal(prompts().length, 0, 'not before idlePromptSec');
  clockRef.now += 25000;
  engine.tick();
  assert.equal(prompts().length, 1);
  assert.ok(prompts()[0].payload.tts.length > 10, 'the MC reads the invitation');
  clockRef.now += 10000;
  engine.handle({ type: 'like', user: { id: 'u', name: 'Lan' }, count: 5 });
  clockRef.now += 30000;
  engine.tick();
  assert.equal(prompts().length, 1, 'activity pushes the next invitation back');
  clockRef.now += 15000;
  engine.tick();
  assert.equal(prompts().length, 2);
  assert.notEqual(prompts()[0].payload.text, prompts()[1].payload.text);
});
