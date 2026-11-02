/**
 * WeddingEngine — the game engine facade.
 *
 *   GameEvent ──▶ handle() ─┬─ scoring (love points, counters, gift rules)
 *                           ├─ MeterManager   (happiness, support, preparation, ring, cake…)
 *                           ├─ Leaderboard    (supporters, ranks, badges)
 *                           ├─ chapter state  (storyline.js — thresholds, objectives, pacing)
 *                           └─ GameMode       (classic, bride vs groom, love race, rush, battle, perfect)
 *              ──▶ presentation actions → PresentationQueue → stage
 *
 * It knows nothing about TikTok, sockets or the DOM.
 */
const { resolveGift } = require('./gift-mapper');
const { MeterManager } = require('./meters');
const { Leaderboard } = require('./leaderboard');
const { createMode, listModes } = require('./modes');
const storyline = require('../storyline/storyline');
const { sanitizeUserName, sanitizeText, sanitizeAvatar } = require('../events/sanitizer');

const STATE_VERSION = 2;
const PRIORITY = { chapter: 100, meter: 30, manual: 50, overflow: 8, support: 6, follow: 3, share: 3, comment: 2, hearts: 1 };
const MAX_GUESTS = 40;
const EMOJI_RE = /\p{Extended_Pictographic}/gu;
const MAX_WISHES = 30;
const MAX_LOG = 250;

function freshState(cfg, now = Date.now()) {
  return {
    status: cfg.storyline?.autoStart === false ? 'idle' : 'running',
    love: 0,
    chapterIndex: 0,
    chapterStartedAt: now,
    objectiveDone: false,
    chapterHistory: [],
    counters: { guests: 0, flowers: 0, hearts: 0, gifts: 0, diamonds: 0, likes: 0, comments: 0, wishes: 0, shares: 0, follows: 0, photos: 0 },
    giftStats: {},
    guests: [],
    wishes: [],
    startedAt: now,
    completedAt: null
  };
}

class WeddingEngine {
  /**
   * @param {object} deps
   * @param {import('../config').ConfigStore} deps.config
   * @param {{push:Function}} deps.queue
   */
  constructor({ config, queue, logger, clock, initialState } = {}) {
    this.config = config;
    this.queue = queue;
    this.logger = logger;
    this.clock = clock || Date.now;
    this.eventLog = [];
    this.listeners = new Set();
    this.lastWishTtsAt = 0;
    this.giftEffectAt = new Map();
    this.meters = new MeterManager(() => this.cfg.meters);
    this.board = new Leaderboard(() => this.cfg.leaderboard || {});
    this.state = freshState(this.cfg, this.clock());
    this.meters.resetAll();
    this.mode = this.makeMode(this.cfg.mode?.active);
    this.mode.onReset();
    if (initialState?.version === STATE_VERSION) this.hydrate(initialState);
  }

  get cfg() {
    return this.config.wedding;
  }

  makeMode(id) {
    return createMode(id || 'classic', this);
  }

  hydrate(saved) {
    const base = freshState(this.cfg, this.clock());
    this.state = { ...base, ...saved.state, counters: { ...base.counters, ...(saved.state?.counters || {}) } };
    const max = this.chapterCount() - 1;
    this.state.chapterIndex = Math.max(0, Math.min(max, Number(this.state.chapterIndex) || 0));
    // Restart the dwell timer so a reloaded server doesn't instantly skip a chapter.
    this.state.chapterStartedAt = this.clock();
    if (this.state.status === 'ended') this.state.status = 'running';
    this.meters.hydrate(saved.meters);
    this.board.hydrate(saved.leaderboard);
    if (saved.mode?.id && saved.mode.id === this.mode.id) this.mode.hydrate(saved.mode.data || {});
  }

