/**
 * Converts raw tiktok-live-connector payloads into the app's normalized event shape:
 *   { type: 'like'|'follow'|'share'|'comment'|'gift'|'join', user:{id,name,avatar}, ...fields, source }
 * Pure functions (plus a small combo tracker) so they can be unit-tested with captured payloads.
 */

/** Preserved from the original project: covers the v1 and v2 connector payload shapes. */
function extractUser(data) {
  const u = data?.user || data || {};
  const id = u.uniqueId || u.displayId || data?.uniqueId || u.userId || '';
  const name = u.nickname || id || data?.nickname || 'Khách Mời';
  const avatar =
    u.profilePictureUrl ||
    u.avatarLarge?.urlList?.[0] ||
    u.avatarThumb?.urlList?.[0] ||
    u.avatarMedium?.urlList?.[0] ||
    data?.profilePictureUrl ||
    '';
  return { id: String(id || name), name: String(name), avatar: String(avatar) };
}

function chat(data) {
  return { type: 'comment', user: extractUser(data), text: String(data?.content || data?.comment || ''), source: 'tiktok' };
}

function like(data) {
  return { type: 'like', user: extractUser(data), count: Math.max(1, Number(data?.likeCount ?? data?.count ?? 1)), source: 'tiktok' };
}

function member(data) {
  return { type: 'join', user: extractUser(data), source: 'tiktok' };
}

function follow(data) {
  return { type: 'follow', user: extractUser(data), source: 'tiktok' };
}

function share(data) {
  return { type: 'share', user: extractUser(data), source: 'tiktok' };
}

/** The SOCIAL message carries both follows and shares; returns null for other social actions. */
function social(data) {
  const action = String(data?.action ?? '');
  const disp = String(data?.common?.displayText?.displayType || data?.displayType || '').toLowerCase();
  if (disp.includes('follow') || action === '1') return follow(data);
  if (disp.includes('share') || action === '3') return share(data);
  return null;
}

/**
 * Streakable gifts (e.g. Rose) arrive as a sequence of packets with a growing
 * repeatCount and a final repeatEnd packet. Only the *delta* since the last
 * packet is scored, so a 50-rose combo counts 50 roses — not 1+2+…+50.
 */
class GiftComboTracker {
  constructor(limit = 500) {
    this.limit = limit;
    this.map = new Map();
  }

  normalize(data) {
    const user = extractUser(data);
    const giftObj = data?.gift || data?.giftDetails || {};
    const giftId = Number(data?.giftId || giftObj?.id || 0);
    const groupId = String(data?.groupId || `${user.id}_${giftId}`);
    const repeatCount = Math.max(1, Number(data?.repeatCount || data?.comboCount || 1));
    const prev = this.map.get(groupId) || 0;
    const repeatEnd = Boolean(data?.repeatEnd);
    if (repeatEnd) {
      this.map.delete(groupId);
      if (repeatCount <= prev) return null;
    } else {
      this.map.set(groupId, Math.max(prev, repeatCount));
    }
    if (repeatCount <= prev) return null;
    const delta = Math.max(1, repeatCount - prev);
    if (this.map.size > this.limit) this.map.delete(this.map.keys().next().value);
    return {
      type: 'gift',
      user,
      gift: {
        id: giftId,
        name: String(giftObj?.name || data?.giftName || giftObj?.describe || 'Gift'),
        diamonds: Math.max(1, Number(giftObj?.diamondCount || data?.diamondCount || 1)),
        count: delta,
        image: giftObj?.image?.urlList?.[0] || data?.giftPictureUrl || ''
      },
      source: 'tiktok'
    };
  }

  clear() {
    this.map.clear();
  }
}

module.exports = { extractUser, chat, like, member, follow, share, social, GiftComboTracker };
