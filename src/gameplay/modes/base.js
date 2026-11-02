/**
 * GameMode plugin contract. The engine calls these hooks; a mode never touches TikTok,
 * sockets or the DOM. Register new modes in ./index.js — no engine change needed.
 *
 *   onReset()                      fresh wedding started (also right after construction)
 *   onEvent(evt, info)             a GameEvent was scored ({user, supporter, points, action})
 *   onTick(now)                    once per second while running
 *   onChapter(chapter, index)      a chapter began
 *   durationScale()                multiplier for chapter minimum durations (Wedding Rush = faster)
 *   teamOf(userId)                 team id for seating / leaderboard tint, or ''
 *   publicState()                  what the overlay HUD needs
 *   serialize() / hydrate(data)    persistence across restarts
 */
class GameMode {
  constructor(engine) {
    this.engine = engine;
  }

  /** Read live so admin edits to `modes.<id>` apply without restarting the mode. */
  get cfg() {
    return this.engine.cfg.modes?.[this.id] || {};
  }

  static get id() {
    return 'base';
  }

  get id() {
    return this.constructor.id;
  }

  onReset() {}

  onEvent() {}

  onTick() {}

  onChapter() {}

  durationScale() {
    return 1;
  }

  teamOf() {
    return '';
  }

  publicState() {
    return { id: this.id, label: this.constructor.label, description: this.constructor.description };
  }

  serialize() {
    return {};
  }

  hydrate() {}

  emit(kind, payload, priority = 9) {
    this.engine.emit(kind, priority, { mode: this.id, ...payload });
  }

  now() {
    return this.engine.clock();
  }
}

module.exports = { GameMode };
