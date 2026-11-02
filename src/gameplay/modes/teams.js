/**
 * Two-team modes.
 *  - Bride vs Groom : viewers CHOOSE a side by commenting ("cô dâu" / "chú rể" …).
 *                     Their contribution powers their team for the whole wedding.
 *  - Love Race      : every viewer is auto-seated with the bride's or groom's family;
 *                     timed rounds, the winning family of each round earns bonus love.
 */
const { GameMode } = require('./base');

const SIDES = ['bride', 'groom'];

function hash(s) {
  let h = 0;
  for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

class TeamMode extends GameMode {
  onReset() {
    this.members = {};
    this.scores = { bride: 0, groom: 0 };
    this.leader = '';
  }

  teamLabel(side) {
    return this.cfg.teams?.[side]?.label || side;
  }

  teamOf(userId) {
    return this.members?.[userId] || '';
  }

  assign(user, side, supporter) {
    if (!SIDES.includes(side)) return false;
    const prev = this.members[user.id];
    this.members[user.id] = side;
    if (supporter) supporter.team = side;
    return prev !== side;
  }

  score(side, points) {
    if (!side || !(points > 0)) return;
    this.scores[side] += points;
    const lead = this.scores.bride === this.scores.groom ? '' : this.scores.bride > this.scores.groom ? 'bride' : 'groom';
    if (lead && lead !== this.leader) {
      const had = Boolean(this.leader);
      this.leader = lead;
      if (had) this.emit('team_lead', { team: lead, label: this.teamLabel(lead), scores: { ...this.scores } }, 6);
    }
  }

  teamsState() {
    const total = Math.max(1, this.scores.bride + this.scores.groom);
    const count = { bride: 0, groom: 0 };
    for (const side of Object.values(this.members)) count[side] += 1;
    return SIDES.map((side) => ({
      id: side,
      label: this.teamLabel(side),
      icon: this.cfg.teams?.[side]?.icon || '',
      score: Math.round(this.scores[side]),
      pct: Math.round((this.scores[side] / total) * 1000) / 10,
      members: count[side]
    }));
  }

  serialize() {
    return { members: this.members, scores: this.scores, leader: this.leader };
  }

  hydrate(d = {}) {
    this.onReset();
    Object.assign(this.members, d.members || {});
    Object.assign(this.scores, d.scores || {});
    this.leader = d.leader || '';
  }
}

class BrideVsGroomMode extends TeamMode {
  static get id() {
    return 'bride_vs_groom';
  }
  static get label() {
    return 'Nhà gái đấu nhà trai';
  }
  static get description() {
    return 'Bình luận "cô dâu" hoặc "chú rể" để chọn phe — phe nào yêu thương nhiều hơn sẽ thắng!';
  }

  pickSide(text) {
    const lower = String(text || '').toLowerCase();
    for (const side of SIDES) {
      if ((this.cfg.teams?.[side]?.keywords || []).some((k) => lower.includes(String(k).toLowerCase()))) return side;
    }
    return '';
  }

  onEvent(evt, { user, supporter, points }) {
    if (evt.type === 'comment') {
      const side = this.pickSide(evt.text);
      if (side && this.assign(user, side, supporter)) {
        this.emit('team_join', { user, team: side, label: this.teamLabel(side) }, 3);
      }
    }
    this.score(this.members[user.id], points);
  }

  onChapter(chapter, index) {
    const last = this.engine.chapterCount() - 1;
    if (index !== last) return;
    const winner = this.scores.bride === this.scores.groom ? '' : this.scores.bride > this.scores.groom ? 'bride' : 'groom';
    const bonus = Number(this.cfg.finaleBonus || 0);
    if (winner && bonus) this.engine.addLove(bonus);
    this.emit('mode_result', { success: true, title: winner ? `${this.teamLabel(winner)} chiến thắng!` : 'Hòa nhau — cả hai đều thắng!', team: winner, teams: this.teamsState() }, 20);
  }

  publicState() {
    return { ...super.publicState(), teams: this.teamsState(), leader: this.leader };
  }
}

class LoveRaceMode extends TeamMode {
  static get id() {
    return 'love_race';
  }
  static get label() {
    return 'Đua yêu thương hai họ';
  }
  static get description() {
    return 'Nhà Trai đấu Nhà Gái theo từng hiệp — hiệp nào yêu thương nhiều hơn sẽ nhận thưởng.';
  }

  onReset() {
    super.onReset();
    this.round = 1;
    this.roundStartedAt = this.now();
    this.roundScores = { bride: 0, groom: 0 };
    this.roundsWon = { bride: 0, groom: 0 };
  }

  onEvent(evt, { user, supporter, points }) {
    if (!this.members[user.id]) this.assign(user, hash(user.id) % 2 ? 'groom' : 'bride', supporter);
    const side = this.members[user.id];
    this.score(side, points);
    this.roundScores[side] += points;
  }

  onTick(now) {
    const len = Number(this.cfg.roundSec || 180) * 1000;
    if (now - this.roundStartedAt < len) return;
    const { bride, groom } = this.roundScores;
    const winner = bride === groom ? '' : bride > groom ? 'bride' : 'groom';
    if (winner) {
      this.roundsWon[winner] += 1;
      this.engine.addLove(Number(this.cfg.roundBonus || 0));
    }
    this.emit('round_end', { round: this.round, team: winner, label: winner ? this.teamLabel(winner) : 'Hòa', bonus: winner ? Number(this.cfg.roundBonus || 0) : 0, roundScores: { ...this.roundScores } }, 9);
    this.round += 1;
    this.roundStartedAt = now;
    this.roundScores = { bride: 0, groom: 0 };
  }

  publicState() {
    const len = Number(this.cfg.roundSec || 180);
    return {
      ...super.publicState(),
      teams: this.teamsState().map((t) => ({ ...t, roundScore: Math.round(this.roundScores[t.id]), roundsWon: this.roundsWon[t.id] })),
      leader: this.leader,
      round: this.round,
      roundRemainingSec: Math.max(0, Math.round(len - (this.now() - this.roundStartedAt) / 1000))
    };
  }

  serialize() {
    return { ...super.serialize(), round: this.round, roundScores: this.roundScores, roundsWon: this.roundsWon };
  }

  hydrate(d = {}) {
    super.hydrate(d);
    this.round = d.round || 1;
    this.roundStartedAt = this.now();
    this.roundScores = { bride: 0, groom: 0, ...(d.roundScores || {}) };
    this.roundsWon = { bride: 0, groom: 0, ...(d.roundsWon || {}) };
  }
}

module.exports = { BrideVsGroomMode, LoveRaceMode };
