/**
 * Presentation queue: decouples how fast TikTok fires events from how fast the
 * stage can animate them.
 *  - priority ordering (chapter transitions & premium gifts jump the line)
 *  - coalescing (e.g. 40 like packets from one viewer become one "hearts x40" action)
 *  - bounded size with lowest-priority eviction
 *  - paced dispatch (N actions per tick) so effects never pile up on top of each other
 */
class PresentationQueue {
  constructor({ getConfig, onDispatch, logger } = {}) {
    this.getConfig = getConfig || (() => ({}));
    this.onDispatch = onDispatch || (() => {});
    this.logger = logger;
    this.items = [];
    this.seq = 0;
    this.timer = null;
    this.paused = false;
    this.stats = { pushed: 0, coalesced: 0, dropped: 0, dispatched: 0 };
  }

  get size() {
    return this.items.length;
  }

  /**
   * @param {{kind:string, priority?:number, coalesceKey?:string, merge?:(a:object,b:object)=>object, payload:object}} item
   * @returns {boolean} false when the item was dropped
   */
  push(item) {
    const cfg = this.getConfig() || {};
    const maxSize = cfg.maxSize || 200;
    this.stats.pushed += 1;
    const entry = { priority: 0, ...item, seq: ++this.seq, enqueuedAt: Date.now() };

    if (entry.coalesceKey) {
      const existing = this.items.find((it) => it.coalesceKey === entry.coalesceKey);
      if (existing) {
        existing.payload = entry.merge ? entry.merge(existing.payload, entry.payload) : entry.payload;
        existing.priority = Math.max(existing.priority, entry.priority);
        this.stats.coalesced += 1;
        return true;
      }
    }

    if (this.items.length >= maxSize) {
      let lowestIdx = 0;
      for (let i = 1; i < this.items.length; i++) {
        const a = this.items[i];
        const b = this.items[lowestIdx];
        if (a.priority < b.priority || (a.priority === b.priority && a.seq < b.seq)) lowestIdx = i;
      }
      if (this.items[lowestIdx].priority > entry.priority) {
        this.stats.dropped += 1;
        return false;
      }
      this.items.splice(lowestIdx, 1);
      this.stats.dropped += 1;
    }

    // Insert keeping (priority desc, seq asc)
    let idx = this.items.findIndex((it) => it.priority < entry.priority);
    if (idx === -1) idx = this.items.length;
    this.items.splice(idx, 0, entry);
    return true;
  }

  /** Take up to n items off the head and hand them to onDispatch. */
  drain(n) {
    const out = this.items.splice(0, Math.max(0, n));
    for (const it of out) {
      this.stats.dispatched += 1;
      try {
        this.onDispatch({ kind: it.kind, priority: it.priority, ...it.payload, queuedMs: Date.now() - it.enqueuedAt });
      } catch (err) {
        this.logger?.error(`dispatch failed for ${it.kind}: ${err.message}`);
      }
    }
    return out.length;
  }

  start() {
    this.stop();
    const cfg = this.getConfig() || {};
    const tick = () => {
      const c = this.getConfig() || {};
      if (!this.paused) this.drain(c.maxBurst || 3);
      this.timer = setTimeout(tick, c.dispatchIntervalMs || 350);
    };
    this.timer = setTimeout(tick, cfg.dispatchIntervalMs || 350);
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  clear() {
    const n = this.items.length;
    this.items = [];
    return n;
  }

  snapshot() {
    return {
      size: this.items.length,
      paused: this.paused,
      ...this.stats,
      head: this.items.slice(0, 8).map((it) => ({ kind: it.kind, priority: it.priority }))
    };
  }
}

module.exports = { PresentationQueue };
