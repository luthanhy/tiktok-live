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
      const override = readJson(file);
      if (name === 'wedding' && migrateToVietnamese(override, this.defaults.wedding)) {
        fs.writeFileSync(file, JSON.stringify(override, null, 2), 'utf8');
        logger.info('Saved wedding config migrated to the Vietnamese storyline');
      }
      return deepMerge(base, override);
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

const LEGACY_EN = new Set(['WEDDING LIVE – THE BIG DAY', '#TheBigDay', 'Happiness', 'Community Support', 'Ring Meter', 'Champagne', 'Sàn nhảy', 'Celebration']);

/**
 * Overrides saved before the Vietnamese edition (no `locale: 'vi'`) still carry the old
 * English chapter titles, Western music and the European default theme. Bring their
 * story text, music and labels to the Vietnamese defaults; keep thresholds, timings and
 * everything else the streamer tuned. Returns true when the override changed.
 */
function migrateToVietnamese(override, defaults) {
  if (!isPlainObject(override) || override.locale === 'vi') return false;
  const byId = new Map(defaults.storyline.chapters.map((c) => [c.id, c]));
  for (const ch of override.storyline?.chapters || []) {
    const d = byId.get(ch.id);
    if (d) for (const k of ['title', 'subtitle', 'narration', 'goalHint', 'music']) ch[k] = d[k];
  }
  for (const [id, m] of Object.entries(override.meters || {})) {
    if (LEGACY_EN.has(m?.label) && defaults.meters[id]) Object.assign(m, { label: defaults.meters[id].label, icon: defaults.meters[id].icon });
  }
  if (override.couple) for (const k of ['weddingTitle', 'hashtag']) if (LEGACY_EN.has(override.couple[k])) override.couple[k] = defaults.couple[k];
  if (override.theme?.variant === 'luxury') override.theme.variant = defaults.theme.variant;
  override.locale = 'vi';
  return true;
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

module.exports = { ConfigStore, deepMerge, migrateToVietnamese };