  serialize() {
    return { version: STATE_VERSION, state: this.state, meters: this.meters.serialize(), leaderboard: this.board.serialize(), mode: { id: this.mode.id, data: this.mode.serialize() } };
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  changed(reason) {
    for (const fn of this.listeners) fn(reason);
  }

  log(entry) {
    const item = { id: `ev_${this.clock()}_${Math.random().toString(36).slice(2, 6)}`, ts: new Date(this.clock()).toISOString(), ...entry };
    this.eventLog.unshift(item);
    if (this.eventLog.length > MAX_LOG) this.eventLog.length = MAX_LOG;
    return item;
  }

  emit(kind, priority, payload, extra = {}) {
    this.queue.push({ kind, priority, payload, ...extra });
  }

  // ------------------------------------------------------------------ story helpers
  chapters() {
    return storyline.sortedChapters(this.cfg.storyline);
  }

  chapterCount() {
    return this.chapters().length;
  }

  chapter() {
    return this.chapters()[this.state.chapterIndex];
  }

  isFinale() {
    return this.state.chapterIndex >= this.chapterCount() - 1;
  }

  // ------------------------------------------------------------------ viewers
  normalizeUser(user = {}) {
    const name = sanitizeUserName(user.name || user.id);
    const id = String(user.id || name).slice(0, 48);
    return { id, name, avatar: sanitizeAvatar(user.avatar) };
  }

  /** Seat the viewer among the visible guests (most recent 40). Returns true if they are new. */
  seatGuest(user, role) {
    const team = this.mode.teamOf(user.id);
    const existing = this.state.guests.find((g) => g.id === user.id);
    if (existing) {
      existing.role = role || existing.role;
      existing.team = team || existing.team || '';
      if (user.avatar) existing.avatar = user.avatar;
      return false;
    }
    this.state.guests.push({ id: user.id, name: user.name, avatar: user.avatar, role: role || 'guest', team, at: this.clock() });
    if (this.state.guests.length > MAX_GUESTS) this.state.guests.shift();
    this.state.counters.guests += 1;
    return true;
  }

  // ------------------------------------------------------------------ scoring
  /** Public so game modes can award bonuses. */
  addLove(points, supporter) {
    const p = Math.max(0, Math.round(points));
    if (!p) return 0;
    this.state.love += p;
    if (supporter) supporter.points += p;
    const leader = this.board.checkLeader();
    if (leader) this.emit('top_supporter', 5, { user: { id: leader.id, name: leader.name, avatar: leader.avatar }, points: leader.points }, { coalesceKey: 'top_supporter', merge: (_a, b) => b });
    return p;
  }

  handleFills(fills) {
    const objective = this.chapter()?.objective?.meter;
    for (const f of fills) {
      this.state.love += f.bonus;
      const isObjective = f.id === objective;
      if (isObjective) this.state.objectiveDone = true;
      this.log({ type: 'meter_full', meter: f.id, label: f.label, completions: f.completions, bonus: f.bonus });
      if (f.action === 'happiness_overflow') {
        this.emit('happiness_overflow', PRIORITY.overflow, { bonus: f.bonus, tts: 'Niềm vui đã tràn ngập! Cả khán phòng cùng nâng ly chúc mừng cô dâu chú rể!' });
      } else if (f.action === 'support_goal') {
        this.emit('support_goal', PRIORITY.support, { level: f.completions, goal: f.reached, bonus: f.bonus });
      } else {
        this.emit('meter_full', PRIORITY.meter, { meter: f.id, label: f.label, icon: f.icon, completions: f.completions, bonus: f.bonus, objective: isObjective, chapter: this.chapter()?.id });
      }
    }
  }

  // ------------------------------------------------------------------ events
  /** Main entry point for a GameEvent (see src/events/game-event.js). */
  handle(evt) {
    const status = this.state.status;
    if (status === 'idle' || status === 'ended') return { ok: false, reason: status === 'idle' ? 'not_started' : 'round_over' };
    const amount = Math.max(1, Number(evt.amount ?? evt.count ?? evt.gift?.count ?? 1));
    const e = { ...evt, amount };
    let out;
    switch (e.type) {
      case 'like':
        out = this.onLike(e);
        break;
      case 'follow':
        out = this.onSocial(e, 'follow');
        break;
      case 'share':
        out = this.onSocial(e, 'share');
        break;
      case 'comment':
        out = this.onComment(e);
        break;
      case 'gift':
        out = this.onGift(e);
        break;
      case 'join':
        out = this.onJoin(e);
        break;
      default:
        return { ok: false, reason: `unknown_event:${e.type}` };
    }
    if (out.ok) {
      this.handleFills(this.meters.apply(e, this.chapter(), out.meterExtra || {}));
      this.mode.onEvent(e, { user: out.user, supporter: out.supporter, points: out.points || 0, action: out.action });
      this.changed(e.type);
    }
    delete out.meterExtra;
    delete out.supporter;
    return out;
  }

  onLike(e) {
    const sc = this.cfg.scoring?.like || {};
    const user = this.normalizeUser(e.user);
    const sup = this.board.get(user, this.clock());
    const count = Math.min(Number(sc.maxLikesPerEvent || 30) * Math.max(1, Number(e.metadata?.packets || 1)), e.amount);
    sup.likes += count;
    this.state.counters.likes += count;
    const points = this.addLove(count * Number(sc.pointsPerLike ?? 1), sup);
    this.emit('hearts', PRIORITY.hearts, { user, count }, { coalesceKey: `hearts:${user.id}`, merge: (a, b) => ({ ...b, count: Math.min(999, a.count + b.count) }) });
    return { ok: true, user, supporter: sup, points };
  }

  onSocial(e, kind) {
    const sc = this.cfg.scoring?.[kind] || {};
    const user = this.normalizeUser(e.user);
    const sup = this.board.get(user, this.clock());
    const points = this.addLove(sc.points ?? (kind === 'follow' ? 25 : 40), sup);
    if (kind === 'follow') {
      this.state.counters.follows += 1;
      const isNew = this.seatGuest(user, 'guest');
      this.log({ type: 'follow', user: user.name, points });
      this.emit('guest_arrival', PRIORITY.follow, { user, isNew, team: this.mode.teamOf(user.id), guests: this.state.counters.guests });
    } else {
      this.state.counters.shares += 1;
      this.log({ type: 'share', user: user.name, points });
      this.emit('confetti', PRIORITY.share, { user });
    }
    return { ok: true, user, supporter: sup, points };
  }

  onJoin(e) {
    const user = this.normalizeUser(e.user);
    const sup = this.board.get(user, this.clock());
    const points = this.addLove(this.cfg.scoring?.join?.points ?? 1, sup);
    return { ok: true, user, supporter: sup, points };
  }

  classifyComment(text) {
    const lower = text.toLowerCase();
    for (const rule of this.cfg.comments?.keywords || []) {
      if ((rule.match || []).some((kw) => lower.includes(String(kw).toLowerCase()))) return rule.action;
    }
    return this.cfg.comments?.defaultAction || 'wish';
  }

  onComment(e) {
    const maxLen = this.cfg.antiSpam?.maxCommentLength || 90;
    // Emojis are stripped by the sanitizer, so keep the first few for the stage spawner.
    const emojis = (String(e.text || '').match(EMOJI_RE) || []).slice(0, 3);
    const clean = sanitizeText(e.text, maxLen);
    if ((!clean || clean.length < 2) && !emojis.length) return { ok: false, reason: 'filtered' };
    const text = clean && clean.length >= 2 ? clean : emojis.join(' ');
    const user = this.normalizeUser(e.user);
    const sup = this.board.get(user, this.clock());
    const action = this.classifyComment(text);
    sup.comments += 1;
    this.state.counters.comments += 1;
    const points = this.addLove(this.cfg.scoring?.comment?.points ?? 5, sup);

    if (action === 'wish') {
      sup.wishes += 1;
      sup.lastWish = text;
      this.state.counters.wishes += 1;
      this.state.wishes.unshift({ user: user.name, avatar: user.avatar, text, at: this.clock() });
      if (this.state.wishes.length > MAX_WISHES) this.state.wishes.length = MAX_WISHES;
      if (!this.state.guests.some((g) => g.id === user.id)) this.seatGuest(user, 'wisher');
    } else if (action === 'photo') {
      this.state.counters.photos += 1;
    }

    // Read comments aloud (all / wishes only / off), spaced so TTS never floods the room.
    const read = this.cfg.comments?.readAloud || {};
    const mode = read.mode || 'all';
    let tts = '';
    if (clean && (mode === 'all' || (mode === 'wishes' && action === 'wish')) && this.clock() - this.lastWishTtsAt >= (read.minGapMs ?? 2500)) {
      this.lastWishTtsAt = this.clock();
      tts = `${user.name} ${action === 'wish' ? 'chúc' : 'nói'}: ${text}`;
    }
    this.log({ type: 'comment', action, user: user.name, text, points });
    this.emit(action, PRIORITY.comment, { user, text, tts, emojis }, action === 'wish' ? {} : { coalesceKey: action, merge: (_a, b) => b });
    return { ok: true, user, supporter: sup, points, action, text, meterExtra: { commentAction: action } };
  }

  onGift(e) {
    const user = this.normalizeUser(e.user);
    const sup = this.board.get(user, this.clock());
    const g = resolveGift(this.config.gifts, { ...(e.gift || {}), count: e.amount });
    const now = this.clock();
    sup.gifts += g.count;
    sup.diamonds += g.totalDiamonds;
    const rarityRank = { common: 0, rare: 1, epic: 2, legendary: 3 };
    if ((rarityRank[g.rarity] || 0) >= (rarityRank[sup.topRarity] || 0)) sup.topRarity = g.rarity;
    this.state.counters.gifts += g.count;
    this.state.counters.diamonds += g.totalDiamonds;
    for (const [k, v] of Object.entries(g.counters)) {
      this.state.counters[k] = (this.state.counters[k] || 0) + v;
      if (k === 'flowers') sup.flowers += v;
    }
    const stat = this.state.giftStats[g.key] || { key: g.key, label: g.label, count: 0, diamonds: 0, rarity: g.rarity };
    stat.count += g.count;
    stat.diamonds += g.totalDiamonds;
    this.state.giftStats[g.key] = stat;

    this.seatGuest(user, g.counters.flowers ? 'flower_giver' : 'gift_giver');
    const points = this.addLove(g.points, sup);

    // Presentation rules from gift config: chapter requirement + per-gift effect cooldown.
    let interaction = g.interaction;
    let bonusInteraction = g.bonusInteraction;
    let note = '';
    const reqIdx = g.chapterRequirement ? storyline.indexOfChapter(this.cfg.storyline, g.chapterRequirement) : -1;
    if (reqIdx > this.state.chapterIndex) {
      interaction = 'sparkle_shower';
      bonusInteraction = null;
      note = 'chapter_locked';
    } else if (g.cooldownMs > 0 && now - (this.giftEffectAt.get(g.key) || -Infinity) < g.cooldownMs) {
      interaction = 'sparkle_shower';
      bonusInteraction = null;
      note = 'cooldown';
    } else {
      this.giftEffectAt.set(g.key, now);
    }

    // Premium "major chapter interaction": push the story one step forward.
    let boost = false;
    if (g.chapterBoost && this.state.status === 'running' && !this.isFinale()) {
      const next = this.chapters()[this.state.chapterIndex + 1];
      if (this.state.love < Number(next.threshold)) this.state.love = Number(next.threshold);
      const cur = this.chapter();
      if (cur.requireObjective && !this.state.objectiveDone && cur.objective?.meter) this.handleFills(this.meters.fill(cur.objective.meter));
      boost = true;
    }

    const giftText = g.count > 1 ? `${g.count} ${g.label}` : g.label;
    const tts = g.announce ? `Cảm ơn ${user.name} đã tặng ${giftText} chúc mừng cô dâu chú rể!` : '';
    this.log({ type: 'gift', user: user.name, gift: g.label, count: g.count, diamonds: g.totalDiamonds, tier: g.tier, rarity: g.rarity, points, note, boost });
    const payload = {
      user,
      gift: { key: g.key, label: g.label, tier: g.tier, tierLabel: g.tierLabel, rarity: g.rarity, count: g.count, diamonds: g.totalDiamonds, points },
      interaction,
      bonusInteraction,
      sound: g.sound,
      note,
      boost,
      tts
    };
    const stackable = g.tier === 'small' && !bonusInteraction;
    this.emit(
      'gift',
      g.priority,
      payload,
      stackable
        ? { coalesceKey: `gift:${user.id}:${g.key}`, merge: (a, b) => ({ ...b, gift: { ...b.gift, count: a.gift.count + b.gift.count, points: a.gift.points + b.gift.points, diamonds: a.gift.diamonds + b.gift.diamonds } }) }
        : {}
    );
    return { ok: true, user, supporter: sup, points, ...g, interaction, meterExtra: { giftPoints: g.points, giftHappiness: g.happiness, giftKey: g.key, giftCount: g.count } };
  }

  // ------------------------------------------------------------------ story
  tick(now = this.clock()) {
    const st = this.state.status;
    if (st === 'ended') {
      this.mode.onTick(now);
      return;
    }
    if (st !== 'running') {
      this.lastTick = now;
      return;
    }
    if (this.lastTick) this.meters.decay((now - this.lastTick) / 60000);
    this.lastTick = now;
    this.mode.onTick(now);
    if (this.state.status !== 'running') return;
    const nextIdx = storyline.nextAutoIndex(this.cfg.storyline, this.state, now, { durationScale: this.mode.durationScale() });
    if (nextIdx !== null) this.enterChapter(nextIdx, { manual: false });
  }

  enterChapter(index, { manual = false } = {}) {
    const list = this.chapters();
    if (index < 0 || index >= list.length) throw new Error(`Chapter index out of range: ${index}`);
    const prevIndex = this.state.chapterIndex;
    const chapter = list[index];
    this.state.chapterIndex = index;
    this.state.chapterStartedAt = this.clock();
    this.state.objectiveDone = false;
    for (const id of chapter.meters || []) if (!this.meters.cfg(id)?.globalMeter) this.meters.reset(id);
    this.state.chapterHistory.push({ id: chapter.id, at: this.clock(), manual });
    if (this.state.chapterHistory.length > 50) this.state.chapterHistory.shift();
    if (chapter.reward?.happiness) this.handleFills(this.meters.add('happiness', Number(chapter.reward.happiness)));
    if (index === list.length - 1) this.state.completedAt = this.clock();
    this.logger?.info(`Chapter → ${chapter.order}. ${chapter.title}${manual ? ' (manual)' : ''}`);
    this.log({ type: 'chapter', chapter: chapter.id, title: chapter.title, manual });
    this.emit('chapter', PRIORITY.chapter, {
      index,
      prevIndex,
      manual,
      chapter: { ...chapter },
      summary: index === list.length - 1 ? this.summary() : null,
      tts: chapter.narration || ''
    });
    this.mode.onChapter(chapter, index);
    this.changed('chapter');
    return chapter;
  }

  // ------------------------------------------------------------------ admin
  start() {
    if (['idle', 'paused', 'ended'].includes(this.state.status)) {
      const wasIdle = this.state.status === 'idle';
      this.state.status = 'running';
      this.lastTick = this.clock();
      if (wasIdle) this.enterChapter(this.state.chapterIndex, { manual: true });
    }
    this.changed('status');
    return this.state.status;
  }

  pause() {
    if (this.state.status === 'running') this.state.status = 'paused';
    this.changed('status');
    return this.state.status;
  }

  /** Stop scoring until reset (used by timed modes when the round is over). */
  end() {
    this.state.status = 'ended';
    this.changed('status');
  }

  reset() {
    this.state = freshState(this.cfg, this.clock());
    this.state.status = 'running';
    this.meters.resetAll();
    this.board = new Leaderboard(() => this.cfg.leaderboard || {});
    this.giftEffectAt.clear();
    this.eventLog = [];
    this.lastTick = this.clock();
    this.mode.onReset();
    this.log({ type: 'reset', mode: this.mode.id });
    this.enterChapter(0, { manual: true });
    this.changed('reset');
    return this.state.status;
  }

  setMode(id) {
    this.mode = this.makeMode(id);
    this.reset();
    return this.mode.publicState();
  }

  setChapter(idOrIndex) {
    const idx = typeof idOrIndex === 'number' ? idOrIndex : storyline.indexOfChapter(this.cfg.storyline, idOrIndex);
    if (idx < 0) throw new Error(`Unknown chapter: ${idOrIndex}`);
    return this.enterChapter(idx, { manual: true });
  }

  nextChapter() {
    return this.setChapter(Math.min(this.state.chapterIndex + 1, this.chapterCount() - 1));
  }

  prevChapter() {
    return this.setChapter(Math.max(0, this.state.chapterIndex - 1));
  }

  restartChapter() {
    return this.setChapter(this.state.chapterIndex);
  }

  adjustScore({ delta, set, happiness, meter, meterValue, user } = {}) {
    if (Number.isFinite(Number(set))) this.state.love = Math.max(0, Math.round(Number(set)));
    if (Number.isFinite(Number(delta))) {
      if (user) {
        const sup = this.board.get(this.normalizeUser(user), this.clock());
        sup.points = Math.max(0, sup.points + Number(delta));
      }
      this.state.love = Math.max(0, this.state.love + Math.round(Number(delta)));
    }
    if (Number.isFinite(Number(happiness))) this.meters.setValue('happiness', Number(happiness));
    if (meter && Number.isFinite(Number(meterValue))) {
      if (!this.meters.cfg(meter)) throw new Error(`Unknown meter: ${meter}`);
      const m = this.meters.ensure(meter);
      if (Number(meterValue) >= m.max) this.handleFills(this.meters.fill(meter));
      else this.meters.setValue(meter, Number(meterValue));
    }
    this.board.checkLeader();
    this.log({ type: 'admin_score', delta, set, happiness, meter, meterValue });
    this.changed('score');
    return { love: this.state.love, happiness: this.meters.value('happiness') };
  }

  triggerEffect(effect, params = {}) {
    this.log({ type: 'admin_effect', effect });
    this.emit('effect', PRIORITY.manual, { effect, ...params });
    return { ok: true };
  }

  // ------------------------------------------------------------------ views
  leaderboard(limit) {
    return this.board.top(limit);
  }

  summary() {
    const c = this.state.counters;
    return {
      love: this.state.love,
      happiness: Math.round(this.meters.value('happiness')),
      guests: c.guests,
      flowers: c.flowers,
      gifts: c.gifts,
      diamonds: c.diamonds,
      likes: c.likes,
      comments: c.comments,
      shares: c.shares,
      wishes: c.wishes,
      supporters: this.board.count(),
      top: this.leaderboard(5),
      durationSec: Math.round((this.clock() - this.state.startedAt) / 1000)
    };
  }

  publicState() {
    const s = this.state;
    const chapter = this.chapter();
    const meters = this.meters.snapshot(chapter);
    const happiness = meters.find((m) => m.id === 'happiness');
    const support = meters.find((m) => m.id === 'support');
    return {
      status: s.status,
      couple: this.cfg.couple,
      theme: this.cfg.theme?.variant || 'luxury',
      love: s.love,
      happiness: happiness ? happiness.value : 0,
      happinessMax: happiness ? happiness.max : 100,
      support: support ? { value: support.value, goal: support.max, level: support.completions, pct: support.pct } : { value: 0, goal: 1, level: 0, pct: 0 },
      meters,
      counters: { ...s.counters },
      progress: storyline.progressInfo(this.cfg.storyline, s),
      chapterElapsedSec: Math.round((this.clock() - s.chapterStartedAt) / 1000),
      leaderboard: this.leaderboard(),
      giftStats: Object.values(s.giftStats).sort((a, b) => b.diamonds - a.diamonds).slice(0, 12),
      guests: s.guests.slice(-MAX_GUESTS),
      wishes: s.wishes.slice(0, 8),
      completedAt: s.completedAt,
      summary: s.completedAt ? this.summary() : null,
      mode: this.mode.publicState(),
      modes: listModes(),
      effects: this.cfg.effects,
      audio: this.cfg.audio
    };
  }
}

module.exports = { WeddingEngine, freshState, PRIORITY, STATE_VERSION };
