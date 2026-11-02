/**
 * MeterManager — every community meter (Happiness, Community Support, Preparation, Ring,
 * Cake, Champagne, Dance, Celebration…) is one generic, config-driven meter:
 *
 *   sources : how much each GameEvent contributes
 *             like / follow / share / comment / join  — per event (like is per like)
 *             commentActions {action: n}               — extra for keyword comments
 *             giftPoints  (× gift points) · giftHappiness (× tier happiness) · giftKeys {key: n per unit}
 *   onFull  : bonusPoints, action, resetTo (0 = empty, 0<x<1 = fraction of max), growth, maxCap
 *   globalMeter : always active; otherwise only while the current chapter lists it
 *
 * Adding a meter is a config change only.
 */
class MeterManager {
  constructor(getConfig) {
    this.getConfig = getConfig;
    this.state = {};
  }

  cfg(id) {
    return (this.getConfig() || {})[id];
  }

  ids() {
    return Object.keys(this.getConfig() || {});
  }

  ensure(id) {
    const c = this.cfg(id);
    if (!c) return null;
    if (!this.state[id]) this.state[id] = { value: Number(c.initial || 0), max: Number(c.max) || 100, completions: 0 };
    return this.state[id];
  }

  hydrate(saved = {}) {
    this.state = {};
    for (const id of this.ids()) {
      this.ensure(id);
      if (saved[id]) Object.assign(this.state[id], saved[id]);
    }
  }

  reset(id) {
    const c = this.cfg(id);
    if (!c) return;
    this.state[id] = { value: Number(c.initial || 0), max: Number(c.max) || 100, completions: 0 };
  }

  resetAll() {
    this.state = {};
    for (const id of this.ids()) this.ensure(id);
  }

  isActive(id, chapter) {
    const c = this.cfg(id);
    return Boolean(c && (c.globalMeter || (chapter?.meters || []).includes(id)));
  }

  /** Contribution of one GameEvent to a meter's sources. */
  contribution(sources, evt, extra) {
    if (!sources) return 0;
    switch (evt.type) {
      case 'like':
        return Number(sources.like || 0) * evt.amount;
      case 'follow':
      case 'share':
      case 'join':
        return Number(sources[evt.type] || 0);
      case 'comment':
        return Number(sources.comment || 0) + Number(sources.commentActions?.[extra.commentAction] || 0);
      case 'gift':
        return (
          Number(sources.giftPoints || 0) * Number(extra.giftPoints || 0) +
          Number(sources.giftHappiness || 0) * Number(extra.giftHappiness || 0) +
          Number(sources.giftKeys?.[extra.giftKey] || 0) * Number(extra.giftCount || 1)
        );
      default:
        return 0;
    }
  }

  /** Apply an event to all active meters. Returns the list of meters that filled up. */
  apply(evt, chapter, extra = {}) {
    const fills = [];
    for (const id of this.ids()) {
      if (!this.isActive(id, chapter)) continue;
      const amount = this.contribution(this.cfg(id).sources, evt, extra);
      if (amount > 0) fills.push(...this.add(id, amount));
    }
    return fills;
  }

  add(id, amount) {
    const m = this.ensure(id);
    const c = this.cfg(id);
    if (!m || !(amount > 0)) return [];
    m.value += amount;
    const fills = [];
    let guard = 0;
    while (m.value >= m.max && guard++ < 20) {
      const of = c.onFull || {};
      const reached = m.max;
      m.completions += 1;
      const resetTo = Number(of.resetTo || 0);
      if (resetTo > 0 && resetTo < 1) {
        m.value = Math.round(m.max * resetTo * 10) / 10;
      } else {
        m.value -= m.max;
      }
      if (of.growth) m.max = Math.min(Number(of.maxCap) || Infinity, Math.round(m.max * Number(of.growth)));
      fills.push({ id, label: c.label, icon: c.icon, reached, completions: m.completions, bonus: Number(of.bonusPoints || 0), action: of.action || 'meter_full' });
      if (resetTo > 0 && resetTo < 1) break;
    }
    return fills;
  }

  /** Top up a meter so it fills exactly once (used by premium "chapter boost" gifts). */
  fill(id) {
    const m = this.ensure(id);
    return m ? this.add(id, Math.max(0, m.max - m.value)) : [];
  }

  decay(minutes) {
    for (const id of this.ids()) {
      const c = this.cfg(id);
      if (!c.decayPerMinute) continue;
      const m = this.ensure(id);
      m.value = Math.max(0, m.value - Number(c.decayPerMinute) * minutes);
    }
  }

  setValue(id, value) {
    const m = this.ensure(id);
    if (m) m.value = Math.max(0, Math.min(m.max - 0.01, Number(value)));
  }

  value(id) {
    return this.ensure(id)?.value || 0;
  }

  snapshot(chapter) {
    return this.ids().map((id) => {
      const c = this.cfg(id);
      const m = this.ensure(id);
      return {
        id,
        label: c.label,
        icon: c.icon,
        value: Math.round(m.value * 10) / 10,
        max: m.max,
        pct: Math.round(Math.min(100, (m.value / Math.max(1, m.max)) * 100) * 10) / 10,
        completions: m.completions,
        active: this.isActive(id, chapter),
        global: Boolean(c.globalMeter)
      };
    });
  }

  serialize() {
    return JSON.parse(JSON.stringify(this.state));
  }
}

module.exports = { MeterManager };
