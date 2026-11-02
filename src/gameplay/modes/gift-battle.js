/**
 * Gift Battle — timed rounds; the biggest contributor of each round is crowned
 * "Round Champion" on stage and earns bonus love for the couple.
 */
const { GameMode } = require('./base');

class GiftBattleMode extends GameMode {
  static get id() {
    return 'gift_battle';
  }
  static get label() {
    return 'Gift Battle';
  }
  static get description() {
    return 'Mỗi hiệp, người đóng góp nhiều nhất được vinh danh Round Champion.';
  }

  onReset() {
    this.round = 1;
    this.roundStartedAt = this.now();
    this.tally = {};
    this.champions = [];
  }

  onEvent(evt, { user, points }) {
    if (!(points > 0)) return;
    const t = (this.tally[user.id] = this.tally[user.id] || { id: user.id, name: user.name, avatar: user.avatar, points: 0 });
    t.points += points;
  }

  roundTop(n = 3) {
    return Object.values(this.tally)
      .sort((a, b) => b.points - a.points)
      .slice(0, n);
  }

  onTick(now) {
    const len = Number(this.cfg.roundSec || 120) * 1000;
    if (now - this.roundStartedAt < len) return;
    const [winner] = this.roundTop(1);
    if (winner) {
      this.champions.unshift({ round: this.round, ...winner });
      this.champions.length = Math.min(this.champions.length, 5);
      this.engine.addLove(Number(this.cfg.winnerBonus || 0));
    }
    this.emit('round_end', { round: this.round, champion: winner || null, bonus: winner ? Number(this.cfg.winnerBonus || 0) : 0 }, 9);
    this.round += 1;
    this.roundStartedAt = now;
    this.tally = {};
  }

  publicState() {
    const len = Number(this.cfg.roundSec || 120);
    return {
      ...super.publicState(),
      round: this.round,
      roundRemainingSec: Math.max(0, Math.round(len - (this.now() - this.roundStartedAt) / 1000)),
      roundTop: this.roundTop(3).map((t) => ({ ...t, points: Math.round(t.points) })),
      champions: this.champions
    };
  }

  serialize() {
    return { round: this.round, tally: this.tally, champions: this.champions };
  }

  hydrate(d = {}) {
    this.onReset();
    this.round = d.round || 1;
    this.tally = d.tally || {};
    this.champions = d.champions || [];
  }
}

module.exports = { GiftBattleMode };
