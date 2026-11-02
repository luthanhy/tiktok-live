/**
 * Perfect Wedding — every chapter must be completed within its time limit.
 * Each miss is a "mistake"; too many mistakes and the wedding must start over.
 * Reaching the finale with zero mistakes earns the perfect-wedding title.
 */
const { GameMode } = require('./base');

class PerfectWeddingMode extends GameMode {
  static get id() {
    return 'perfect_wedding';
  }
  static get label() {
    return 'Đám cưới đúng giờ lành';
  }
  static get description() {
    return 'Hoàn thành từng chương đúng giờ — tối đa 3 lỗi!';
  }

  onReset() {
    this.mistakes = 0;
    this.chapterDeadline = this.now() + this.limitMs();
    this.result = null;
    this.restartAt = null;
  }

  limitMs() {
    return Number(this.cfg.chapterLimitSec || 240) * 1000;
  }

  onChapter(chapter, index) {
    this.chapterDeadline = this.now() + this.limitMs();
    if (this.result || index !== this.engine.chapterCount() - 1) return;
    this.result = 'success';
    this.emit('mode_result', { success: true, title: this.mistakes === 0 ? 'ĐÚNG GIỜ LÀNH, TRỌN VẸN!' : 'Đám cưới hoàn thành!', detail: `${this.mistakes} lỗi`, mistakes: this.mistakes }, 20);
  }

  onTick(now) {
    if (this.restartAt && now >= this.restartAt) {
      this.engine.reset();
      return;
    }
    if (this.result || this.engine.isFinale() || now < this.chapterDeadline) return;
    this.mistakes += 1;
    this.chapterDeadline = now + this.limitMs();
    const max = Number(this.cfg.maxMistakes || 3);
    if (this.mistakes >= max) {
      this.result = 'fail';
      this.engine.end();
      this.restartAt = now + Number(this.cfg.resultHoldSec || 25) * 1000;
      this.emit('mode_result', { success: false, title: 'Đám cưới bị hoãn!', detail: `Đã trễ giờ ${this.mistakes} lần`, mistakes: this.mistakes }, 20);
    } else {
      this.emit('mode_mistake', { mistakes: this.mistakes, max, title: 'Trễ giờ nghi lễ!' }, 9);
    }
  }

  publicState() {
    return {
      ...super.publicState(),
      mistakes: this.mistakes,
      maxMistakes: Number(this.cfg.maxMistakes || 3),
      chapterRemainingSec: this.result ? 0 : Math.max(0, Math.round((this.chapterDeadline - this.now()) / 1000)),
      result: this.result
    };
  }

  serialize() {
    return { mistakes: this.mistakes, result: this.result };
  }

  hydrate(d = {}) {
    this.onReset();
    this.mistakes = d.mistakes || 0;
    this.result = d.result || null;
  }
}

module.exports = { PerfectWeddingMode };
