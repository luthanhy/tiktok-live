/**
 * GameEvent — the platform-neutral event every source (TikTok, mock, RPC, tests) is converted to.
 *
 *   { type, user: {id, name, avatar}, amount, gift?, text?, timestamp, source, metadata }
 *
 * The game engine only ever sees GameEvents, so it never depends on TikTok payload details.
 */
const TYPES = new Set(['like', 'follow', 'share', 'comment', 'gift', 'join']);

function createGameEvent(raw = {}) {
  const type = String(raw.type || '').toLowerCase();
  if (!TYPES.has(type)) throw new Error(`Unsupported event type: ${raw.type}`);
  const u = raw.user || {};
  const user = {
    id: String(u.id || u.uniqueId || u.name || 'anonymous').slice(0, 64),
    name: String(u.name || u.nickname || u.id || 'Khách Mời').slice(0, 64),
    avatar: String(u.avatar || u.profilePictureUrl || '')
  };
  const evt = {
    type,
    user,
    amount: Math.max(1, Math.floor(Number(raw.amount ?? raw.count ?? raw.gift?.count ?? 1)) || 1),
    timestamp: Number(raw.timestamp) || Date.now(),
    source: raw.source || 'unknown',
    metadata: { ...(raw.metadata || {}) }
  };
  if (type === 'comment') evt.text = String(raw.text ?? raw.comment ?? '');
  if (type === 'gift') {
    const g = raw.gift || {};
    evt.gift = {
      id: Number(g.id) || 0,
      name: String(g.name || 'Gift'),
      diamonds: Math.max(1, Number(g.diamonds) || 1),
      count: evt.amount,
      image: String(g.image || '')
    };
  }
  return evt;
}

module.exports = { createGameEvent, EVENT_TYPES: [...TYPES] };
