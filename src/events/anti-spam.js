/**
 * Anti-spam gate that runs before any gameplay logic.
 * Paid gifts are never rejected; likes are aggregated downstream instead of blocked.
 */
const MAX_TRACKED = 3000;

function prune(map) {
  if (map.size <= MAX_TRACKED) return;
  const drop = map.size - MAX_TRACKED;
  let i = 0;
  for (const key of map.keys()) {
    if (i++ >= drop) break;
    map.delete(key);
  }
}

class AntiSpam {
  /** @param {() => object} getConfig returns the `antiSpam` config section (read live so admin edits apply instantly) */
  constructor(getConfig, clock = Date.now) {
    this.getConfig = getConfig;
    this.clock = clock;
    this.lastComment = new Map();
    this.lastCommentText = new Map();
    this.lastFollow = new Map();
    this.lastShare = new Map();
    this.userWindow = new Map();
    this.stats = { accepted: 0, rejected: 0, reasons: {} };
  }

  reject(reason) {
    this.stats.rejected += 1;
    this.stats.reasons[reason] = (this.stats.reasons[reason] || 0) + 1;
    return { ok: false, reason };
  }

  accept() {
    this.stats.accepted += 1;
    return { ok: true };
  }

  check(evt) {
    const cfg = this.getConfig() || {};
    const now = this.clock();
    const uid = evt.user?.id || evt.user?.name || 'anon';

    if (evt.type === 'gift' || evt.type === 'like' || evt.type === 'viewers') return this.accept();

    if (!this.withinUserRate(uid, now, cfg.maxEventsPerUserPerMinute || 20)) {
      return this.reject('user_rate_limit');
    }

    if (evt.type === 'comment') {
      const last = this.lastComment.get(uid);
      if (last !== undefined && now - last < (cfg.commentCooldownMs ?? 3500)) return this.reject('comment_cooldown');
      const norm = String(evt.text || '').toLowerCase().replace(/\s+/g, ' ').trim();
      const prev = this.lastCommentText.get(uid);
      if (prev && prev.text === norm && now - prev.ts < (cfg.duplicateCommentWindowMs ?? 20000)) {
        return this.reject('duplicate_comment');
      }
      this.lastComment.set(uid, now);
      this.lastCommentText.set(uid, { text: norm, ts: now });
      prune(this.lastComment);
      prune(this.lastCommentText);
    } else if (evt.type === 'follow') {
      const last = this.lastFollow.get(uid);
      if (last !== undefined && now - last < (cfg.followDedupWindowMs ?? 600000)) return this.reject('duplicate_follow');
      this.lastFollow.set(uid, now);
      prune(this.lastFollow);
    } else if (evt.type === 'share') {
      const last = this.lastShare.get(uid);
      if (last !== undefined && now - last < (cfg.shareCooldownMs ?? 15000)) return this.reject('share_cooldown');
      this.lastShare.set(uid, now);
      prune(this.lastShare);
    }
    return this.accept();
  }

  withinUserRate(uid, now, limit) {
    const windowStart = now - 60000;
    const arr = (this.userWindow.get(uid) || []).filter((t) => t > windowStart);
    if (arr.length >= limit) {
      this.userWindow.set(uid, arr);
      return false;
    }
    arr.push(now);
    this.userWindow.set(uid, arr);
    prune(this.userWindow);
    return true;
  }

  reset() {
    this.lastComment.clear();
    this.lastCommentText.clear();
    this.lastFollow.clear();
    this.lastShare.clear();
    this.userWindow.clear();
    this.stats = { accepted: 0, rejected: 0, reasons: {} };
  }
}

module.exports = { AntiSpam };
