/**
 * Chapter state machine (pure — no I/O, no timers).
 * The wedding engine owns the mutable state; these helpers decide what the
 * story should do given that state and the current config.
 */
function sortedChapters(storylineCfg) {
  return [...(storylineCfg?.chapters || [])].sort((a, b) => a.order - b.order);
}

function chapterAt(storylineCfg, index) {
  const list = sortedChapters(storylineCfg);
  return list[Math.max(0, Math.min(list.length - 1, index))];
}

function indexOfChapter(storylineCfg, id) {
  return sortedChapters(storylineCfg).findIndex((c) => c.id === id);
}

/** Highest chapter index whose threshold the love score has reached. */
function reachableIndex(storylineCfg, love) {
  const list = sortedChapters(storylineCfg);
  let idx = 0;
  list.forEach((c, i) => {
    if (love >= Number(c.threshold)) idx = i;
  });
  return idx;
}

/**
 * Should the story auto-advance right now? Advances one chapter at a time so
 * every chapter's cinematic gets its minimum screen time, even after a huge gift.
 * @returns {number|null} index to advance to
 */
function nextAutoIndex(storylineCfg, { chapterIndex, chapterStartedAt, love, status, objectiveDone }, now = Date.now(), { durationScale = 1 } = {}) {
  if (status !== 'running' || storylineCfg?.autoAdvance === false) return null;
  const list = sortedChapters(storylineCfg);
  if (chapterIndex >= list.length - 1) return null;
  const current = list[chapterIndex];
  const elapsedSec = (now - chapterStartedAt) / 1000;
  if (elapsedSec < Number(current.minDurationSec || 0) * durationScale) return null;
  // e.g. the rings must actually be exchanged (Ring Meter filled) before the kiss.
  if (current.requireObjective && !objectiveDone) return null;
  const next = list[chapterIndex + 1];
  return love >= Number(next.threshold) ? chapterIndex + 1 : null;
}

function progressInfo(storylineCfg, { chapterIndex, love, objectiveDone }) {
  const list = sortedChapters(storylineCfg);
  const current = list[chapterIndex] || list[0];
  const next = list[chapterIndex + 1] || null;
  const from = Number(current.threshold);
  let pct = 100;
  if (next) {
    const span = Math.max(1, Number(next.threshold) - from);
    pct = Math.max(0, Math.min(100, ((love - from) / span) * 100));
  }
  const total = list.length > 0 ? Number(list[list.length - 1].threshold) || 1 : 1;
  return {
    index: chapterIndex,
    count: list.length,
    current: current
      ? {
          id: current.id,
          title: current.title,
          subtitle: current.subtitle,
          scene: current.scene,
          order: current.order,
          goalHint: current.goalHint,
          meters: current.meters || [],
          objective: current.objective || { meter: 'love' },
          requireObjective: Boolean(current.requireObjective),
          objectiveDone: Boolean(objectiveDone)
        }
      : null,
    next: next ? { id: next.id, title: next.title, subtitle: next.subtitle, threshold: Number(next.threshold) } : null,
    pointsToNext: next ? Math.max(0, Number(next.threshold) - love) : 0,
    chapterPct: Math.round(pct * 10) / 10,
    overallPct: Math.round(Math.min(100, (love / total) * 100) * 10) / 10,
    chapters: list.map((c, i) => ({
      id: c.id,
      order: c.order,
      title: c.title,
      subtitle: c.subtitle,
      threshold: Number(c.threshold),
      scene: c.scene,
      state: i < chapterIndex ? 'done' : i === chapterIndex ? 'active' : love >= Number(c.threshold) ? 'ready' : 'locked'
    }))
  };
}

module.exports = { sortedChapters, chapterAt, indexOfChapter, reachableIndex, nextAutoIndex, progressInfo };
