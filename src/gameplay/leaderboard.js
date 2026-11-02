/**
 * Leaderboard — per-viewer contribution, ranks, medals and badges.
 * Bounded memory for multi-hour streams: beyond `maxTracked` viewers the lowest
 * contributors are pruned (they can come back by contributing again).
 */
const MEDALS = ['🥇', '🥈', '🥉'];

class Leaderboard {
  constructor(getConfig) {
    this.getConfig = getConfig || (() => ({}));
    this.supporters = {};
    this.leaderId = null;
  }

  hydrate(saved = {}) {
    this.supporters = { ...(saved.supporters || {}) };
    this.leaderId = saved.leaderId || null;
  }

  get(user, now = Date.now()) {
    let s = this.supporters[user.id];
    if (!s) {
      // Make room *before* inserting, so the newcomer (0 points) is never the one evicted.
      this.prune(1);
      s = this.supporters[user.id] = { id: user.id, name: user.name, avatar: user.avatar, points: 0, gifts: 0, diamonds: 0, flowers: 0, likes: 0, wishes: 0, comments: 0, lastWish: '', topRarity: '', team: '', joinedAt: now };
    }
    s.name = user.name;
    if (user.avatar) s.avatar = user.avatar;
    s.lastSeen = now;
    return s;
  }

  /** Evict the lowest contributors so that `incoming` new entries still fit under maxTracked. */
  prune(incoming = 0) {
    const max = Number(this.getConfig().maxTracked) || 5000;
    const ids = Object.keys(this.supporters);
    const excess = ids.length + incoming - max;
    if (excess <= 0) return;
    // Evict ~10% extra at once so a flood of new viewers doesn't sort on every insert.
    const evict = Math.min(ids.length, excess + Math.floor(max * 0.1));
    const sorted = ids.sort((a, b) => this.supporters[a].points - this.supporters[b].points || this.supporters[a].lastSeen - this.supporters[b].lastSeen);
    for (const id of sorted.slice(0, evict)) delete this.supporters[id];
  }

  count() {
    return Object.keys(this.supporters).length;
  }

  roleOf(s, rank) {
    if (rank === 0) return 'special_guest';
    if (s.diamonds >= 100) return 'gift_giver';
    if (s.flowers > 0) return 'flower_giver';
    if (s.wishes > 0) return 'wisher';
    return 'guest';
  }

  badgeOf(s, rank) {
    if (rank < 3) return MEDALS[rank];
    if (s.topRarity === 'legendary') return '👑';
    if (s.topRarity === 'epic') return '💎';
    if (s.flowers >= 10) return '🌹';
    if (s.wishes >= 3) return '💌';
    return '⭐';
  }

  top(limit) {
    const n = limit || Number(this.getConfig().size) || 10;
    return Object.values(this.supporters)
      .filter((s) => s.points > 0)
      .sort((a, b) => b.points - a.points || a.joinedAt - b.joinedAt)
      .slice(0, n)
      .map((s, i) => ({ rank: i + 1, id: s.id, name: s.name, avatar: s.avatar, points: s.points, gifts: s.gifts, diamonds: s.diamonds, flowers: s.flowers, role: this.roleOf(s, i), badge: this.badgeOf(s, i), team: s.team || '' }));
  }

  /** Returns the new leader when the #1 spot changed hands (null otherwise). */
  checkLeader() {
    const top = this.top(1)[0];
    if (!top || top.id === this.leaderId) return null;
    const hadLeader = Boolean(this.leaderId);
    this.leaderId = top.id;
    return hadLeader ? top : null;
  }

  serialize() {
    return { supporters: this.supporters, leaderId: this.leaderId };
  }
}

module.exports = { Leaderboard, MEDALS };
