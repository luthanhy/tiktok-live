/**
 * Wedding Rush — the community must reach the Grand Finale before the clock runs out.
 * Chapters move faster (durationScale). Success or failure is shown, then the wedding restarts.
 */
const { GameMode } = require('./base');

class WeddingRushMode extends GameMode {
  static get id() {
    return 'wedding_rush';
  }
  static get label() {
    return 'Wedding Rush';
  }
  static get description() {
    return 'Hoàn thành đám cưới trước khi hết giờ!';
  }

  onReset() {
    this.startedAt = this.now();
    this.finishedAt = null;
    this.result = null;
    this.restartAt = null;
  }

  durationScale() {
    return Number(this.cfg.durationScale || 0.5);
  }

  remainingSec(now = this.now()) {
    const total = Number(this.cfg.durationSec || 900);
    const end = this.finishedAt || now;
    return Math.max(0, Math.round(total - (end - this.startedAt) / 1000));
  }

  onChapter(chapter, index) {
    if (this.result || index !== this.engine.chapterCount() - 1) return;
    this.finishedAt = this.now();
    const usedSec = Math.round((this.finishedAt - this.startedAt) / 1000);
    this.result = 'success';
    this.emit('mode_result', { success: true, title: 'Kịp giờ! Đám cưới hoàn hảo!', detail: `Hoàn thành trong ${Math.floor(usedSec / 60)} phút ${usedSec % 60} giây` }, 20);
  }

  onTick(now) {
    if (this.restartAt && now >= this.restartAt) {
      this.engine.reset();
      return;
    }
    if (this.result || this.remainingSec(now) > 0) return;
    this.result = 'fail';
    this.finishedAt = now;
    this.engine.end();
    this.restartAt = now + Number(this.cfg.resultHoldSec || 25) * 1000;
    this.emit('mode_result', { success: false, title: 'Hết giờ!', detail: 'Đám cưới chưa kịp hoàn thành — cùng thử lại nào!' }, 20);
  }

  publicState() {
    return { ...super.publicState(), remainingSec: this.remainingSec(), totalSec: Number(this.cfg.durationSec || 900), result: this.result };
  }

  serialize() {
    return { elapsedMs: this.now() - this.startedAt, result: this.result };
  }

  hydrate(d = {}) {
    this.onReset();
    this.startedAt = this.now() - Number(d.elapsedMs || 0);
    this.result = d.result || null;
    if (this.result) this.finishedAt = this.now();
  }
}

module.exports = { WeddingRushMode };
