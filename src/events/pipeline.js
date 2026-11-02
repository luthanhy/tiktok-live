/**
 * Ingest pipeline:  source adapter → GameEvent → moderation → anti-spam → batching → game engine
 *
 * Likes are the firehose of a TikTok Live (hundreds per second in a busy room). They are
 * aggregated per viewer over a short window so 100 like packets become ONE engine call
 * ("+100 love") and later ONE controlled visual effect.
 */
const { createGameEvent } = require('./game-event');
const { isBlockedSpamOrToxic } = require('./sanitizer');

const RATE_WINDOW_MS = 10000;

class EventPipeline {
  constructor({ engine, antiSpam, getConfig, logger, onRejected, onProcessed, clock } = {}) {
    this.engine = engine;
    this.antiSpam = antiSpam;
    this.getConfig = getConfig || (() => ({}));
    this.logger = logger;
    this.onRejected = onRejected || (() => {});
    this.onProcessed = onProcessed || (() => {});
    this.clock = clock || Date.now;
    this.likeBuffers = new Map();
    this.recent = [];
    this.stats = { received: 0, processed: 0, rejected: 0, batchedLikes: 0, byType: {}, lastEvent: null };
  }

  /** Accepts any raw event object; returns a verdict ({ok, reason?, batched?}). */
  publish(raw) {
    let evt;
    try {
      evt = createGameEvent(raw);
    } catch (err) {
      this.stats.rejected += 1;
      return { ok: false, reason: 'invalid_event', error: err.message };
    }
    const now = this.clock();
    this.stats.received += 1;
    this.stats.byType[evt.type] = (this.stats.byType[evt.type] || 0) + 1;
    this.stats.lastEvent = { type: evt.type, user: evt.user.name, amount: evt.amount, at: now, source: evt.source };
    this.recent.push(now);
    if (this.recent.length > 20000) this.recent.splice(0, this.recent.length - 20000);

    if (evt.type === 'comment' && isBlockedSpamOrToxic(evt.text)) return this.reject(evt, 'toxic_or_spam');
    const verdict = this.antiSpam.check(evt);
    if (!verdict.ok) return this.reject(evt, verdict.reason);

    if (evt.type === 'like') return this.bufferLike(evt);
    return this.process(evt);
  }

  reject(evt, reason) {
    this.stats.rejected += 1;
    if (this.antiSpam && reason === 'toxic_or_spam') this.antiSpam.reject(reason);
    this.onRejected(evt, reason);
    return { ok: false, reason };
  }

  bufferLike(evt) {
    const windowMs = Number(this.getConfig().likeAggregateWindowMs ?? 800);
    if (windowMs <= 0) return this.process(evt);
    const key = evt.user.id;
    const buf = this.likeBuffers.get(key);
    if (buf) {
      buf.evt.amount += evt.amount;
      buf.packets += 1;
      this.stats.batchedLikes += 1;
      return { ok: true, batched: true };
    }
    const entry = { evt: { ...evt }, packets: 1 };
    entry.timer = setTimeout(() => this.flushLike(key), windowMs);
    this.likeBuffers.set(key, entry);
    return { ok: true, batched: true };
  }

  flushLike(key) {
    const entry = this.likeBuffers.get(key);
    if (!entry) return;
    clearTimeout(entry.timer);
    this.likeBuffers.delete(key);
    entry.evt.metadata = { ...entry.evt.metadata, packets: entry.packets };
    this.process(entry.evt);
  }

  flushAll() {
    for (const key of [...this.likeBuffers.keys()]) this.flushLike(key);
  }

  process(evt) {
    let result;
    try {
      result = this.engine.handle(evt);
    } catch (err) {
      this.logger?.error(`Engine failed on ${evt.type}: ${err.message}`);
      return { ok: false, reason: 'engine_error', error: err.message };
    }
    this.stats.processed += 1;
    this.onProcessed(evt, result);
    return result;
  }

  /** Events per second over the last 10 s (what the admin "event rate" shows). */
  rate() {
    const cutoff = this.clock() - RATE_WINDOW_MS;
    let i = 0;
    while (i < this.recent.length && this.recent[i] < cutoff) i += 1;
    if (i) this.recent.splice(0, i);
    return Math.round((this.recent.length / (RATE_WINDOW_MS / 1000)) * 10) / 10;
  }

  snapshot() {
    return { ...this.stats, ratePerSec: this.rate(), pendingLikeBuffers: this.likeBuffers.size };
  }

  reset() {
    for (const e of this.likeBuffers.values()) clearTimeout(e.timer);
    this.likeBuffers.clear();
    this.recent = [];
    this.stats = { received: 0, processed: 0, rejected: 0, batchedLikes: 0, byType: {}, lastEvent: null };
  }
}

module.exports = { EventPipeline };
