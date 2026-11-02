/**
 * Game mode registry. To add a mode: create a GameMode subclass and list it here.
 */
const { GameMode } = require('./base');
const { BrideVsGroomMode, LoveRaceMode } = require('./teams');
const { WeddingRushMode } = require('./wedding-rush');
const { GiftBattleMode } = require('./gift-battle');
const { PerfectWeddingMode } = require('./perfect-wedding');

class ClassicMode extends GameMode {
  static get id() {
    return 'classic';
  }
  static get label() {
    return 'Đám cưới truyền thống';
  }
  static get description() {
    return 'Cả cộng đồng cùng tổ chức đám cưới qua 7 chương.';
  }
}

const MODES = [ClassicMode, BrideVsGroomMode, LoveRaceMode, WeddingRushMode, GiftBattleMode, PerfectWeddingMode];
const REGISTRY = Object.fromEntries(MODES.map((M) => [M.id, M]));

function createMode(id, engine) {
  const M = REGISTRY[id] || ClassicMode;
  return new M(engine);
}

function listModes() {
  return MODES.map((M) => ({ id: M.id, label: M.label, description: M.description }));
}

module.exports = { createMode, listModes, REGISTRY };
