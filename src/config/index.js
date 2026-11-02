/**
 * Config store.
 * Defaults ship in src/config/*.json; admin edits are persisted as overrides in
 * data/config/*.json so a `git pull` never clobbers a streamer's tuning.
 */
const fs = require('fs');
const path = require('path');
const logger = require('../core/logger').child('config');

const DEFAULT_DIR = __dirname;
const FILES = {
  wedding: 'wedding.config.json',
  gifts: 'gifts.config.json'
};

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

/** Deep merge where arrays are replaced wholesale (chapters / gift lists are edited as a unit). */
function deepMerge(base, patch) {
  if (!isPlainObject(base) || !isPlainObject(patch)) return patch === undefined ? base : patch;
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = isPlainObject(v) && isPlainObject(base[k]) ? deepMerge(base[k], v) : v;
  }
  return out;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

class ConfigStore {
  constructor({ overrideDir } = {}) {
    this.overrideDir = overrideDir;
    this.listeners = new Set();
    this.defaults = {};
    this.values = {};
    for (const [name, file] of Object.entries(FILES)) {
      this.defaults[name] = readJson(path.join(DEFAULT_DIR, file));
      this.values[name] = this.loadWithOverride(name);
    }
    validateWedding(this.values.wedding);
    validateGifts(this.values.gifts);
  }

  overridePath(name) {
    return this.overrideDir ? path.join(this.overrideDir, FILES[name]) : null;
  }

  loadWithOverride(name) {
    const file = this.overridePath(name);
    const base = JSON.parse(JSON.stringify(this.defaults[name]));
    if (!file || !fs.existsSync(file)) return base;
    try {
      return deepMerge(base, readJson(file));
    } catch (err) {
      logger.warn(`Override ${file} unreadable, using defaults: ${err.message}`);
      return base;
    }
  }

  get wedding() {
    return this.values.wedding;
  }

  get gifts() {
    return this.values.gifts;
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Apply a partial update to one config document, validate, persist, notify. */
  update(name, patch) {
    if (!FILES[name]) throw new Error(`Unknown config section: ${name}`);
    const next = deepMerge(this.values[name], patch || {});
    if (name === 'wedding') validateWedding(next);
    if (name === 'gifts') validateGifts(next);
    this.values[name] = next;
    this.persist(name);
    for (const fn of this.listeners) fn(name, next);
    return next;
  }

  /** Drop overrides for one document and go back to shipped defaults. */
  restoreDefaults(name) {
    const file = this.overridePath(name);
    if (file && fs.existsSync(file)) fs.unlinkSync(file);
    this.values[name] = JSON.parse(JSON.stringify(this.defaults[name]));
    for (const fn of this.listeners) fn(name, this.values[name]);
    return this.values[name];
  }

  persist(name) {
    const file = this.overridePath(name);
    if (!file) return;
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(this.values[name], null, 2), 'utf8');
    } catch (err) {
      logger.error(`Could not persist ${name} config: ${err.message}`);
    }
  }
}

function validateWedding(cfg) {
  const chapters = cfg?.storyline?.chapters;
  if (!Array.isArray(chapters) || chapters.length === 0) {
    throw new Error('storyline.chapters must be a non-empty array');
  }
  const ids = new Set();
  let last = -1;
  for (const ch of [...chapters].sort((a, b) => a.order - b.order)) {
    if (!ch.id || ids.has(ch.id)) throw new Error(`Chapter id missing or duplicated: ${ch.id}`);
    ids.add(ch.id);
    const t = Number(ch.threshold);
    if (!Number.isFinite(t) || t < 0) throw new Error(`Chapter ${ch.id} has invalid threshold`);
    if (t < last) throw new Error(`Chapter ${ch.id} threshold must not be lower than the previous chapter`);
    last = t;
  }
}

function validateGifts(cfg) {
  if (!Array.isArray(cfg?.tiers) || cfg.tiers.length === 0) throw new Error('gifts.tiers must be a non-empty array');
  for (const tier of cfg.tiers) {
    if (!tier.id || !Number.isFinite(Number(tier.minDiamonds))) throw new Error(`Invalid gift tier: ${JSON.stringify(tier)}`);
  }
  if (!Array.isArray(cfg.gifts)) throw new Error('gifts.gifts must be an array');
  for (const g of cfg.gifts) {
    if (!g.key) throw new Error('Every gift mapping needs a key');
  }
}

module.exports = { ConfigStore, deepMerge };
